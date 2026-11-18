// Regras de frequência do ano letivo.
//   - 200 dias letivos no ano;
//   - frequência mínima de 75%  ->  no máximo 25% de faltas (50 faltas);
//   - semáforo: verde (tranquilo), amarelo (perto do limite), vermelho (passou do limite).

export const DIAS_LETIVOS = 200;
export const FREQUENCIA_MINIMA = 75; // em %
export const LIMITE_FALTAS = Math.floor((DIAS_LETIVOS * (100 - FREQUENCIA_MINIMA)) / 100); // 50
// Amarelo a partir de 80% do limite (40 faltas). Ajuste aqui se a escola quiser outro alerta.
export const ALERTA_FALTAS = Math.ceil(LIMITE_FALTAS * 0.8);

export const REGISTROS_VALIDOS = ['presente', 'falta'];

const umaCasa = (n) => Math.round(n * 10) / 10;

/**
 * verde    -> faltas abaixo do alerta
 * amarelo  -> do alerta até o limite (ainda dentro dos 75%, mas sem folga)
 * vermelho -> acima do limite (frequência abaixo de 75%)
 * Exatamente 50 faltas = 75% de frequência, que ainda é permitido (amarelo).
 */
export function calcularFrequencia(faltas) {
  const situacao = faltas > LIMITE_FALTAS ? 'vermelho' : faltas >= ALERTA_FALTAS ? 'amarelo' : 'verde';
  return {
    faltas,
    faltasRestantes: Math.max(0, LIMITE_FALTAS - faltas),
    percentualFaltas: umaCasa((faltas / DIAS_LETIVOS) * 100),
    frequencia: umaCasa(Math.max(0, ((DIAS_LETIVOS - faltas) / DIAS_LETIVOS) * 100)),
    situacao,
  };
}

export const REGRAS = {
  diasLetivos: DIAS_LETIVOS,
  frequenciaMinima: FREQUENCIA_MINIMA,
  limiteFaltas: LIMITE_FALTAS,
  alertaFaltas: ALERTA_FALTAS,
};