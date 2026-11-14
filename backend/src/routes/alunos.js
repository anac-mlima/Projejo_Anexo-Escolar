import { Router } from 'express';
import { db, FieldValue } from '../firebase.js';
import { exigirPerfil, PERFIS } from '../middleware/auth.js';
import { HttpError } from '../utils/erros.js';
import { buscarAluno, buscarTurma, mapaDeTurmas, serializar } from '../utils/firestore.js';
import { normalizar, STATUS, validarAluno } from '../utils/validacao.js';
import { comUrls, removerArquivo } from '../services/storage.js';
import documentosRouter from './documentos.js';

const router = Router();
router.use(exigirPerfil(PERFIS.GERAL, PERFIS.SECRETARIO));

// Ordenações pedidas: alfabética, mais antigo e mais recente (data de cadastro).
const ORDENS = {
  alfabetica: (a, b) => a.nomeBusca.localeCompare(b.nomeBusca, 'pt-BR'),
  antigo: (a, b) => (a.criadoEm || '').localeCompare(b.criadoEm || '') || ORDENS.alfabetica(a, b),
  recente: (a, b) => (b.criadoEm || '').localeCompare(a.criadoEm || '') || ORDENS.alfabetica(a, b),
};

async function paraResposta(aluno, nomeDaTurma) {
  const { nomeBusca, criadoPor, ...resto } = aluno;
  return { ...resto, turmaNome: nomeDaTurma ?? null, documentos: await comUrls(aluno.documentos) };
}

/**
 * GET /api/alunos
 *  ?turmaId=   só os alunos da turma (tela da turma). Sem isso = TODOS (aba Visão Geral).
 *  ?q=         busca por nome (ignora maiúsculas e acentos)
 *  ?status=    concluido | em_andamento | interrompido
 *  ?ordem=     alfabetica (padrão) | antigo | recente
 *  ?semDocumentos=true   só quem ainda não tem nenhum PDF
 *
 * Filtramos e ordenamos aqui no Node para não precisar criar índices compostos no Firestore.
 * Para escolas com alguns milhares de alunos isso é rápido; veja "Próximos passos" no tutorial.
 */
router.get('/', async (req, res) => {
  const { turmaId, q, status, semDocumentos } = req.query;
  const ordem = req.query.ordem ?? 'alfabetica';

  if (typeof ordem !== 'string' || !Object.hasOwn(ORDENS, ordem)) {
    throw new HttpError(400, 'Ordem inválida. Use: alfabetica, antigo ou recente.');
  }
  if (status && !STATUS.includes(status)) throw new HttpError(400, 'Status inválido.');

  let consulta = db.collection('alunos');
  if (turmaId) consulta = consulta.where('turmaId', '==', String(turmaId));

  const [snap, turmas] = await Promise.all([consulta.get(), mapaDeTurmas()]);
  let alunos = snap.docs.map(serializar);

  if (status) alunos = alunos.filter((a) => a.status === status);
  if (q) {
    const termo = normalizar(String(q));
    alunos = alunos.filter((a) => a.nomeBusca.includes(termo));
  }
  if (semDocumentos === 'true') alunos = alunos.filter((a) => (a.documentos || []).length === 0);

  alunos.sort(ORDENS[ordem]);
  res.json(await Promise.all(alunos.map((a) => paraResposta(a, turmas.get(a.turmaId)))));
});

router.get('/:id', async (req, res) => {
  const aluno = await buscarAluno(req.params.id);
  const turma = await buscarTurma(aluno.turmaId).catch(() => null);
  res.json(await paraResposta(aluno, turma?.nome));
});

// Cadastro: NÃO exige documentos. Eles são enviados depois (ou junto) pelas rotas /documentos.
router.post('/', async (req, res) => {
  const dados = validarAluno(req.body);
  const turma = await buscarTurma(req.body?.turmaId);

  const ref = db.collection('alunos').doc();
  await ref.set({
    ...dados,
    nomeBusca: normalizar(dados.nomeCompleto),
    turmaId: turma.id,
    anoLetivo: turma.anoLetivo, // copiado da turma
    documentos: [],
    criadoPor: req.usuario.uid,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });

  res.status(201).json(await paraResposta(serializar(await ref.get()), turma.nome));
});

router.put('/:id', async (req, res) => {
  const atual = await buscarAluno(req.params.id);
  const dados = validarAluno(req.body);

  const alteracoes = {
    ...dados,
    nomeBusca: normalizar(dados.nomeCompleto),
    atualizadoEm: FieldValue.serverTimestamp(),
  };

  // Permite transferir o aluno para outra turma.
  let turma;
  if (req.body?.turmaId && req.body.turmaId !== atual.turmaId) {
    turma = await buscarTurma(req.body.turmaId);
    alteracoes.turmaId = turma.id;
    alteracoes.anoLetivo = turma.anoLetivo;
  } else {
    turma = await buscarTurma(atual.turmaId);
  }

  await db.collection('alunos').doc(atual.id).update(alteracoes);
  res.json(await paraResposta(await buscarAluno(atual.id), turma.nome));
});

router.delete('/:id', async (req, res) => {
  const aluno = await buscarAluno(req.params.id);
  // Apaga os PDFs do Storage junto, para não sobrar arquivo órfão.
  await Promise.allSettled((aluno.documentos || []).map((d) => removerArquivo(d.caminho)));
  await db.collection('alunos').doc(aluno.id).delete();
  res.status(204).end();
});

// /api/alunos/:alunoId/documentos...
router.use('/:alunoId/documentos', documentosRouter);

export default router;
