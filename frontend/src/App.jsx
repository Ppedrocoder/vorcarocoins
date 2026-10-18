import { useCallback, useEffect, useState } from "react";
import { api, MOCK } from "./api";
import DemoBar from "./DemoBar";
import Sprite from "./Sprite";
import NewsPhone from "./NewsPhone";
import RankingPhone from "./RankingPhone";
import Mascot from "./Mascot";
import NftCard from "./NftCard";
import Shop from "./Shop";
import Countdown from "./Countdown.jsx";

const fmt = (n) => n.toLocaleString("pt-BR");
const pct = (n) => n.toFixed(2).replace(".", ",") + "%";
const NOMES = { lula: "Lula", flavio: "Flávio Bolsonaro" };

function Shell({ children, bet, winner, equipped = [] }) {
  const tags = (side) => [bet === side && "Sua aposta", winner === side && "Vencedor"].filter(Boolean);
  return (
    <div className="stage">
      <Mascot side="lula" tags={tags("lula")} equipped={bet === "lula" ? equipped : []} />
      <main>
        <h1>VORCAROCOINS</h1>
        <p className="sub">Aposta fictícia · 2º turno 2026</p>
        <Countdown />
        {children}
        {MOCK && <DemoBar />}
        <RankingPhone />
        <NewsPhone />
        <p className="tiny center">Jogo de diversão. Vorcarocoins não têm valor real e não são dinheiro.</p>
      </main>
      <Mascot side="flavio" tags={tags("flavio")} equipped={bet === "flavio" ? equipped : []} />
    </div>
  );
}

function Entry({ onJoin }) {
  const [name, setName] = useState("");
  return (
    <div className="box center">
      <Sprite name="coin" px={6} />
      <p>Todo eleitor começa com<br /><span className="bal">134.000</span><br />vorcarocoins</p>
      <input value={name} maxLength={16} placeholder="Seu nome" aria-label="Seu nome" onChange={(e) => setName(e.target.value)} />
      <p><button onClick={() => onJoin(name)}>Entrar no jogo</button></p>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState(null);
  const [el, setEl] = useState(null);
  const [pick, setPick] = useState(null);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    try {
      setEl(await api("/election"));
      if (localStorage.getItem("vc_token")) setMe(await api("/me"));
      else setMe(null);
    } catch (e) {
      if (e.status === 401) { localStorage.removeItem("vc_token"); setMe(null); }
      else setErr("Não foi possível falar com o servidor.");
    } finally { setReady(true); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000); // acompanha a apuração
    window.addEventListener("vc:refresh", load);
    return () => { clearInterval(t); window.removeEventListener("vc:refresh", load); };
  }, [load]);

  const run = async (fn) => { setErr(""); try { await fn(); } catch (e) { setErr(e.message); } };
  const join = (name) => run(async () => {
    const r = await api("/players", { method: "POST", body: { name } });
    localStorage.setItem("vc_token", r.token);
    setMe(r.player);
  });
  const claim = () => run(async () => {
    setMe(await api("/daily", { method: "POST" }));
    window.dispatchEvent(new Event("vc:ranking-refresh"));
  });
  const buy = (id) => run(async () => setMe(await api("/shop/buy", { method: "POST", body: { item_id: id } })));
  const equip = (id, equipped) => run(async () => setMe(await api("/shop/equip", { method: "POST", body: { item_id: id, equipped } })));
  const bet = () => run(async () => setMe(await api("/bet", { method: "POST", body: { candidate: pick } })));

  if (!ready) return <Shell><p className="tiny center">Carregando…</p></Shell>;
  if (!me) return <Shell>{err && <p className="lose center" role="alert">{err}</p>}<Entry onJoin={join} /></Shell>;

  const closed = el && (el.counted_pct > 0 || el.winner);
  const b = me.bet;

  return (
    <Shell bet={b?.candidate} winner={el?.winner} equipped={me.equipped}>
      <div className="box">
        <div className="row between"><span>{me.name}</span><span className="bal"><Sprite name="coin" px={3} /> {fmt(me.balance)}</span></div>
        {me.badge && <p className="center"><span className="badge"><Sprite name="medal" px={3} /> Eleitor Master</span></p>}
      </div>

      {err && <p className="lose center" role="alert">{err}</p>}

      {!b && !closed && (
        <div className="box">
          <p className="center">Aposte tudo no vencedor!</p>
          <div className="row">
            {["lula", "flavio"].map((c) => (
              <button key={c} className="cand" aria-pressed={pick === c} onClick={() => setPick(c)}>
                <Sprite name={c} px={5} /><br />{NOMES[c]}
              </button>
            ))}
          </div>
          <p className="tiny center">Acertou = dobro dos pontos + insígnia Eleitor Master.<br />Errou = game over.</p>
          <p className="center"><button disabled={!pick} onClick={bet}>Apostar {fmt(me.balance)}</button></p>
        </div>
      )}

      {!b && closed && <div className="box"><p className="center">As apostas fecharam: a apuração já começou.</p></div>}

      {b && (
        <div className="box">
          <p>Sua aposta: <Sprite name={b.candidate} px={3} /> <b>{NOMES[b.candidate]}</b><br />
            <span className="tiny">{fmt(b.amount)} vorcarocoins em jogo</span></p>
        </div>
      )}

      {el && (
        <div className="box">
          <p>Apuração {!el.winner && <span className="blink">●</span>}</p>
          <div className="row between"><span>Lula {pct(el.lula_pct)}</span><span>{pct(el.flavio_pct)} Flávio</span></div>
          <div className="bar"><i className="l" style={{ width: el.lula_pct + "%" }} /><i className="f" style={{ width: el.flavio_pct + "%" }} /></div>
          <p className="tiny">Seções apuradas: {pct(el.counted_pct)}<br />2º turno em 25/10/2026, urnas até as 17h (Brasília).</p>
          {el.winner && b && (
            <p className={"center " + (b.won ? "win" : "lose")}>
              Vencedor: {NOMES[el.winner]}<br />{b.won ? `Você acertou! +${fmt(b.amount)}` : `Game over: você perdeu ${fmt(b.amount)}`}
            </p>
          )}
        </div>
      )}

      {el?.first_round && (
        <p className="tiny center">
          1º turno (TSE): Lula {pct(el.first_round.lula_pct)} · Flávio Bolsonaro {pct(el.first_round.flavio_pct)}
          <br />A apuração em tempo real exibida acima é do 2º turno.
        </p>
      )}

      {b && <NftCard bet={b} owner={me.name} equipped={me.equipped} />}
      {b && <Shop me={me} onClaim={claim} onBuy={buy} onEquip={equip} />}
    </Shell>
  );
}
