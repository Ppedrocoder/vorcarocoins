import { useState } from "react";

const STEPS = [
  {
    title: "Bem-vindo ao VorcaroCoins!",
    text: "Este é um jogo fictício de diversão sobre a eleição. Você começa com 134.000 vorcarocoins.",
    icon: "🪙",
  },
  {
    title: "Faça sua aposta",
    text: "Entre com seu nome e escolha um candidato. Você aposta todos os seus pontos e pode ganhar o dobro.",
    icon: "🎯",
  },
  {
    title: "Acompanhe a apuração",
    text: "Use o mapa central para ver a liderança nos estados e acompanhe os percentuais da apuração.",
    icon: "🗺️",
  },
  {
    title: "Explore os recursos",
    text: "Confira notícias reais no celular da direita e o ranking à esquerda.",
    icon: "📱",
  },
];

export default function FirstVisitGuide({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const finish = () => {
    localStorage.setItem("vc_guide_seen", "1");
    onClose();
  };

  return (
    <div className="guide-backdrop" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      <section className="guide-panel">
        <div className="guide-progress" aria-label={`Etapa ${step + 1} de ${STEPS.length}`}>
          {STEPS.map((item, index) => <i className={index === step ? "active" : ""} key={item.title} />)}
        </div>
        <div className="guide-icon" aria-hidden="true">{current.icon}</div>
        <h2 id="guide-title">{current.title}</h2>
        <p>{current.text}</p>
        <div className="row between guide-actions">
          <button className="ghost" onClick={finish}>Pular guia</button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)}>Próximo</button>
          ) : (
            <button onClick={finish}>Começar</button>
          )}
        </div>
        <p className="tiny center">Guia {step + 1}/{STEPS.length}</p>
      </section>
    </div>
  );
}
