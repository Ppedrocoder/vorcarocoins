import { useEffect, useState } from "react";
import { contagem } from "./countdown";

export default function Countdown() {
  const [txt, setTxt] = useState(contagem());
  useEffect(() => {
    const tick = () => setTxt(contagem());
    const t = setInterval(tick, 30000);
    window.addEventListener("vc:refresh", tick);
    return () => { clearInterval(t); window.removeEventListener("vc:refresh", tick); };
  }, []);
  return (
    <div className="countdown" role="timer">
      <span className="count">{txt}</span>
      <span className="tiny">2º turno em 25/10/2026, votação das 8h às 17h (Brasília)</span>
    </div>
  );
}
