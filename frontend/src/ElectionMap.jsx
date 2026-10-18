import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

const POSITIONS = {
  rr: [1, 0], ap: [2, 0], am: [1, 1], pa: [2, 1], ma: [3, 1], ce: [4, 1],
  ac: [0, 2], ro: [1, 2], mt: [2, 2], to: [3, 2], pi: [4, 2], rn: [5, 2],
  pe: [5, 3], al: [6, 3], ba: [4, 3], df: [3, 3], go: [3, 4], mg: [4, 4],
  es: [5, 4], pb: [6, 2], ms: [2, 5], sp: [3, 5], rj: [4, 5], pr: [2, 6],
  sc: [3, 6], rs: [2, 7],
};

const fmt = (n) => n.toLocaleString("pt-BR");

export default function ElectionMap() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setError("");
      setData(await api("/election/map"));
    } catch (err) {
      setError(err.message);
    }
  }, []);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !data) void load();
  };

  useEffect(() => {
    if (!open) return undefined;
    const timer = setInterval(() => void load(), 5000);
    const refresh = () => void load();
    window.addEventListener("vc:refresh", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("vc:refresh", refresh);
    };
  }, [open, load]);

  return (
    <div className="map-widget">
      <button className="map-btn" aria-expanded={open} onClick={toggle}>
        🗺️ Mapa da apuração
      </button>
      {open && (
        <section className="map-panel" aria-label="Mapa da apuração estadual">
          <div className="row between">
            <h2>Mapa do Brasil</h2>
            <button className="ghost close-map" onClick={() => setOpen(false)}>Fechar</button>
          </div>
          <p className="tiny">
            {data?.status === "fallback"
              ? "1º turno · aguardando dados do 2º turno"
              : data
                ? `${data.round}º turno · dados oficiais do TSE`
                : "Dados oficiais do TSE"}
          </p>
          {error && <p className="lose">{error}</p>}
          {!data && !error && <p className="tiny">Carregando dados estaduais…</p>}
          {data?.status === "pending" && (
            <p className="tiny">
              O TSE ainda não publicou a apuração estadual deste turno.
              O mapa será atualizado automaticamente quando os dados estiverem disponíveis.
            </p>
          )}
          {data?.status === "fallback" && (
            <p className="tiny">
              O mapa continua mostrando o 1º turno até o TSE disponibilizar
              resultados estaduais válidos do 2º turno.
            </p>
          )}
          {data && (
            <>
              {data.states.length > 0 && <div className="map-legend">
                <span><i className="map-dot lula-dot" /> Lula</span>
                <span><i className="map-dot flavio-dot" /> Flávio Bolsonaro</span>
              </div>}
              {data.states.length > 0 && <div className="pixel-map" role="img" aria-label="Estados coloridos pelo candidato líder">
                {data.states.map((state) => {
                  const position = POSITIONS[state.code];
                  if (!position) return null;
                  return (
                    <div
                      className={`state ${state.winner}`}
                      key={state.code}
                      style={{ gridColumn: position[0] + 1, gridRow: position[1] + 1 }}
                      title={`${state.name}: ${state.winner === "lula" ? "Lula" : "Flávio Bolsonaro"}`}
                    >
                      {state.code.toUpperCase()}
                      <small>{fmt(state.winner === "lula" ? state.lula_votes : state.flavio_votes)}</small>
                    </div>
                  );
                })}
              </div>}
              {data.states.length > 0 && <p className="tiny">Vermelho: Lula · Azul: Flávio Bolsonaro. Cada bloco mostra a UF e os votos do líder.</p>}
            </>
          )}
        </section>
      )}
    </div>
  );
}
