import 'dotenv/config';
import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Armazenamento dos PDFs em DISCO LOCAL (pasta do servidor onde a API roda).
 *
 *   <PASTA_ARQUIVOS>/alunos/{alunoId}/{uuid}.pdf
 *
 * A pasta NÃO é pública: o único jeito de abrir um PDF é por um link temporário
 
 * Para trocar de provedor no futuro (Firebase Storage, Supabase, R2…), basta reescrever
 * as funções deste arquivo mantendo os mesmos nomes e retornos.
 */

export const PASTA_ARQUIVOS = path.resolve(process.env.PASTA_ARQUIVOS || './uploads');

const MINUTOS_DO_LINK = 30;
const URL_BASE = (process.env.API_URL_PUBLICA || `http://localhost:${process.env.PORT || 3001}`).replace(/\/$/, '');

const SEGREDO =
  process.env.ARQUIVOS_SEGREDO ||
  (() => {
    console.warn('Aviso: defina ARQUIVOS_SEGREDO no .env. Sem isso, os links de PDF deixam de valer a cada reinício da API.');
    return randomBytes(32).toString('hex');
  })();

// Formato exato que a API gera. Qualquer outra coisa é recusada (evita "../" e afins).
const CAMINHO_VALIDO = /^alunos\/[A-Za-z0-9_-]{1,128}\/[0-9a-f-]{36}\.pdf$/;

/** Todo PDF de verdade começa com "%PDF-". Não confiamos só na extensão/mimetype. */
export function ehPdfValido(arquivo) {
  return Boolean(arquivo) && arquivo.buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

export async function salvarPdf(alunoId, arquivo) {
  const id = randomUUID();
  const caminho = `alunos/${alunoId}/${id}.pdf`;
  const destino = path.join(PASTA_ARQUIVOS, caminho);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, arquivo.buffer);
  return { id, caminho };
}

export async function removerArquivo(caminho) {
  if (!caminho || !CAMINHO_VALIDO.test(caminho)) return;
  await rm(path.join(PASTA_ARQUIVOS, caminho), { force: true });
}

// --- Links temporários: "corpo.assinatura", onde a assinatura é um HMAC com o segredo do servidor ---

const assinar = (texto) => createHmac('sha256', SEGREDO).update(texto).digest('base64url');

export function criarToken(caminho, nomeArquivo, minutos = MINUTOS_DO_LINK) {
  const corpo = Buffer.from(
    JSON.stringify({ c: caminho, n: nomeArquivo, e: Date.now() + minutos * 60 * 1000 }),
  ).toString('base64url');
  return `${corpo}.${assinar(corpo)}`;
}

/** Devolve { c: caminho, n: nome, e: expiraEm } ou null se o link for falso, adulterado ou vencido. */
export function lerToken(token) {
  const [corpo, assinatura, sobra] = String(token).split('.');
  if (!corpo || !assinatura || sobra !== undefined) return null;

  const esperada = Buffer.from(assinar(corpo));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;

  try {
    const dados = JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8'));
    if (typeof dados.e !== 'number' || dados.e < Date.now()) return null;
    if (typeof dados.c !== 'string' || !CAMINHO_VALIDO.test(dados.c)) return null;
    return dados;
  } catch {
    return null;
  }
}

/** Adiciona "url" a cada documento e esconde o caminho interno do disco. */
export async function comUrls(documentos = []) {
  return documentos.map(({ caminho, ...resto }) => ({
    ...resto,
    url: `${URL_BASE}/api/arquivos/${criarToken(caminho, resto.nomeArquivo)}`,
  }));
}
