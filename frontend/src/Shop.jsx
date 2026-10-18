import { useEffect, useState } from "react";
import { api } from "./api";
import Figure from "./Figure";

const fmt = (n) => n.toLocaleString("pt-BR");
const SLOTS = { head: "Cabeça", eyes: "Olhos", face: "Rosto", back: "Costas", chest: "Peito", hold: "Peito", hand_l: "Mão esquerda", hand_r: "Mão direita" };

export default function Shop({ me, onClaim, onBuy, onEquip }) {
  const [items, setItems] = useState([]);
  useEffect(() => { api("/shop").then(setItems).catch(() => {}); }, []);
  const side = me.bet.candidate;
  return (
    <div className="box">
      <p>Lojinha do eleitor</p>
      <div className="row between daily">
        <span className="tiny">{me.can_claim ? "Suas 2.500 vorcarocoins de hoje estão prontas." : "Hoje você já resgatou. Volte amanhã!"}</span>
        <button disabled={!me.can_claim} onClick={onClaim}>Resgatar 2.500</button>
      </div>
      <ul className="shop">
        {items.filter((it) => !it.side || it.side === side).map((it) => {
          const owned = me.owned.includes(it.id);
          const on = me.equipped.includes(it.id);
          return (
            <li key={it.id}>
              <Figure side={side} equipped={[it.id]} px={3} />
              <span>{it.name}<br /><span className="tiny">{SLOTS[it.slot]}</span></span>
              {owned
                ? <button className="ghost" onClick={() => onEquip(it.id, !on)}>{on ? "Tirar" : "Vestir"}</button>
                : <button disabled={me.balance < it.price} onClick={() => onBuy(it.id)}>{fmt(it.price)}</button>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
