import html
import re
import threading
import time
from email.utils import parsedate_to_datetime
from urllib.error import URLError
from urllib.request import Request, urlopen
from xml.etree import ElementTree

from .models import NewsItem


FEEDS = (
    ("G1 Política", "https://g1.globo.com/rss/g1/politica/"),
    ("Agência Brasil", "https://agenciabrasil.ebc.com.br/rss/politica/feed.xml"),
)
KEYWORDS = re.compile(
    r"\b(eleição|eleições|eleitoral|votação|urna|urnas|tse|candidato|candidata|"
    r"presidente|presidencial|segundo turno|2º turno)\b",
    re.IGNORECASE,
)
TAG_RE = re.compile(r"<[^>]+>")
CACHE_SECONDS = 60
MAX_ITEMS = 10
_cache = {"items": [], "fetched_at": None}
_cache_lock = threading.Lock()


def _clean(value):
    return re.sub(r"\s+", " ", html.unescape(TAG_RE.sub("", value or ""))).strip()


def _text(item, names):
    for name in names:
        node = item.find(name)
        if node is not None and node.text:
            return node.text
    return ""


def _published_at(value):
    if not value:
        return None
    try:
        return parsedate_to_datetime(value)
    except (TypeError, ValueError, OverflowError, IndexError):
        return None


def _read_feed(source, url):
    request = Request(url, headers={"User-Agent": "VorcaroCoins/1.0 news reader"})
    with urlopen(request, timeout=5) as response:
        root = ElementTree.fromstring(response.read())

    items = []
    for item in root.findall(".//item"):
        title = _clean(_text(item, ("title",)))
        link = _clean(_text(item, ("link",)))
        if title and link and KEYWORDS.search(title):
            items.append({
                "id": link,
                "title": title,
                "source": source,
                "url": link,
                "published_at": _published_at(_text(item, ("pubDate", "published"))),
            })
    return items


def _database_news():
    return [
        {
            "id": item.id,
            "title": item.title,
            "source": item.source,
            "url": item.url,
            "published_at": item.published_at,
        }
        for item in NewsItem.objects.order_by("-published_at")[:MAX_ITEMS]
    ]


def latest_news():
    now = time.monotonic()
    with _cache_lock:
        if _cache["fetched_at"] and now - _cache["fetched_at"] < CACHE_SECONDS:
            return _cache["items"]

    items = []
    for source, url in FEEDS:
        try:
            items.extend(_read_feed(source, url))
        except (ElementTree.ParseError, TimeoutError, URLError):
            continue

    items.sort(
        key=lambda item: item["published_at"].timestamp() if item["published_at"] else 0,
        reverse=True,
    )
    if not items:
        items = _database_news()

    with _cache_lock:
        _cache["items"] = items[:MAX_ITEMS]
        _cache["fetched_at"] = now
        return _cache["items"]
