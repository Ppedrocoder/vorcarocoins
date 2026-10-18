const W = 12, H = 17;
const L = (o) => Array.from({ length: H }, (_, i) => o[i] || ".".repeat(W));

const BASE = [
  "............", "............", "...kkkkkk...", "..kssssssk..", "..ksessesk..", "..kssssssk..", "...kssssk...", "....kssk....",
  ".jjjjwwjjjj.", ".jjjjttjjjj.", ".jjjjttjjjj.", ".jjjjttjjjj.", ".jjjjjjjjjj.", ".jjjjjjjjjj.",
  "..ppp..ppp..", "..ppp..ppp..", "..kkk..kkk..",
];
// z: "back" desenha atrás do corpo; "front" por cima
const ITEMS = {
  capa: { z: "back", map: L({ 8: "v..........v", 9: "v..........v", 10: "v..........v", 11: "v..........v", 12: "v..........v", 13: "v..........v", 14: ".vv......vv.", 15: ".vv......vv.", 16: ".vv......vv." }) },
  bone: { z: "front", map: L({ 1: "....cccc....", 2: "...cccccc...", 3: "..ccccccccc." }) },
  coroa: { z: "front", map: L({ 0: "...y.yy.y...", 1: "...yyrryy...", 2: "...yyyyyy..." }) },
  oculos: { z: "front", map: L({ 4: "..kddkkddk.." }) },
  medalha: { z: "front", map: L({ 10: "...y........", 11: "...o........" }) },
  barba: { z: "front", map: L({ 5: "..kcccccck..", 6: "...kcccck...", 7: "....kcck...." }) },
  picanha: { z: "front", map: L({ 9: "........kkkk", 10: "........kcck", 11: "........kmmk", 12: "........kmmk", 13: "........kkkk" }) },
  constituicao: { z: "front", map: L({ 9: "kkkk........", 10: "kuuk........", 11: "kyyk........", 12: "kuuk........", 13: "kkkk........" }) },
  pistola: { z: "front", map: L({ 10: "......kkkkkk", 11: "......kggggk", 12: "......kgk...", 13: "......kkk..." }) },
  carteira: { z: "front", map: L({ 9: "kkkk........", 10: "kyyk........", 11: "knnk........", 12: "kyyk........", 13: "kkkk........" }) },
  biblia: { z: "front", map: L({ 9: "....kkkk....", 10: "....kdyk....", 11: "....kyyk....", 12: "....kdyk....", 13: "....kkkk...." }) },
};
// Faixa presidencial: verde com bordas amarelas, na diagonal do peito
const SASH = L({ 8: "..yny.......", 9: "...yny......", 10: "....yny.....", 11: ".....yny....", 12: "......yny...", 13: ".......yny.." });
const COMMON = { k: "#0f0f1a", s: "#e8b98a", e: "#1a1c2c", w: "#cfd9e6", p: "#333c57", y: "#ffcd75", r: "#b13e53", c: "#f4f4f4", d: "#1a1c2c", v: "#5d275d", o: "#ef7d57", n: "#1b6b3a", m: "#d95763", u: "#3b5dc9", g: "#566c86" };
const SIDE = { lula: { j: "#b13e53", t: "#ffcd75" }, flavio: { j: "#38b764", t: "#41a6f6" } };

export default function Figure({ side, equipped = [], px = 8, sash = false }) {
  const pal = { ...COMMON, ...SIDE[side] };
  const on = equipped.filter((id) => ITEMS[id]);
  const layers = [
    ...on.filter((id) => ITEMS[id].z === "back").map((id) => ITEMS[id].map),
    BASE,
    ...on.filter((id) => ITEMS[id].z === "front").map((id) => ITEMS[id].map),
    ...(sash ? [SASH] : []),
  ];
  return (
    <svg className="sprite" width={W * px} height={H * px} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {layers.flatMap((map, li) => map.flatMap((row, y) => [...row].map((ch, x) => pal[ch] && ch !== "." && <rect key={`${li}-${x}-${y}`} x={x} y={y} width="1" height="1" fill={pal[ch]} />)))}
    </svg>
  );
}
