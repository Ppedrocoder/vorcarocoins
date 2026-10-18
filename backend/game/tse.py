import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from threading import Lock
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


TSE_FIRST_ROUND_URL = (
    "https://resultados.tse.jus.br/oficial/ele2026/6257/"
    "dados/br/br-c0001-e006257-u.json"
)
TSE_ELECTION_CODES = {1: "6257", 2: "6258"}
TSE_STATE_CODES = (
    ("ac", "Acre"), ("al", "Alagoas"), ("ap", "Amapá"), ("am", "Amazonas"),
    ("ba", "Bahia"), ("ce", "Ceará"), ("df", "Distrito Federal"),
    ("es", "Espírito Santo"), ("go", "Goiás"), ("ma", "Maranhão"),
    ("mt", "Mato Grosso"), ("ms", "Mato Grosso do Sul"), ("mg", "Minas Gerais"),
    ("pa", "Pará"), ("pb", "Paraíba"), ("pr", "Paraná"), ("pe", "Pernambuco"),
    ("pi", "Piauí"), ("rj", "Rio de Janeiro"), ("rn", "Rio Grande do Norte"),
    ("rs", "Rio Grande do Sul"), ("ro", "Rondônia"), ("rr", "Roraima"),
    ("sc", "Santa Catarina"), ("sp", "São Paulo"), ("se", "Sergipe"),
    ("to", "Tocantins"),
)
CACHE_SECONDS = 60
_cache = None
_cache_at = 0.0
_cache_lock = Lock()
_state_cache = {}
_state_cache_at = {}


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


def _state_url(code, round_number):
    election_code = TSE_ELECTION_CODES[round_number]
    return (
        f"https://resultados.tse.jus.br/oficial/ele2026/{election_code}/"
        f"dados/{code}/{code}-c0001-e00{election_code}-u.json"
    )


def _parse_state(payload, code, name):
    candidates = _candidate_rows(payload)
    lula = next((c for c in candidates if "LULA" in c["name"].upper()), None)
    flavio = next((c for c in candidates if "FLAVIO" in c["name"].upper()), None)
    if not lula or not flavio:
        raise ValueError(f"Candidatos não encontrados em {code.upper()}")
    winner = "lula" if lula["votes"] > flavio["votes"] else "flavio"
    return {
        "code": code,
        "name": name,
        "winner": winner,
        "lula_votes": lula["votes"],
        "flavio_votes": flavio["votes"],
        "counted_pct": _number(payload.get("s", {}).get("pstn")),
    }


def _fetch_state(code, name, round_number):
    request = Request(
        _state_url(code, round_number),
        headers={"User-Agent": "VorcaroCoins/1.0"},
    )
    with urlopen(request, timeout=4) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return _parse_state(payload, code, name)


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


def latest_state_map(round_number=1):
    global _state_cache, _state_cache_at
    if round_number not in TSE_ELECTION_CODES:
        raise ValueError("Turno eleitoral inválido")
    now = datetime.now().timestamp()
    with _cache_lock:
        if round_number in _state_cache and now - _state_cache_at[round_number] < CACHE_SECONDS:
            return _state_cache[round_number]

    states = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(_fetch_state, code, name, round_number)
            for code, name in TSE_STATE_CODES
        }
        for future in as_completed(futures):
            try:
                states.append(future.result())
            except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, ValueError):
                continue
    states.sort(key=lambda state: state["code"])

    if not states:
        if round_number in _state_cache:
            return {
                **_state_cache[round_number],
                "status": "stale",
            }
        if round_number == 2:
            first_round = latest_state_map(1)
            if first_round["states"]:
                return {
                    **first_round,
                    "status": "fallback",
                    "requested_round": 2,
                }
        return {
            "source": "TSE",
            "status": "pending",
            "round": round_number,
            "election_code": TSE_ELECTION_CODES[round_number],
            "updated_at": None,
            "states": [],
        }

    result = {
        "source": "TSE",
        "status": "live",
        "election_code": TSE_ELECTION_CODES[round_number],
        "round": round_number,
        "updated_at": datetime.now().isoformat(),
        "states": states,
    }
    with _cache_lock:
        _state_cache[round_number] = result
        _state_cache_at[round_number] = now
    return result
