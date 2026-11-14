import { auth } from './firebase';

const BASE = import.meta.env.VITE_API_URL || '/api';

async function requisitar(caminho, { method = 'GET', body, form } = {}) {
  const token = await auth.currentUser?.getIdToken(); // o Firebase renova sozinho quando expira
  const headers = { Authorization: `Bearer ${token}` };
  let corpo;

  if (form) {
    corpo = form; // FormData: o navegador define o Content-Type (multipart) sozinho
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    corpo = JSON.stringify(body);
  }

  const resposta = await fetch(`${BASE}${caminho}`, { method, headers, body: corpo });
  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const detalhes = Array.isArray(dados?.detalhes) ? ` ${dados.detalhes.join(' ')}` : '';
    throw new Error((dados?.erro || 'Erro inesperado. Tente novamente.') + detalhes);
  }
  return dados;
}

export const api = {
  get: (caminho) => requisitar(caminho),
  post: (caminho, body) => requisitar(caminho, { method: 'POST', body }),
  put: (caminho, body) => requisitar(caminho, { method: 'PUT', body }),
  patch: (caminho, body) => requisitar(caminho, { method: 'PATCH', body }),
  delete: (caminho) => requisitar(caminho, { method: 'DELETE' }),
  enviarArquivo: (caminho, form, method = 'POST') => requisitar(caminho, { method, form }),
};
export async function abrirPdf(url) {
  const janela = window.open('', '_blank'); // abre já no clique, para o navegador não bloquear o pop-up
  try {
    const token = await auth.currentUser?.getIdToken();
    const resposta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => null);
      throw new Error(dados?.erro || 'Não foi possível abrir o documento.');
    }
    const blob = await resposta.blob();
    if (janela) janela.location.href = URL.createObjectURL(blob);
  } catch (erro) {
    janela?.close();
    window.alert(erro.message);
  }
}

/** Monta "?a=1&b=2" ignorando valores vazios. */
export function consulta(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined && v !== false) q.set(k, v);
  });
  const texto = q.toString();
  return texto ? `?${texto}` : '';
}
