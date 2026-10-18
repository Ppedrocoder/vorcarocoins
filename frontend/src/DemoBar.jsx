import { demo } from "./mockApi";
import { DIA, HORA, simularFaltando, tempoReal } from "./countdown";

export default function DemoBar() {
  const go = (fn) => () => { fn(); window.dispatchEvent(new Event("vc:refresh")); };
  return (
    <div className="demo" role="group" aria-label="Painel de demonstração">
      <p className="tiny center">Demonstração sem backend: avance a apuração e veja o resultado.</p>
      <div className="row">
        <button className="ghost" onClick={go(() => demo.advance())}>Avançar apuração</button>
        <button className="ghost" onClick={go(() => demo.finish("lula"))}>Lula vence</button>
        <button className="ghost" onClick={go(() => demo.finish("flavio"))}>Flávio vence</button>
        <button className="ghost" onClick={go(() => demo.nextDay())}>Próximo dia</button>
        <button className="ghost" onClick={go(() => demo.addCoins())}>+10.000 moedas</button>
        <button className="ghost" onClick={go(() => simularFaltando(3 * DIA + 5 * HORA))}>Contagem: 3 dias</button>
        <button className="ghost" onClick={go(() => simularFaltando(5 * HORA + 1000))}>Contagem: 5 horas</button>
        <button className="ghost" onClick={go(() => tempoReal())}>Contagem: tempo real</button>
        <button className="ghost" onClick={go(() => demo.reset())}>Reiniciar</button>
      </div>
    </div>
  );
}
