import uuid
from django.db import models
from django.utils import timezone

START_BALANCE = 134_000
CANDIDATES = [("lula", "Lula"), ("flavio", "Flávio Bolsonaro")]


class Player(models.Model):
    name = models.CharField(max_length=16)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    balance = models.PositiveBigIntegerField(default=START_BALANCE)
    badge = models.BooleanField(default=False)  # Eleitor Master
    last_claim = models.DateField(null=True, blank=True)  # último resgate das moedas diárias
    daily_coins = models.PositiveBigIntegerField(default=0)
    daily_claimed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Bet(models.Model):
    player = models.OneToOneField(Player, on_delete=models.CASCADE, related_name="bet")
    candidate = models.CharField(max_length=6, choices=CANDIDATES)
    amount = models.PositiveBigIntegerField()
    won = models.BooleanField(null=True)  # None = ainda não apurada
    created_at = models.DateTimeField(default=timezone.now)  # momento em que o NFT foi criado


class Election(models.Model):
    """Linha única (pk=1) com o estado da apuração do 2º turno."""
    winner = models.CharField(max_length=6, choices=CANDIDATES, null=True, blank=True)
    lula_pct = models.FloatField(default=0)
    flavio_pct = models.FloatField(default=0)
    counted_pct = models.FloatField(default=0)

    @classmethod
    def current(cls):
        return cls.objects.get_or_create(pk=1)[0]


class NewsItem(models.Model):
    """Notícia exibida no mini celular. Cadastre pelo Django admin ou por um job de coleta."""
    title = models.CharField(max_length=200)
    source = models.CharField(max_length=60)
    url = models.URLField(max_length=500)
    published_at = models.DateTimeField()

    class Meta:
        ordering = ["-published_at"]

    def __str__(self):
        return self.title


class Purchase(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="purchases")
    item_id = models.CharField(max_length=20)
    equipped = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["player", "item_id"], name="uniq_player_item")]
