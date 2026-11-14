# Sistema Escolar — React + Node.js + Firebase

Sem MySQL. Três peças:

| Pasta | O que é |
|---|---|
| `frontend/` | React (Vite). Login pelo Firebase Auth e telas de turmas, alunos e visão geral. |
| `backend/` | API Node.js (Express + firebase-admin). Única porta de entrada para Firestore e Storage. |
| `firestore.rules`, `storage.rules` | Regras que bloqueiam acesso direto ao banco e aos arquivos. |

**Comece por [`TUTORIAL.md`](./TUTORIAL.md)** — ele ensina, passo a passo, a configurar o Firebase, rodar o projeto e entender cada parte.

Resumo para rodar (depois de configurar o Firebase, passo 1 do tutorial):

```bash
# terminal 1
cd backend
npm install
cp .env.example .env          # preencha
npm run criar-admin -- voce@escola.com SuaSenhaForte "Seu Nome"
npm run dev

# terminal 2
cd frontend
npm install
cp .env.example .env          # preencha
npm run dev                   # http://localhost:5173
```
