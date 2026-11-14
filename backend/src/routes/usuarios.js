import { Router } from 'express';
import { auth, db, FieldValue } from '../firebase.js';
import { exigirPerfil, PERFIS } from '../middleware/auth.js';
import { HttpError } from '../utils/erros.js';
import { serializar } from '../utils/firestore.js';

// Só o Administrador Geral gerencia usuários. Existem apenas 2 perfis.
const router = Router();
router.use(exigirPerfil(PERFIS.GERAL));

const PERFIS_VALIDOS = Object.values(PERFIS);

router.get('/', async (req, res) => {
  const snap = await db.collection('usuarios').get();
  const usuarios = snap.docs.map(serializar).map(({ id, ...u }) => ({ uid: id, ...u }));
  usuarios.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  res.json(usuarios);
});

router.post('/', async (req, res) => {
  const nome = String(req.body?.nome ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const senha = String(req.body?.senha ?? '');
  const perfil = req.body?.perfil;

  const erros = [];
  if (nome.length < 3) erros.push('Informe o nome.');
  if (!/^\S+@\S+\.\S+$/.test(email)) erros.push('E-mail inválido.');
  if (senha.length < 8) erros.push('A senha precisa ter ao menos 8 caracteres.');
  if (!PERFIS_VALIDOS.includes(perfil)) erros.push('Perfil inválido.');
  if (erros.length) throw new HttpError(400, 'Dados inválidos.', erros);

  let criado;
  try {
    criado = await auth.createUser({ email, password: senha, displayName: nome });
  } catch (erro) {
    if (erro.code === 'auth/email-already-exists') throw new HttpError(409, 'Já existe um usuário com este e-mail.');
    throw erro;
  }

  try {
    await db.collection('usuarios').doc(criado.uid).set({
      nome,
      email,
      perfil,
      ativo: true,
      criadoEm: FieldValue.serverTimestamp(),
    });
  } catch (erro) {
    await auth.deleteUser(criado.uid); // desfaz para não deixar login sem perfil
    throw erro;
  }

  res.status(201).json({ uid: criado.uid, nome, email, perfil, ativo: true });
});

// Ativar / desativar acesso
router.patch('/:uid', async (req, res) => {
  const { uid } = req.params;
  if (typeof req.body?.ativo !== 'boolean') throw new HttpError(400, 'Informe "ativo" (true ou false).');
  if (uid === req.usuario.uid) throw new HttpError(400, 'Você não pode desativar o seu próprio acesso.');

  const ref = db.collection('usuarios').doc(uid);
  if (!(await ref.get()).exists) throw new HttpError(404, 'Usuário não encontrado.');

  await auth.updateUser(uid, { disabled: !req.body.ativo });
  await ref.update({ ativo: req.body.ativo });
  res.json({ uid, ativo: req.body.ativo });
});

export default router;
