import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import Sprite from "./Sprite";

const dataDaNoticia = (iso) => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export default function NewsPhone() {
  const [open, setOpen] = useState(false);
  const [news, setNews] = useState(null);
  const [err, setErr] = useState(false);

  const loadNews = useCallback(async () => {
    try {
      setNews(await api("/news"));
      setErr(false);
    } catch {
      setErr(true);
    }
  }, []);

  useEffect(() => {
    void loadNews();
    const timer = setInterval(() => void loadNews(), 60000);
    return () => clearInterval(timer);
  }, [loadNews]);

  return (
    <>
      <button className="phone-btn" aria-expanded={open} aria-label={open ? "Fechar notícias" : "Abrir notícias da eleição"} onClick={() => setOpen(!open)}>
        <Sprite name="phone" px={5} />
      </button>
      {open && (
        <section className="phone" aria-label="Notícias da eleição">
          <div className="phone-notch" />
          <div className="phone-screen">
            <h2>Notícias da eleição</h2>
            {err && <p className="lose">Não foi possível carregar as notícias.</p>}
            {!news && !err && <p className="tiny">Carregando…</p>}
            {news?.length === 0 && <p className="tiny">Nenhuma notícia disponível no momento.</p>}
            <ul>
              {news?.map((n) => (
                <li key={n.id || n.url}>
                  <a href={n.url} target="_blank" rel="noopener noreferrer">
                    <span className="tiny">
                      {n.source}{dataDaNoticia(n.published_at) && ` · Publicada em ${dataDaNoticia(n.published_at)}`}
                    </span><br />{n.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
