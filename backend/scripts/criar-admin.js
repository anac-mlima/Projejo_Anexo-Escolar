// Cria (ou promove) o PRIMEIRO Administrador Geral.
// Uso:  npm run criar-admin -- email@escola.com SenhaForte123 "Nome da Pessoa"
import { auth, db, FieldValue } from '../src/firebase.js';

const [email, senha, ...partesDoNome] = process.argv.slice(2);
const nome = partesDoNome.join(' ') || 'Administrador Geral';

if (!email || !senha) {
  console.error('Uso: npm run criar-admin -- email senha "Nome"');
  process.exit(1);
}

let usuario;
try {
  usuario = await auth.getUserByEmail(email);
  console.log('Este e-mail já existia no Firebase Auth; vou apenas definir o perfil.');
} catch (erro) {
  if (erro.code !== 'auth/user-not-found') throw erro;
  usuario = await auth.createUser({ email, password: senha, displayName: nome });
}

await db.collection('usuarios').doc(usuario.uid).set(
  { nome, email, perfil: 'admin_geral', ativo: true, criadoEm: FieldValue.serverTimestamp() },
  { merge: true },
);

console.log(`Administrador Geral pronto: ${email} (uid ${usuario.uid})`);
process.exit(0);
