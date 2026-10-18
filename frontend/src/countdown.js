// Votação do 2º turno: 25/10/2026, das 8h às 17h (horário de Brasília, UTC-3).
const INICIO = new Date("2026-10-25T08:00:00-03:00").getTime();
const FIM = new Date("2026-10-25T17:00:00-03:00").getTime();
export const HORA = 3600000;
export const DIA = 24 * HORA;

// Só a prévia de demonstração mexe nisso, para mostrar o modo "horas".
export const clock = { offset: 0 };
export const agora = () => Date.now() + clock.offset;
export const simularFaltando = (ms) => { clock.offset = INICIO - ms - Date.now(); };
export const tempoReal = () => { clock.offset = 0; };

export function contagem(t = agora()) {
  const falta = INICIO - t;
  if (falta >= DIA) {
    const d = Math.floor(falta / DIA);
    return d === 1 ? "Falta 1 dia" : `Faltam ${d} dias`;
  }
  if (falta >= HORA) {
    const h = Math.floor(falta / HORA);
    return h === 1 ? "Falta 1 hora" : `Faltam ${h} horas`;
  }
  if (falta > 0) return "Falta menos de 1 hora";
  return t < FIM ? "A votação está aberta" : "A votação foi encerrada";
}
