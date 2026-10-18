const SPR = {
  phone: [["kkkkkk", "kbbbbk", "kbwwbk", "kbbbbk", "kbwwbk", "kbbbbk", "kkggkk", "kkkkkk"], { k: "#94b0c2", b: "#41a6f6", w: "#fff", g: "#38b764" }],
  coin: [["..oooo..", ".oyyyyo.", "oyywyyyo", "oywyyyyo", "oyyyyyyo", "oyyyyyyo", ".oyyyyo.", "..oooo.."], { o: "#ef7d57", y: "#ffcd75", w: "#fff" }],
  lula: [["...rr...", "...rr...", "rrrrrrrr", ".rrrrrr.", "..rrrr..", ".rrrrrr.", ".rr..rr.", "rr....rr"], { r: "#b13e53" }],
  flavio: [["...gg...", "..gyyg..", ".gyyyyg.", "gyyyybyg", ".gyyyyg.", "..gyyg..", "...gg..."], { g: "#38b764", y: "#ffcd75", b: "#41a6f6" }],
  medal: [[".bb..bb.", ".bb..bb.", "..bbbb..", ".oyyyyo.", ".oywwyo.", ".oyyyyo.", ".oyyyyo.", "..oooo.."], { b: "#41a6f6", o: "#ef7d57", y: "#ffcd75", w: "#fff" }],
};

export default function Sprite({ name, px = 4 }) {
  const [map, pal] = SPR[name];
  return (
    <svg className="sprite" width={map[0].length * px} height={map.length * px} viewBox={`0 0 ${map[0].length} ${map.length}`} aria-hidden="true">
      {map.flatMap((row, y) => [...row].map((ch, x) => pal[ch] && <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={pal[ch]} />))}
    </svg>
  );
}
