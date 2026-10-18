import hmac
from datetime import datetime
from typing import Literal, Optional

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from ninja import NinjaAPI, Schema
from ninja.errors import HttpError
from ninja.security import HttpBearer

from .models import Bet, Election, NewsItem, Player, Purchase
from .news import latest_news
from .shop import CATALOG, DAILY_COINS, ITEMS
from .tse import latest_first_round


class TokenAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            return Player.objects.filter(token=token).first()
        except (ValidationError, ValueError):
            return None


api = NinjaAPI(title="VorcaroCoins")
auth = TokenAuth()
Cand = Literal["lula", "flavio"]


class JoinIn(Schema):
    name: str

class BetIn(Schema):
    candidate: Cand

class BetOut(Schema):
    candidate: str
    amount: int
    won: Optional[bool] = None
    nft_id: int
    minted_at: datetime

class PlayerOut(Schema):
    name: str
    balance: int
    badge: bool
    bet: Optional[BetOut] = None
    can_claim: bool = False
    owned: list[str] = []
    equipped: list[str] = []

class ItemOut(Schema):
    id: str
    name: str
    slot: str
    price: int
    side: Optional[str] = None

class BuyIn(Schema):
    item_id: str

class EquipIn(Schema):
    item_id: str
    equipped: bool

class JoinOut(Schema):
    token: str
    player: PlayerOut

class ElectionOut(Schema):
    winner: Optional[str] = None
    lula_pct: float
    flavio_pct: float
    counted_pct: float
    first_round: Optional[dict] = None

class ResultIn(Schema):
    winner: Optional[Cand] = None
    lula_pct: float
    flavio_pct: float
    counted_pct: float


class NewsOut(Schema):
    id: str | int
    title: str
    source: str
    url: str
    published_at: Optional[datetime] = None


class RankingOut(Schema):
    rank: int
    name: str
    daily_coins: int
    claimed_at: datetime


def player_out(p: Player) -> PlayerOut:
    p = Player.objects.select_related("bet").prefetch_related("purchases").get(pk=p.pk)
    b = getattr(p, "bet", None)
    ps = list(p.purchases.all())
    return PlayerOut(
        name=p.name, balance=p.balance, badge=p.badge,
        bet=BetOut(candidate=b.candidate, amount=b.amount, won=b.won, nft_id=b.pk, minted_at=b.created_at) if b else None,
        can_claim=bool(b) and p.last_claim != timezone.localdate(),
        owned=[x.item_id for x in ps], equipped=[x.item_id for x in ps if x.equipped],
    )


def settle(winner: str):
    """Quem acertou recebe o dobro da aposta e a insígnia Eleitor Master."""
    for b in Bet.objects.select_related("player").filter(won__isnull=True):
        b.won = b.candidate == winner
        b.save(update_fields=["won"])
        if b.won:
            p = b.player
            p.balance += b.amount * 2
            p.badge = True
            p.save(update_fields=["balance", "badge"])


@api.post("/players", response=JoinOut)
def join(request, data: JoinIn):
    p = Player.objects.create(name=data.name.strip()[:16] or "JOGADOR")
    return JoinOut(token=str(p.token), player=player_out(p))


@api.get("/me", auth=auth, response=PlayerOut)
def me(request):
    return player_out(request.auth)


@api.get("/election", response=ElectionOut)
def election(request):
    el = Election.current()
    try:
        first_round = latest_first_round()
    except RuntimeError as exc:
        raise HttpError(502, str(exc)) from exc
    return {
        "winner": el.winner,
        "lula_pct": el.lula_pct,
        "flavio_pct": el.flavio_pct,
        "counted_pct": el.counted_pct,
        "first_round": first_round,
    }


@api.post("/bet", auth=auth, response=PlayerOut)
def place_bet(request, data: BetIn):
    with transaction.atomic():
        p = Player.objects.select_for_update().get(pk=request.auth.pk)
        el = Election.current()
        if el.winner or el.counted_pct > 0:
            raise HttpError(409, "As apostas fecharam: a apuração já começou.")
        if Bet.objects.filter(player=p).exists():
            raise HttpError(409, "Você já fez sua aposta.")
        if p.balance <= 0:
            raise HttpError(400, "Você não tem vorcarocoins para apostar.")
        Bet.objects.create(player=p, candidate=data.candidate, amount=p.balance)
        p.balance = 0
        p.save(update_fields=["balance"])
    return player_out(p)


@api.post("/admin/result", response=ElectionOut)
def set_result(request, data: ResultIn):
    key = request.headers.get("X-Admin-Key", "")
    if not settings.ADMIN_KEY or not hmac.compare_digest(key, settings.ADMIN_KEY):
        raise HttpError(403, "Chave de administrador inválida.")
    with transaction.atomic():
        el = Election.current()
        if el.winner:
            raise HttpError(409, "O resultado final já foi registrado.")
        el.winner, el.lula_pct = data.winner, data.lula_pct
        el.flavio_pct, el.counted_pct = data.flavio_pct, data.counted_pct
        el.save()
        if el.winner:
            settle(el.winner)
    return el


@api.get("/news", response=list[NewsOut])
def news(request):
    return latest_news()


@api.get("/ranking", response=list[RankingOut])
def ranking(request):
    players = Player.objects.filter(
        daily_coins__gt=0,
        daily_claimed_at__isnull=False,
    ).order_by("-daily_coins", "daily_claimed_at", "pk")[:10]
    return [
        {
            "rank": index,
            "name": player.name,
            "daily_coins": player.daily_coins,
            "claimed_at": player.daily_claimed_at,
        }
        for index, player in enumerate(players, start=1)
    ]


@api.get("/shop", response=list[ItemOut])
def shop(request):
    return ITEMS


@api.post("/daily", auth=auth, response=PlayerOut)
def daily(request):
    with transaction.atomic():
        p = Player.objects.select_for_update().get(pk=request.auth.pk)
        if not Bet.objects.filter(player=p).exists():
            raise HttpError(400, "Faça sua aposta para receber as moedas diárias.")
        today = timezone.localdate()
        if p.last_claim == today:
            raise HttpError(409, "Você já resgatou hoje. Volte amanhã.")
        p.balance += DAILY_COINS
        p.last_claim = today
        p.daily_coins += DAILY_COINS
        p.daily_claimed_at = timezone.now()
        p.save(update_fields=["balance", "last_claim", "daily_coins", "daily_claimed_at"])
    return player_out(p)


def _unequip_slot(p: Player, slot: str):
    ids = [i["id"] for i in ITEMS if i["slot"] == slot]
    p.purchases.filter(item_id__in=ids).update(equipped=False)


@api.post("/shop/buy", auth=auth, response=PlayerOut)
def buy(request, data: BuyIn):
    item = CATALOG.get(data.item_id)
    if not item:
        raise HttpError(404, "Item não encontrado.")
    with transaction.atomic():
        p = Player.objects.select_for_update().get(pk=request.auth.pk)
        bet = Bet.objects.filter(player=p).first()
        if not bet:
            raise HttpError(400, "Faça sua aposta para personalizar seu candidato.")
        if item["side"] and item["side"] != bet.candidate:
            raise HttpError(400, "Este item é de outro candidato.")
        if Purchase.objects.filter(player=p, item_id=item["id"]).exists():
            raise HttpError(409, "Você já comprou este item.")
        if p.balance < item["price"]:
            raise HttpError(400, "Vorcarocoins insuficientes.")
        p.balance -= item["price"]
        p.save(update_fields=["balance"])
        _unequip_slot(p, item["slot"])
        Purchase.objects.create(player=p, item_id=item["id"])
    return player_out(p)


@api.post("/shop/equip", auth=auth, response=PlayerOut)
def equip(request, data: EquipIn):
    item = CATALOG.get(data.item_id)
    if not item:
        raise HttpError(404, "Item não encontrado.")
    with transaction.atomic():
        pur = Purchase.objects.filter(player=request.auth, item_id=item["id"]).first()
        if not pur:
            raise HttpError(404, "Você ainda não comprou este item.")
        if data.equipped:
            _unequip_slot(request.auth, item["slot"])
        pur.equipped = data.equipped
        pur.save(update_fields=["equipped"])
    return player_out(request.auth)
