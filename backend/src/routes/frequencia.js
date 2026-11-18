import { Router } from 'express';
import { db, FieldValue } from '../firebase.js';
import { PERFIS } from '../middleware/auth.js';
import { HttpError } from '../utils/erros.js';
import { buscarTurma, mapaDeProfessores } from '../utils/firestore.js';
import { calcularFrequencia, DIAS_LETIVOS, REGISTROS_VALIDOS, REGRAS } from '../utils/frequencia.js';
import { dataValida } from '../utils/validacao.js';

/**
 * Controle de frequência (chamada).
 * Um documento por turma e por dia em /frequencias/{turmaId}_{AAAA-MM-DD}:
 *   { turmaId, data, registros: { [alunoId]: 'presente' | 'falta' }, registradoPor, ... }
 *
 *   - professor: vê e registra a chamada SOMENTE das turmas em que é o responsável;
 *   - admin_geral: vê e registra a chamada de qualquer turma;
 *   - admin_secretario: apenas consulta.
 */
const router = Router();

const idDoDia = (turmaId, data) => `${turmaId}_${data}`;

async function turmaAutorizada(req, turmaId, { escrita }) {
  const turma = await buscarTurma(turmaId);
  const { perfil, uid } = req.usuario;
  if (perfil === PERFIS.GERAL) return turma;
  if (perfil === PERFIS.SECRETARIO && !escrita) return turma;
  if (perfil === PERFIS.PROFESSOR && turma.professorId === uid) return turma;
  throw new HttpError(403, 'Você não tem acesso à frequência desta turma.');
}

/** Só quem está cursando (em andamento) entra na chamada. */
async function alunosDaChamada(turmaId) {
  const snap = await db.collection('alunos').where('turmaId', '==', turmaId).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((a) => a.status === 'em_andamento')
    .sort((a, b) => a.nomeBusca.localeCompare(b.nomeBusca, 'pt-BR'));
}

async function diasDaTurma(turmaId) {
  const snap = await db.collection('frequencias').where('turmaId', '==', turmaId).get();
  return snap.docs.map((d) => d.data());
}

// GET /api/frequencia/turma/:turmaId?data=AAAA-MM-DD
router.get('/turma/:turmaId', async (req, res) => {
  const turma = await turmaAutorizada(req, req.params.turmaId, { escrita: false });
  const data = req.query.data ? String(req.query.data) : null;
  if (data && !dataValida(data)) throw new HttpError(400, 'Data inválida (formato AAAA-MM-DD).');

  const [alunos, dias, professores] = await Promise.all([
    alunosDaChamada(turma.id),
    diasDaTurma(turma.id),
    mapaDeProfessores(),
  ]);

  const faltas = new Map();
  const presencas = new Map();
  let doDia = {};
  for (const dia of dias) {
    for (const [alunoId, valor] of Object.entries(dia.registros ?? {})) {
      const mapa = valor === 'falta' ? faltas : presencas;
      mapa.set(alunoId, (mapa.get(alunoId) ?? 0) + 1);
    }
    if (dia.data === data) doDia = dia.registros ?? {};
  }

  res.json({
    turma: {
      id: turma.id,
      nome: turma.nome,
      anoLetivo: turma.anoLetivo,
      professorId: turma.professorId ?? null,
      professorNome: professores.get(turma.professorId) ?? null,
    },
    regras: REGRAS,
    podeRegistrar: req.usuario.perfil !== PERFIS.SECRETARIO,
    diasRegistrados: dias.length,
    data,
    alunos: alunos.map((a) => ({
      id: a.id,
      nomeCompleto: a.nomeCompleto,
      registro: data ? (doDia[a.id] ?? null) : null,
      presencas: presencas.get(a.id) ?? 0,
      ...calcularFrequencia(faltas.get(a.id) ?? 0),
    })),
    dias: dias
      .map((d) => {
        const valores = Object.values(d.registros ?? {});
        return {
          data: d.data,
          presentes: valores.filter((v) => v === 'presente').length,
          faltas: valores.filter((v) => v === 'falta').length,
        };
      })
      .sort((a, b) => b.data.localeCompare(a.data)),
  });
});

// PUT /api/frequencia/turma/:turmaId/chamada
// Body: { data: 'AAAA-MM-DD', registros: { [alunoId]: 'presente' | 'falta' } }
router.put('/turma/:turmaId/chamada', async (req, res) => {
  const turma = await turmaAutorizada(req, req.params.turmaId, { escrita: true });
  const { data, registros } = req.body ?? {};

  const hoje = new Date().toISOString().slice(0, 10);
  if (!dataValida(data)) throw new HttpError(400, 'Data inválida (formato AAAA-MM-DD).');
  if (data > hoje) throw new HttpError(400, 'Não é possível registrar a chamada de um dia futuro.');
  if (data.slice(0, 4) !== String(turma.anoLetivo)) {
    throw new HttpError(400, `A data precisa estar no ano letivo da turma (${turma.anoLetivo}).`);
  }
  if (!registros || typeof registros !== 'object' || Array.isArray(registros) || Object.keys(registros).length === 0) {
    throw new HttpError(400, 'Informe a presença ou falta de ao menos um aluno.');
  }

  const alunos = await alunosDaChamada(turma.id);
  const idsValidos = new Set(alunos.map((a) => a.id));
  for (const [alunoId, valor] of Object.entries(registros)) {
    if (!idsValidos.has(alunoId)) throw new HttpError(400, 'Há aluno na chamada que não pertence a esta turma.');
    if (!REGISTROS_VALIDOS.includes(valor)) throw new HttpError(400, 'Cada aluno deve estar como "presente" ou "falta".');
  }

  const ref = db.collection('frequencias').doc(idDoDia(turma.id, data));
  const existente = await ref.get();
  if (!existente.exists) {
    const dias = await db.collection('frequencias').where('turmaId', '==', turma.id).count().get();
    if (dias.data().count >= DIAS_LETIVOS) {
      throw new HttpError(409, `Esta turma já tem os ${DIAS_LETIVOS} dias letivos registrados.`);
    }
  }

  await ref.set(
    {
      turmaId: turma.id,
      data,
      registros,
      registradoPor: req.usuario.uid,
      atualizadoEm: FieldValue.serverTimestamp(),
      ...(existente.exists ? {} : { criadoEm: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
  res.json({ ok: true, data });
});

// Apaga a chamada de um dia (registrada por engano ou dia sem aula).
router.delete('/turma/:turmaId/chamada/:data', async (req, res) => {
  const turma = await turmaAutorizada(req, req.params.turmaId, { escrita: true });
  if (!dataValida(req.params.data)) throw new HttpError(400, 'Data inválida (formato AAAA-MM-DD).');

  const ref = db.collection('frequencias').doc(idDoDia(turma.id, req.params.data));
  if (!(await ref.get()).exists) throw new HttpError(404, 'Não há chamada registrada neste dia.');
  await ref.delete();
  res.status(204).end();
});

export default router;