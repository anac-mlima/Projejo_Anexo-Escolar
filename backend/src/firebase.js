import 'dotenv/config';
import { readFileSync } from 'node:fs';
import admin from 'firebase-admin';

const caminhoChave = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccountKey.json';

let chave;
try {
  chave = JSON.parse(readFileSync(caminhoChave, 'utf8'));
} catch {
  console.error(`Não foi possível ler a chave do Firebase em "${caminhoChave}". Veja o passo 1 do TUTORIAL.md.`);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(chave),
});

export const auth = admin.auth();
export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
