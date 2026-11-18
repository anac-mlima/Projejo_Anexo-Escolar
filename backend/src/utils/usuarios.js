import { auth, db, FieldValue } from '../firebase.js';
import { HttpError } from './erros.js';

/** Cria o login no Firebase Auth e o perfil em /usuarios/{uid}. */
export async function criarUsuario(body, perfisPermitidos) {
  const nome = String(body?.nome ?? '').trim().replace(/\s+/g, ' ');
  const email = String(body?.email ?? '').trim().toLowerCase();
  const senha = String(body?.senha ?? '');
  const perfil = body?.perfil;

  const erros = [];
  if (nome.length < 3) erros.push('Informe o nome.');
  if (!/^\S+@\S+\.\S+$/.test(email)) erros.push('E-mail inválido.');
  if (senha.length < 8) erros.push('A senha precisa ter ao menos 8 caracteres.');
  if (!perfisPermitidos.includes(perfil)) erros.push('Perfil inválido.');
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

  return { uid: criado.uid, nome, email, perfil, ativo: true };
}

/** Ativa/desativa o acesso (Firebase Auth + perfil). */
export async function definirAtivo(uid, ativo) {
  if (typeof ativo !== 'boolean') throw new HttpError(400, 'Informe "ativo" (true ou false).');

  const ref = db.collection('usuarios').doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'Usuário não encontrado.');

  await auth.updateUser(uid, { disabled: !ativo });
  await ref.update({ ativo });
  return snap.data();
}