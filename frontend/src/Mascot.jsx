import Figure from "./Figure";

const INFO = { lula: ["Lula", "PT"], flavio: ["Flávio Bolsonaro", "PL"] };

export default function Mascot({ side, tags = [], equipped = [] }) {
  const [nome, partido] = INFO[side];
  return (
    <aside className={`side ${side}`} aria-label={`Lado de ${nome}`}>
      <div className="mascot">
        <Figure side={side} equipped={equipped} px={8} />
        <span className="who">{nome}</span>
        <span className="tiny">{partido}</span>
        {tags.map((t) => <span key={t} className="tag">{t}</span>)}
      </div>
    </aside>
  );
}
