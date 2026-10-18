// API falsa em memória/localStorage, só para ver o front sem o Django (VITE_MOCK=1).
const K = "vc_mock";
const NEWS = [
  { id: 1, title: "Quando será o segundo turno das eleições? Veja a data", source: "TNH1", url: "https://www.tnh1.com.br/noticia/nid/quando-sera-o-segundo-turno-das-eleicoes-veja-a-data/", published_at: "2026-10-05T09:23:00-03:00" },
  { id: 2, title: "Flávio Bolsonaro e Lula vão disputar segundo turno pela Presidência", source: "Tribuna de Jundiaí", url: "https://tribunadejundiai.com.br/politica/eleicoes-2026/flavio-bolsonaro-e-lula-vao-disputar-segundo-turno-pela-presidencia-da-republica/", published_at: "2026-10-04T21:00:00-03:00" },
  { id: 3, title: "Flávio Bolsonaro e Lula vão ao segundo turno nas eleições de 2026", source: "Compre Rural", url: "https://comprerural.com/flavio-bolsonaro-e-lula-vao-ao-segundo-turno-para-presidente-nas-eleicoes-de-2026/", published_at: "2026-10-04T20:40:00-03:00" },
  { id: 4, title: "Quando será o segundo turno das eleições? Veja a data", source: "Movimento Econômico", url: "https://movimentoeconomico.com.br/politica/eleicoes-2026/2026/10/04/quando-sera-o-segundo-turno-das-eleicoes-veja-a-data/", published_at: "2026-10-04T18:00:00-03:00" },
];
const ITEMS = [
  { id: "oculos", name: "Óculos escuros", slot: "eyes", price: 2000, side: null },
  { id: "bone", name: "Boné", slot: "head", price: 3000, side: null },
  { id: "coroa", name: "Coroa", slot: "head", price: 8000, side: null },
  { id: "capa", name: "Capa", slot: "back", price: 5000, side: null },
  { id: "medalha", name: "Medalha", slot: "chest", price: 1500, side: null },
  { id: "barba", name: "Barba", slot: "face", price: 2500, side: "lula" },
  { id: "picanha", name: "Picanha", slot: "hand_r", price: 4000, side: "lula" },
  { id: "constituicao", name: "Constituição", slot: "hand_l", price: 6000, side: "lula" },
  { id: "carteira", name: "Carteira de trabalho", slot: "hand_l", price: 2500, side: "flavio" },
  { id: "pistola", name: "Pistola", slot: "hand_r", price: 4000, side: "flavio" },
  { id: "biblia", name: "Bíblia", slot: "hold", price: 6000, side: "flavio" },
];
const hoje = () => new Date().toDateString();
const slotOf = (id) => ITEMS.find((i) => i.id === id).slot;
const init = () => ({ player: null, el: { winner: null, lula_pct: 0, flavio_pct: 0, counted_pct: 0 } });
let db;
try { db = JSON.parse(localStorage.getItem(K)) || init(); } catch { db = init(); }
const save = () => { try { localStorage.setItem(K, JSON.stringify(db)); } catch {} };
const fail = (status, msg) => { const e = new Error(msg); e.status = status; throw e; };
const out = () => { const p = db.player; return { name: p.name, balance: p.balance, badge: p.badge, bet: p.bet || null, can_claim: !!p.bet && p.last_claim !== hoje(), owned: p.owned || [], equipped: p.equipped || [] }; };
const ranking = () => {
  const p = db.player;
  if (!p?.daily_coins) return [];
  return [{ rank: 1, name: p.name, daily_coins: p.daily_coins, claimed_at: p.daily_claimed_at }];
};

export async function mockApi(path, { method = "GET", body } = {}) {
  if (path === "/election") return { ...db.el };
  if (path === "/news") return NEWS;
  if (path === "/shop") return ITEMS;
  if (path === "/players" && method === "POST") {
    db.player = { name: (body.name || "").trim().slice(0, 16) || "JOGADOR", balance: 134000, badge: false, bet: null, owned: [], equipped: [], last_claim: null, daily_coins: 0, daily_claimed_at: null };
    save();
    return { token: "mock", player: out() };
  }
  if (!db.player) fail(401, "Unauthorized");
  if (path === "/me") return out();
  if (path === "/ranking") return ranking();
  if (path === "/bet") {
    if (db.el.winner || db.el.counted_pct > 0) fail(409, "As apostas fecharam: a apuração já começou.");
    const p = db.player;
    if (p.bet) fail(409, "Você já fez sua aposta.");
    p.bet = { candidate: body.candidate, amount: p.balance, won: null, nft_id: 1, minted_at: new Date().toISOString() };
    p.balance = 0;
    save();
    return out();
  }
  const p = db.player;
  p.owned = p.owned || []; p.equipped = p.equipped || [];
  if (path === "/daily") {
    if (!p.bet) fail(400, "Faça sua aposta para receber as moedas diárias.");
    if (p.last_claim === hoje()) fail(409, "Você já resgatou hoje. Volte amanhã.");
    p.balance += 2500; p.daily_coins = (p.daily_coins || 0) + 2500; p.last_claim = hoje();
    p.daily_claimed_at = new Date().toISOString(); save(); return out();
  }
  const it = ITEMS.find((i) => i.id === body?.item_id);
  if (path === "/shop/buy") {
    if (!it) fail(404, "Item não encontrado.");
    if (!p.bet) fail(400, "Faça sua aposta para personalizar seu candidato.");
    if (it.side && it.side !== p.bet.candidate) fail(400, "Este item é de outro candidato.");
    if (p.owned.includes(it.id)) fail(409, "Você já comprou este item.");
    if (p.balance < it.price) fail(400, "Vorcarocoins insuficientes.");
    p.balance -= it.price; p.owned.push(it.id);
    p.equipped = p.equipped.filter((id) => slotOf(id) !== it.slot); p.equipped.push(it.id);
    save(); return out();
  }
  if (path === "/shop/equip") {
    if (!it || !p.owned.includes(it.id)) fail(404, "Você ainda não comprou este item.");
    p.equipped = p.equipped.filter((id) => id !== it.id && (!body.equipped || slotOf(id) !== it.slot));
    if (body.equipped) p.equipped.push(it.id);
    save(); return out();
  }
  fail(404, "Não encontrado");
}

export const demo = {
  advance() {
    const el = db.el; if (el.winner) return;
    el.counted_pct = Math.min(95, el.counted_pct + 15 + Math.random() * 10);
    const f = 47 + Math.random() * 5;
    el.flavio_pct = +f.toFixed(2); el.lula_pct = +(100 - f).toFixed(2); save();
  },
  finish(w) {
    const el = db.el; if (el.winner) return;
    el.winner = w; el.counted_pct = 100;
    el.flavio_pct = w === "flavio" ? 51.6 : 48.4; el.lula_pct = +(100 - el.flavio_pct).toFixed(2);
    const p = db.player;
    if (p?.bet && p.bet.won === null) {
      p.bet.won = p.bet.candidate === w;
      if (p.bet.won) { p.balance = p.bet.amount * 2; p.badge = true; }
    }
    save();
  },
  nextDay() { if (db.player) { db.player.last_claim = null; save(); } },
  addCoins() { if (db.player) { db.player.balance += 10000; save(); } },
  reset() { db = init(); save(); localStorage.removeItem("vc_token"); },
};
