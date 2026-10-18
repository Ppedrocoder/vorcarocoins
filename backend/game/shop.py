DAILY_COINS = 2500

# slot: só um item equipado por slot (ex.: boné e coroa disputam a "head").
# side: None = vale para os dois lados; "lula" ou "flavio" = exclusivo desse candidato.
ITEMS = [
    {"id": "oculos", "name": "Óculos escuros", "slot": "eyes", "price": 2000, "side": None},
    {"id": "bone", "name": "Boné", "slot": "head", "price": 3000, "side": None},
    {"id": "coroa", "name": "Coroa", "slot": "head", "price": 8000, "side": None},
    {"id": "capa", "name": "Capa", "slot": "back", "price": 5000, "side": None},
    {"id": "medalha", "name": "Medalha", "slot": "chest", "price": 1500, "side": None},
    {"id": "barba", "name": "Barba", "slot": "face", "price": 2500, "side": "lula"},
    {"id": "picanha", "name": "Picanha", "slot": "hand_r", "price": 4000, "side": "lula"},
    {"id": "constituicao", "name": "Constituição", "slot": "hand_l", "price": 6000, "side": "lula"},
    {"id": "carteira", "name": "Carteira de trabalho", "slot": "hand_l", "price": 2500, "side": "flavio"},
    {"id": "pistola", "name": "Pistola", "slot": "hand_r", "price": 4000, "side": "flavio"},
    {"id": "biblia", "name": "Bíblia", "slot": "hold", "price": 6000, "side": "flavio"},
]
CATALOG = {i["id"]: i for i in ITEMS}
