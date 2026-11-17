import { auth, db } from '../firebase.js';

// Os dois únicos perfis do sistema.
export const PERFIS = {
  GERAL: 'admin_geral',
  SECRETARIO: 'admin_secretario',
};

/**
 * 1) Confere o token do Firebase Auth enviado pelo front-end ("Authorization: Bearer <token>").
 * 2) Busca o perfil do usuário em /usuarios/{uid} (é lá que o perfil e o "ativo" ficam).
 */
export async function autenticar(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Faça login para continuar.' });

  let decodificado;
  try {
    decodificado = await auth.verifyIdToken(token);
  } catch {
    return res.status(401).json({ erro: 'Sessão inválida ou expirada. Entre novamente.' });
  }

  let snap;
  try {
    snap = await db.collection('usuarios').doc(decodificado.uid).get();
  } catch (e) {
    console.error('Erro ao buscar usuário no Firestore:', e);
    return res.status(500).json({ erro: 'Erro ao consultar o perfil do usuário.' });
  }

  if (!snap.exists || snap.data().ativo === false) {
    return res.status(403).json({ erro: 'Este usuário não tem acesso ao sistema.' });
  }

  req.usuario = { uid: decodificado.uid, email: decodificado.email, ...snap.data() };
  next();
}

/** Libera a rota apenas para os perfis informados. */
export function exigirPerfil(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(req.usuario?.perfil)) {
      return res.status(403).json({ erro: 'Você não tem permissão para esta ação.' });
    }
    next();
  };
}