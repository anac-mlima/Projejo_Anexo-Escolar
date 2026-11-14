import { Router } from 'express';
import multer from 'multer';
import { db, FieldValue } from '../firebase.js';
import { HttpError } from '../utils/erros.js';
import { buscarAluno } from '../utils/firestore.js';
import { comUrls, ehPdfValido, removerArquivo, salvarPdf } from '../services/storage.js';

/**
 * Documentos são um recurso PRÓPRIO do aluno: podem ser adicionados, substituídos
 * ou excluídos a qualquer momento — inclusive para alunos cadastrados sem anexos.
 * (Esse é o conserto do problema "precisa recadastrar o aluno do zero".)
 */
const router = Router({ mergeParams: true });

const MAX_DOCUMENTOS_POR_ALUNO = 20;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10 MB
  fileFilter: (req, arquivo, cb) =>
    arquivo.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new HttpError(400, 'Apenas arquivos PDF são permitidos.')),
});

function exigirPdf(req) {
  if (!req.file) throw new HttpError(400, 'Envie um arquivo PDF no campo "arquivo".');
  if (!ehPdfValido(req.file)) throw new HttpError(400, 'O arquivo enviado não é um PDF válido.');
}

// O navegador manda o nome em UTF-8, mas o multer lê como latin1: corrigimos aqui.
function nomeOriginal(arquivo) {
  return Buffer.from(arquivo.originalname, 'latin1').toString('utf8');
}

function tituloDe(req) {
  const digitado = String(req.body?.titulo ?? '').trim().slice(0, 80);
  return digitado || nomeOriginal(req.file).replace(/\.pdf$/i, '').slice(0, 80);
}

/**
 * Lê o aluno, aplica a mudança na lista de documentos e grava — tudo numa transação,
 * para que dois envios simultâneos não sobrescrevam um ao outro.
 * `mutador` recebe a lista atual e devolve { documentos, resultado }.
 */
async function modificarDocumentos(alunoId, mutador) {
  const ref = db.collection('alunos').doc(alunoId);
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new HttpError(404, 'Aluno não encontrado.');
    const { documentos, resultado } = mutador(snap.data().documentos || []);
    t.update(ref, { documentos, atualizadoEm: FieldValue.serverTimestamp() });
    return resultado;
  });
}

// Listar
router.get('/', async (req, res) => {
  const aluno = await buscarAluno(req.params.alunoId);
  res.json(await comUrls(aluno.documentos));
});

// Adicionar
router.post('/', upload.single('arquivo'), async (req, res) => {
  const { alunoId } = req.params;
  await buscarAluno(alunoId);
  exigirPdf(req);

  const { id, caminho } = await salvarPdf(alunoId, req.file);
  const documento = {
    id,
    titulo: tituloDe(req),
    nomeArquivo: nomeOriginal(req.file),
    caminho,
    tamanho: req.file.size,
    enviadoEm: new Date().toISOString(),
    enviadoPor: req.usuario.uid,
  };

  try {
    await modificarDocumentos(alunoId, (docs) => {
      if (docs.length >= MAX_DOCUMENTOS_POR_ALUNO) {
        throw new HttpError(400, `Limite de ${MAX_DOCUMENTOS_POR_ALUNO} documentos por aluno atingido.`);
      }
      return { documentos: [...docs, documento], resultado: documento };
    });
  } catch (erro) {
    await removerArquivo(caminho); // não deixa arquivo órfão no Storage
    throw erro;
  }

  const [comUrl] = await comUrls([documento]);
  res.status(201).json(comUrl);
});

// Substituir o PDF e/ou renomear o título
router.put('/:docId', upload.single('arquivo'), async (req, res) => {
  const { alunoId, docId } = req.params;
  const aluno = await buscarAluno(alunoId);
  if (!(aluno.documentos || []).some((d) => d.id === docId)) {
    throw new HttpError(404, 'Documento não encontrado.');
  }

  const novoTitulo = String(req.body?.titulo ?? '').trim().slice(0, 80);
  if (!req.file && !novoTitulo) throw new HttpError(400, 'Envie um novo PDF e/ou um novo título.');

  let novo = null;
  if (req.file) {
    exigirPdf(req);
    novo = await salvarPdf(alunoId, req.file);
  }

  let resultado;
  try {
    resultado = await modificarDocumentos(alunoId, (docs) => {
      const i = docs.findIndex((d) => d.id === docId);
      if (i === -1) throw new HttpError(404, 'Documento não encontrado.');
      const atualizado = { ...docs[i] };
      if (novoTitulo) atualizado.titulo = novoTitulo;
      if (novo) {
        atualizado.caminho = novo.caminho;
        atualizado.nomeArquivo = nomeOriginal(req.file);
        atualizado.tamanho = req.file.size;
        atualizado.enviadoEm = new Date().toISOString();
        atualizado.enviadoPor = req.usuario.uid;
      }
      const copia = [...docs];
      copia[i] = atualizado;
      return { documentos: copia, resultado: { documento: atualizado, caminhoAntigo: docs[i].caminho } };
    });
  } catch (erro) {
    if (novo) await removerArquivo(novo.caminho);
    throw erro;
  }

  if (novo) await removerArquivo(resultado.caminhoAntigo); // só apaga o antigo depois de gravar o novo
  const [comUrl] = await comUrls([resultado.documento]);
  res.json(comUrl);
});

// Excluir
router.delete('/:docId', async (req, res) => {
  const { alunoId, docId } = req.params;
  const removido = await modificarDocumentos(alunoId, (docs) => {
    const doc = docs.find((d) => d.id === docId);
    if (!doc) throw new HttpError(404, 'Documento não encontrado.');
    return { documentos: docs.filter((d) => d.id !== docId), resultado: doc };
  });
  await removerArquivo(removido.caminho);
  res.status(204).end();
});

export default router;
