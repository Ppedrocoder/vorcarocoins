import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import Sprite from "./Sprite";

const fmt = (n) => n.toLocaleString("pt-BR");
const formatDate = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

export default function RankingPhone() {
  const [open, setOpen] = useState(false);
  const [ranking, setRanking] = useState(null);
  const [err, setErr] = useState(false);

  const loadRanking = useCallback(async () => {
    try {
      setRanking(await api("/ranking"));
      setErr(false);
    } catch {
      setErr(true);
    }
  }, []);

  useEffect(() => {
    void loadRanking();
    const timer = setInterval(() => void loadRanking(), 30000);
    const refresh = () => void loadRanking();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("vc:ranking-refresh", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(timer);
      window.removeEventListener("vc:ranking-refresh", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [loadRanking]);

  return (
    <>
      <button
        className="ranking-btn"
        aria-expanded={open}
        aria-label={open ? "Fechar ranking" : "Abrir ranking de recompensas diárias"}
        onClick={() => setOpen(!open)}
      >
        <Sprite name="medal" px={5} />
      </button>
      {open && (
        <section className="phone ranking-phone" aria-label="Ranking de recompensas diárias">
          <div className="phone-notch" />
          <div className="phone-screen">
            <h2>Top 10 recompensas</h2>
            <p className="tiny">Desempate: quem resgatou mais cedo.</p>
            {err && <p className="lose">Não foi possível carregar o ranking.</p>}
            {!ranking && !err && <p className="tiny">Carregando…</p>}
            {ranking?.length === 0 && <p className="tiny">Ainda não há resgates registrados.</p>}
            <ol className="ranking-list">
              {ranking?.map((entry) => (
                <li key={`${entry.rank}-${entry.name}`}>
                  <span><b>#{entry.rank}</b> {entry.name}</span>
                  <strong>{fmt(entry.daily_coins)}</strong>
                  <small>{formatDate(entry.claimed_at)}</small>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}
    </>
  );
}
