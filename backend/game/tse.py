import json
from datetime import datetime
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


TSE_FIRST_ROUND_URL = (
    "https://resultados.tse.jus.br/oficial/ele2026/6257/"
    "dados/br/br-c0001-e006257-u.json"
)
CACHE_SECONDS = 60
_cache = None
_cache_at = 0.0
_cache_lock = Lock()


def _number(value, default=0.0):
    if value in (None, ""):
        return default
    text = str(value)
    if "," in text:
        text = text.replace(".", "").replace(",", ".")
    return float(text)


def _candidate_rows(payload):
    rows = []
    cargo = payload.get("carg", [{}])[0]
    for federation in cargo.get("agr", []):
        for party in federation.get("par", []):
            for candidate in party.get("cand", []):
                rows.append({
                    "number": candidate.get("n", ""),
                    "name": candidate.get("nmu") or candidate.get("nm", ""),
                    "votes": int(_number(candidate.get("vap"))),
                    "pct": _number(candidate.get("pvapn", candidate.get("pvap"))),
                })
    rows.sort(key=lambda row: row["votes"], reverse=True)
    return rows[:10]


def _parse(payload):
    candidates = _candidate_rows(payload)
    by_name = {candidate["name"].upper(): candidate["pct"] for candidate in candidates}
    return {
        "source": "TSE",
        "status": "live",
        "round": 1,
        "election_code": payload.get("ele", "6257"),
        "generated_at": _tse_datetime(payload.get("dg"), payload.get("hg")),
        "totalized_at": _tse_datetime(payload.get("dt"), payload.get("ht")),
        "counted_pct": _number(payload.get("s", {}).get("pstn")),
        "candidates": candidates,
        "lula_pct": by_name.get("LULA", 0.0),
        "flavio_pct": by_name.get("FLAVIO BOLSONARO", 0.0),
    }


def _tse_datetime(date_value, time_value):
    if not date_value or not time_value:
        return None
    return datetime.strptime(
        f"{date_value} {time_value}", "%d/%m/%Y %H:%M:%S"
    ).isoformat()


def latest_first_round():
    global _cache, _cache_at
    now = datetime.now().timestamp()
    with _cache_lock:
        if _cache and now - _cache_at < CACHE_SECONDS:
            return _cache

        request = Request(
            TSE_FIRST_ROUND_URL,
            headers={"User-Agent": "VorcaroCoins/1.0"},
        )
        try:
            with urlopen(request, timeout=10) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if _cache:
                return {**_cache, "status": "stale", "error": f"TSE HTTP {exc.code}"}
            raise RuntimeError(f"TSE HTTP {exc.code}") from exc
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            if _cache:
                return {**_cache, "status": "stale", "error": "TSE indisponível"}
            raise RuntimeError("TSE indisponível") from exc

        _cache = _parse(payload)
        _cache_at = now
        return _cache
