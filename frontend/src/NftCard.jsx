import Figure from "./Figure";

const NOMES = { lula: "Lula", flavio: "Flávio Bolsonaro" };
const ESTADO = {
  minted: ["Aguardando apuração", "minted"],
  gold: ["Eleitor Master", "gold"],
  burned: ["Game over", "burned"],
};

export default function NftCard({ bet, owner, equipped = [] }) {
  const [rotulo, cls] = bet.won === true ? ESTADO.gold : bet.won === false ? ESTADO.burned : ESTADO.minted;
  return (
    <figure className={`nft ${cls}`} aria-label={`NFT número ${bet.nft_id}`}>
      <figcaption className="tiny">VorcaroNFT #{String(bet.nft_id).padStart(4, "0")}</figcaption>
      <div className="nft-art"><Figure side={bet.candidate} equipped={equipped} px={10} sash={bet.won === true} /></div>
      <p>Eleitor de {NOMES[bet.candidate]}</p>
      <p className="tiny">Dono: {owner}<br />Criado em {new Date(bet.minted_at).toLocaleDateString("pt-BR")}</p>
      <span className="tag">{rotulo}</span>
      {bet.won === true && <span className="tag">Faixa presidencial</span>}
    </figure>
  );
}
