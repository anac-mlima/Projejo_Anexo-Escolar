# Tutorial — Sistema Escolar com React, Node.js e Firebase

Este guia leva você do zero até o sistema rodando, explicando **o porquê** de cada decisão. O código já está pronto nas pastas `backend/` e `frontend/`; você pode (a) só configurar e rodar, ou (b) **reconstruir digitando** seguindo a ordem do [Passo 5](#passo-5--backend-a-api-nodejs) e [Passo 6](#passo-6--frontend-react) — é a melhor forma de aprender.

> **Como foi testado:** a API foi testada de ponta a ponta (37 verificações: permissões, PDFs, busca, ordenação, visão geral) contra um Firebase simulado em memória, e o front foi compilado com sucesso. **Não foi testada contra o seu projeto Firebase real**, então siga o roteiro do [Passo 8](#passo-8--roteiro-de-testes-manual) na primeira execução.

---

## Sumário

0. [Visão geral e arquitetura](#passo-0--visão-geral-e-arquitetura)
1. [Pré-requisitos](#passo-1--pré-requisitos)
2. [Configurar o Firebase](#passo-2--configurar-o-firebase)
3. [Modelagem de dados](#passo-3--modelagem-de-dados)
4. [Regras de negócio → onde cada uma vive no código](#passo-4--regras-de-negócio--onde-cada-uma-vive)
5. [Backend (a API Node.js)](#passo-5--backend-a-api-nodejs)
6. [Frontend (React)](#passo-6--frontend-react)
7. [Regras de segurança do Firebase](#passo-7--regras-de-segurança-do-firebase)
8. [Roteiro de testes manual](#passo-8--roteiro-de-testes-manual)
9. [Migrando do MySQL](#passo-9--migrando-do-mysql)
10. [Publicar (deploy)](#passo-10--publicar-deploy)
11. [Problemas comuns](#problemas-comuns)
12. [Limites conhecidos e próximos passos](#limites-conhecidos-e-próximos-passos)

---

## Passo 0 — Visão geral e arquitetura

```
 Navegador (React) ──login──────────▶ Firebase Authentication
        │                                   │ devolve um token (JWT)
        │                                   ▼
        └── fetch /api + "Bearer token" ─▶ API Node.js (Express + firebase-admin)
                                              ├──▶ Firestore  (usuarios, turmas, alunos)
                                              └──▶ Storage    (PDFs em alunos/{alunoId}/{uuid}.pdf)
```

**Decisão central: o React nunca fala direto com Firestore/Storage.** Ele só usa o Firebase para **login**. Todo o resto passa pela API Node, que:

1. confere o token e descobre o perfil do usuário;
2. aplica as regras de negócio (quem pode o quê, validações, PDF obrigatório);
3. lê/grava no Firestore e no Storage com a chave de administrador.

Por que assim, e não React → Firestore direto? Suas regras (dois perfis, só PDF, status com ano obrigatório, bloquear exclusão de turma com alunos…) são complexas demais para as "Security Rules" do Firebase e ficariam espalhadas pelo front. Numa API, ficam em um lugar só, testáveis, e **o usuário não consegue burlá-las mexendo no navegador**.

---

## Passo 1 — Pré-requisitos

- **Node.js 20 ou superior** (`node -v`). Baixe em nodejs.org.
- Um editor (VS Code).
- Uma conta Google (para o Firebase).
- Terminal. No Windows, use `copy` no lugar de `cp`.

---

## Passo 2 — Configurar o Firebase

Faça uma vez só, no [console do Firebase](https://console.firebase.google.com).

### 2.1 Criar o projeto
**Adicionar projeto** → dê um nome (ex.: `sistema-escolar`) → pode desativar o Google Analytics.

### 2.2 Authentication (login)
**Build → Authentication → Vamos começar → Sign-in method → E-mail/senha → Ativar → Salvar.**

> Endurecimento recomendado: se o seu console tiver em *Authentication → Settings → User actions* a opção de **permitir auto-cadastro**, desative-a. Mesmo sem isso, ninguém entra no sistema só por ter uma conta no Auth: a API exige que o usuário exista na coleção `usuarios` e esteja ativo (resposta 403 caso contrário).

### 2.3 Firestore (banco de dados)
**Build → Firestore Database → Criar banco de dados → modo de produção.** Escolha uma região (ex.: `southamerica-east1`, São Paulo). A região não muda depois.

### 2.4 Storage (arquivos PDF)
**Build → Storage → Vamos começar**, modo de produção. Anote o nome do bucket que aparece no topo (ex.: `sistema-escolar.firebasestorage.app`).

> Atenção: dependendo da data de criação do projeto e das regras vigentes do Firebase, o Storage pode exigir o plano **Blaze** (pagamento por uso, com cota gratuita). Se o console pedir, verifique os preços atuais antes de ativar. Para uma escola pequena o consumo costuma ficar na cota gratuita, mas confirme na página de preços do Firebase.

### 2.5 Chave da API (service account) — usada pelo backend
**⚙️ Configurações do projeto → Contas de serviço → Gerar nova chave privada.** Salve o arquivo como **`backend/serviceAccountKey.json`**.

⚠️ Essa chave dá poder total sobre o projeto. **Nunca** publique no GitHub (o `.gitignore` já a ignora) nem envie por e-mail/chat.

### 2.6 Configuração Web — usada pelo frontend
**⚙️ Configurações do projeto → Geral → Seus apps → ícone `</>` (Web)** → registre o app → copie `apiKey`, `authDomain`, `projectId`, `appId`. Esses valores **não são segredo** (só identificam o projeto).

---

## Passo 3 — Modelagem de dados

O Firestore guarda **documentos** dentro de **coleções**. Usamos três coleções (o Auth guarda e-mail/senha; o Storage guarda os PDFs):

```
usuarios/{uid}          → quem pode entrar e com qual perfil
turmas/{turmaId}        → turmas cadastradas pelo Administrador Geral
alunos/{alunoId}        → alunos, com a lista de documentos embutida
```

### `usuarios/{uid}` (o `uid` é o mesmo do Firebase Auth)
| Campo | Exemplo | Observação |
|---|---|---|
| `nome` | `"Ana Souza"` | |
| `email` | `"ana@escola.com"` | |
| `perfil` | `"admin_geral"` ou `"admin_secretario"` | **Só existem estes 2.** |
| `ativo` | `true` | `false` bloqueia o acesso na hora |
| `criadoEm` | timestamp | |

### `turmas/{turmaId}`
| Campo | Exemplo |
|---|---|
| `nome` | `"5º Ano A"` |
| `anoLetivo` | `2026` |
| `descricao` | `"Turno da manhã"` (opcional) |
| `criadoPor`, `criadoEm`, `atualizadoEm` | auditoria básica |

### `alunos/{alunoId}`
| Campo | Exemplo | Observação |
|---|---|---|
| `nomeCompleto` | `"João Pedro Silva"` | obrigatório |
| `nomeBusca` | `"joao pedro silva"` | minúsculo e sem acentos; usado na busca e na ordem A–Z |
| `dataNascimento` | `"2014-03-10"` | obrigatório, texto `AAAA-MM-DD` |
| `turmaId` | `"abc123"` | vínculo com a turma |
| `anoLetivo` | `2026` | **copiado da turma** (obrigatório) |
| `status` | `"em_andamento"` | `concluido`, `em_andamento` ou `interrompido` |
| `anoStatus` | `2026` | ano corrente / de conclusão / da interrupção |
| `dataConclusao` | `"2025-12-10"` ou `null` | só para `concluido` |
| `documentos` | lista (abaixo) | começa `[]` — **cadastrar sem PDF é permitido** |
| `criadoEm`, `atualizadoEm`, `criadoPor` | | `criadoEm` alimenta "mais antigo/mais recente" |

Cada item de `documentos`:
```json
{
  "id": "6f1c…uuid",
  "titulo": "Certidão de nascimento",
  "nomeArquivo": "certidao.pdf",
  "caminho": "alunos/{alunoId}/6f1c….pdf",
  "tamanho": 183204,
  "enviadoEm": "2026-11-09T21:00:00.000Z",
  "enviadoPor": "uid-de-quem-enviou"
}
```

**Por que `documentos` fica dentro do aluno (e não em subcoleção)?**
- Uma única leitura traz o aluno com todos os anexos → a **Visão Geral** é uma consulta só.
- Atualizações viram uma *transação* (duas pessoas anexando ao mesmo tempo não se atropelam).
- Limite: um documento do Firestore tem no máximo ~1 MiB. Como cada item tem ~300 bytes, a API limita a **20 PDFs por aluno** — folga enorme.

**Por que o ano letivo é copiado da turma para o aluno?** A regra pede o ano letivo como dado do aluno. Se o Administrador Geral mudar o ano da turma, a API atualiza os alunos dela automaticamente.

**O que NÃO precisou:** índices compostos. A API só filtra por `turmaId` (igualdade) no Firestore e faz busca/ordenação em memória — simples para quem está começando e rápido para uma escola (ver [limites](#limites-conhecidos-e-próximos-passos)).

---

## Passo 4 — Regras de negócio → onde cada uma vive

| # | Regra | Onde está |
|---|---|---|
| 1 | Só 2 perfis | `backend/src/middleware/auth.js` (`PERFIS`, `exigirPerfil`); `routes/usuarios.js` valida o perfil |
| 2 | Documentos gerenciáveis a qualquer momento, só PDF | `routes/documentos.js` + `services/storage.js` |
| 3 | Admin Geral cadastra turmas; turmas são cards; Secretário gerencia alunos | `routes/turmas.js` (`somenteGeral`), `pages/Turmas.jsx`, `pages/TurmaAlunos.jsx` |
| 4 | Campos e status do aluno | `utils/validacao.js` (`validarAluno`), `components/AlunoModal.jsx` |
| 5 | Busca e ordem (A–Z, mais antigo, mais recente) | `routes/alunos.js` (`ORDENS`, filtro `q`), selects nas páginas |
| 6 | Aba de visão geral com todos os PDFs | `GET /api/alunos` sem `turmaId` + `pages/VisaoGeral.jsx` |

**Quem pode o quê (como implementado):**

| Ação | Administrador Geral | Administrador Secretário |
|---|:-:|:-:|
| Cadastrar / editar / excluir turmas | ✅ | ❌ |
| Ver turmas (cards) | ✅ | ✅ |
| Gerenciar alunos e PDFs | ✅ | ✅ |
| Ver aba Visão Geral | ✅ | ✅ |
| Criar usuários / ativar-desativar acessos | ✅ | ❌ |

> **Decisão que tomei por você:** o Administrador Geral também pode gerenciar alunos (é um superconjunto do Secretário). Se quiser que **só** o Secretário mexa em alunos, troque `exigirPerfil(PERFIS.GERAL, PERFIS.SECRETARIO)` por `exigirPerfil(PERFIS.SECRETARIO)` no topo de `routes/alunos.js` — e esconda os botões no front.

### Status do aluno → o que é obrigatório

| Status | Campo exigido |
|---|---|
| Em andamento | ano corrente (`anoStatus`) |
| Concluído | data de conclusão (`dataConclusao`) **ou** só o ano (`anoStatus`) |
| Interrompido / Desmatriculado | ano (`anoStatus`) |

### Por que o problema dos documentos acontecia (e como foi resolvido)
O sintoma que você descreveu ("aluno sem documentos não pode receber anexo depois") costuma acontecer quando **os anexos fazem parte da mesma operação do cadastro**: o INSERT do aluno e o upload viram uma coisa só. Aqui os documentos são **um recurso separado**, com rotas próprias:

```
POST   /api/alunos/:id/documentos            → adicionar
PUT    /api/alunos/:id/documentos/:docId     → substituir o PDF (e/ou renomear)
DELETE /api/alunos/:id/documentos/:docId     → excluir
```

O cadastro do aluno **não exige** PDF; o front até permite anexar na hora (opcional), mas o botão **Documentos** na linha do aluno funciona a qualquer momento, inclusive para alunos antigos.

---

## Passo 5 — Backend (a API Node.js)

### 5.1 Rodando
```bash
cd backend
npm install
cp .env.example .env      # Windows: copy .env.example .env
```
Edite o `.env`:
```
PORT=3001
CORS_ORIGINS=http://localhost:5173
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app   # o nome do bucket (passo 2.4)
```

Crie o **primeiro Administrador Geral** (a API exige login, então alguém precisa nascer "de fora"):
```bash
npm run criar-admin -- voce@escola.com SuaSenhaForte123 "Seu Nome"
```
Suba a API:
```bash
npm run dev
# API rodando em http://localhost:3001
```
Teste: abra `http://localhost:3001/api/saude` → `{"ok":true}`.

### 5.2 Ordem para reconstruir (e o que aprender em cada arquivo)

**1. `package.json`** — `"type": "module"` habilita `import/export`. Dependências: `express` (servidor), `firebase-admin` (Firestore/Storage/Auth com poderes de admin), `multer` (receber upload), `cors`, `helmet` (cabeçalhos de segurança), `dotenv` (variáveis do `.env`).

**2. `src/firebase.js`** — inicia o Admin SDK com a chave e exporta `auth`, `db`, `bucket`. É o único arquivo que conhece a chave.

**3. `src/middleware/auth.js`** — o "porteiro". Ideia central:
```js
const decodificado = await auth.verifyIdToken(token);          // token é legítimo?
const snap = await db.collection('usuarios').doc(decodificado.uid).get();
if (!snap.exists || snap.data().ativo === false) → 403          // está cadastrado e ativo?
req.usuario = { uid, ...snap.data() };                          // perfil disponível nas rotas
```
e `exigirPerfil('admin_geral')` barra quem não tem o perfil. Guardamos o perfil no Firestore (e não só no token) para que **desativar um usuário valha imediatamente**.

**4. `src/utils/validacao.js`** — `validarAluno` e `validarTurma`. Nunca confie no front: toda regra é revalidada aqui (nome com sobrenome, data real, status válido, ano exigido conforme o status).

**5. `src/routes/turmas.js`** — CRUD. Observe `router.post('/', somenteGeral, …)`: o segundo argumento é o porteiro de perfil. A listagem usa `.count()` do Firestore para mostrar "N alunos" no card.

**6. `src/services/storage.js`** — salva PDFs em `alunos/{alunoId}/{uuid}.pdf` e gera **links temporários (30 min)**. O bucket é privado; ninguém acessa um PDF sem passar pela API. Também confere a assinatura `%PDF-` dos primeiros bytes — não basta o arquivo se chamar `.pdf`.

**7. `src/routes/documentos.js`** — o conserto do problema. O trecho que merece estudo é a transação:
```js
async function modificarDocumentos(alunoId, mutador) {
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);                       // lê a lista atual
    const { documentos, resultado } = mutador(snap.data().documentos || []);
    t.update(ref, { documentos });                       // grava a nova lista
    return resultado;
  });
}
```
Fluxos cuidadosos: ao **substituir**, o PDF novo é gravado primeiro e o antigo só é apagado depois que o banco confirmou (se algo falhar no meio, ninguém perde o documento); ao **adicionar**, se a gravação no banco falhar, o arquivo recém-enviado é removido (sem "arquivo órfão").

**8. `src/routes/alunos.js`** — CRUD + busca. `GET /api/alunos` aceita:

| Parâmetro | Efeito |
|---|---|
| `turmaId` | só os alunos da turma (sem ele = **todos**, usado na Visão Geral) |
| `q` | busca por nome, ignora maiúsculas/acentos |
| `status` | `concluido` \| `em_andamento` \| `interrompido` |
| `ordem` | `alfabetica` (padrão) \| `antigo` \| `recente` |
| `semDocumentos=true` | só quem ainda não tem PDF |

**9. `src/routes/usuarios.js`** — só o Admin Geral. Cria o usuário no Auth **e** o perfil no Firestore (se a segunda etapa falhar, desfaz a primeira).

**10. `src/server.js`** — monta tudo. Repare na ordem: `/api/saude` (pública) → `app.use('/api', autenticar)` → rotas protegidas → tratador de erros. No Express 5, erros em funções `async` já chegam ao tratador sozinhos.

### 5.3 Tabela de endpoints

| Método e rota | Quem | Função |
|---|---|---|
| `GET /api/me` | logado | dados e perfil do usuário atual |
| `GET /api/turmas` | ambos | lista (com `totalAlunos`) |
| `GET /api/turmas/:id` | ambos | detalhe |
| `POST` / `PUT /:id` / `DELETE /:id` em `/api/turmas` | **Geral** | cadastrar / editar / excluir (bloqueia se houver alunos) |
| `GET /api/alunos` | ambos | lista com filtros (acima) |
| `GET /api/alunos/:id` | ambos | detalhe |
| `POST /api/alunos` | ambos | cadastrar (sem exigir PDF) |
| `PUT /api/alunos/:id` | ambos | editar (aceita `turmaId` para transferir) |
| `DELETE /api/alunos/:id` | ambos | exclui aluno **e seus PDFs** |
| `GET /api/alunos/:id/documentos` | ambos | lista com links temporários |
| `POST /api/alunos/:id/documentos` | ambos | form-data: `arquivo` (PDF) + `titulo` |
| `PUT /api/alunos/:id/documentos/:docId` | ambos | substitui PDF e/ou título |
| `DELETE /api/alunos/:id/documentos/:docId` | ambos | exclui |
| `GET/POST /api/usuarios`, `PATCH /api/usuarios/:uid` | **Geral** | gerenciar usuários |

---

## Passo 6 — Frontend (React)

### 6.1 Rodando
```bash
cd frontend
npm install
cp .env.example .env
```
Preencha o `.env` com os valores do passo 2.6 (`VITE_FIREBASE_API_KEY`, `…AUTH_DOMAIN`, `…PROJECT_ID`, `…APP_ID`). Depois:
```bash
npm run dev
# abra http://localhost:5173
```
O `vite.config.js` encaminha `/api` para `localhost:3001`, então não há problema de CORS em desenvolvimento.

### 6.2 Ordem para reconstruir

1. **`src/firebase.js`** — inicia o Firebase Web, exporta só `auth`.
2. **`src/api.js`** — a função que **toda** chamada usa: pega `auth.currentUser.getIdToken()`, envia `Authorization: Bearer …` e transforma erros da API em mensagens legíveis. Para PDF usa `FormData` (não coloque `Content-Type` manualmente — o navegador cria o `multipart` com o "boundary" certo).
3. **`src/AuthContext.jsx`** — guarda quem está logado. Ao detectar login, chama `GET /api/me` para saber o **perfil**. Se o usuário existe no Auth mas não na coleção `usuarios`, é deslogado com mensagem.
4. **`src/App.jsx`** — rotas. `AreaProtegida` manda para `/login` quem não está logado; `SomentePerfil` esconde `/usuarios` do Secretário. *Isso é só conforto visual: a proteção real é a API.*
5. **`pages/Turmas.jsx`** — os **cards clicáveis** (`<Link>` cobre o card inteiro). Botões Nova/Editar/Excluir só aparecem para o Admin Geral.
6. **`pages/TurmaAlunos.jsx`** — alunos da turma: busca (com *debounce* de 350 ms para não chamar a API a cada tecla), ordenação e filtro de status. Botões **Documentos / Editar / Excluir** por linha.
7. **`components/AlunoModal.jsx`** — formulário com os campos obrigatórios. O campo de data/ano **muda conforme o status** (Concluído → data de conclusão; os demais → ano). Ano letivo aparece travado: vem da turma.
8. **`components/DocumentosModal.jsx`** — o gerenciador de PDFs: lista, **Substituir**, **Excluir** e formulário de **Adicionar**. Valida tipo/tamanho no navegador (a API valida de novo).
9. **`pages/VisaoGeral.jsx`** — todos os alunos, com PDFs como links clicáveis, filtros por turma/status e a caixa **"Só quem está sem PDF"** (ótima para a secretaria cobrar pendências).
10. **`pages/Usuarios.jsx`** — Admin Geral cria usuários e (des)ativa acessos.

> Os links dos PDFs expiram em 30 minutos. Se a página ficar aberta por muito tempo e um link falhar, basta recarregar a lista.

---

## Passo 7 — Regras de segurança do Firebase

Como só a API acessa Firestore e Storage, as regras ficam **fechando tudo** para clientes (o Admin SDK ignora essas regras). Os arquivos `firestore.rules` e `storage.rules` já estão prontos.

**Jeito 1 — pelo console:** Firestore → aba *Regras* → cole o conteúdo de `firestore.rules` → *Publicar*. Repita em Storage → *Regras* com `storage.rules`.

**Jeito 2 — pela linha de comando:**
```bash
npm install -g firebase-tools
firebase login
firebase use --add            # escolha seu projeto
firebase deploy --only firestore:rules,storage
```

Sem esse passo, o projeto em "modo de produção" já vem fechado por padrão, mas **publique as regras para garantir**.

---

## Passo 8 — Roteiro de testes manual

Faça logo depois de subir tudo. Cada item mapeia uma regra do seu pedido.

**Perfis (regra 1)**
1. Entre como Admin Geral → vá em **Usuários** → crie um **Administrador Secretário**.
2. Saia e entre como o Secretário: o menu **não** mostra "Usuários"; nos cards de turma **não** há "Nova turma/Editar/Excluir".

**Turmas (regra 3)**
3. Como Admin Geral: crie `5º Ano A`, ano `2026`. Ela aparece como **card**.
4. Como Secretário: clique no card → abre a lista de alunos da turma.

**Aluno e status (regra 4)**
5. **Novo aluno**: tente salvar sem nome completo → erro. Preencha e escolha cada status e veja o campo mudar (data de conclusão / ano corrente / ano da interrupção).

**Documentos (regra 2)** — o teste mais importante
6. Cadastre um aluno **sem anexar nada**. A coluna Documentos mostra "Nenhum PDF".
7. Clique **Documentos** nele → envie um PDF → aparece na lista. ✅ (antes era impossível)
8. Tente enviar uma imagem ou `.docx` → deve ser recusado. Renomear um `.txt` para `.pdf` também é recusado.
9. **Substituir** o PDF e **Excluir** outro. Confira no Console → Storage que o arquivo antigo sumiu.

**Busca e ordem (regra 5)**
10. Cadastre 3–4 alunos. Alterne **A–Z / Mais recentes / Mais antigos**. Busque por `joao` e encontre "João".

**Visão geral (regra 6)**
11. Aba **Visão geral de alunos**: todos os alunos de todas as turmas, com os PDFs como links. Teste "Só quem está sem PDF".

---

## Passo 9 — Migrando do MySQL

Seus dados atuais precisam ser levados antes de desligar o MySQL:

1. **Faça backup completo** do MySQL (`mysqldump`) e mantenha-o somente-leitura até validar tudo.
2. Exporte as tabelas (alunos, turmas, documentos) para **JSON ou CSV**.
3. Escreva um script Node (em `backend/scripts/`) que, usando `db` e `bucket` de `src/firebase.js`:
   - crie as **turmas** primeiro e guarde o mapeamento `idAntigo → idNovo`;
   - crie cada **aluno** com `turmaId` novo, `nomeBusca = normalizar(nome)`, `status`/`anoStatus` conforme as regras do passo 4 e `documentos: []`;
   - para cada anexo antigo, **reaproveite `salvarPdf`** (de `services/storage.js`) e adicione o item em `documentos`.
4. Use `db.batch()` (até 500 operações por lote) para ir rápido.
5. Confira contagens (nº de alunos/turmas/PDFs antes × depois) e abra alguns alunos na tela.

Se quiser, me envie a estrutura das tabelas (nomes das colunas) e eu escrevo esse script de importação sob medida.

---

## Passo 10 — Publicar (deploy)

- **Frontend:** `cd frontend && npm run build` gera `dist/`. Hospede em Firebase Hosting, Vercel ou Netlify. Defina `VITE_API_URL=https://sua-api.com/api` antes do build.
- **Backend:** qualquer serviço Node (Cloud Run, Render, Railway…). Defina as variáveis do `.env` no painel do serviço; ajuste `CORS_ORIGINS` para o endereço do front. No Google Cloud Run dá para usar a identidade do próprio serviço em vez do arquivo `serviceAccountKey.json` (mais seguro) — nesse caso é preciso adaptar `src/firebase.js` para `admin.credential.applicationDefault()`.
- **Nunca** coloque `serviceAccountKey.json` no repositório ou na imagem pública.
- Use sempre **HTTPS** em produção.

---

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `Não foi possível ler a chave do Firebase` | Arquivo não está em `backend/serviceAccountKey.json` ou o caminho do `.env` está errado |
| Erro `5 NOT_FOUND` ao chamar a API | O Firestore ainda não foi criado (passo 2.3) |
| Erro de bucket / "The specified bucket does not exist" | `FIREBASE_STORAGE_BUCKET` incorreto ou Storage não ativado (passo 2.4) |
| Login funciona mas aparece "Este usuário não tem acesso ao sistema" | Usuário existe no Auth mas não em `usuarios`. Rode `npm run criar-admin` ou crie pela tela Usuários |
| `E-mail ou senha incorretos` | Credenciais erradas ou login por e-mail/senha não ativado (passo 2.2) |
| Erro de CORS no navegador | `CORS_ORIGINS` não inclui o endereço do front |
| Tela em branco / `auth/invalid-api-key` | `.env` do frontend vazio ou o servidor Vite não foi reiniciado após editar |
| Link do PDF para de abrir | Passaram 30 min; recarregue a lista |
| `EADDRINUSE` | Porta 3001 ocupada; mude `PORT` (e o proxy em `vite.config.js`) |

---

## Limites conhecidos e próximos passos

- **Escala:** busca e ordenação acontecem em memória na API. Funciona bem para centenas a poucos milhares de alunos. Se passar disso, o caminho é paginação (`limit` + cursores) e/ou serviço de busca.
- **Visão Geral** traz todos os alunos de uma vez; para volumes grandes, adicione paginação.
- **Transferir aluno de turma:** a API já aceita `turmaId` no `PUT /api/alunos/:id`, mas a tela de edição ainda não oferece o campo. Bom exercício: adicionar um `<select>` de turmas no `AlunoModal`.
- **Recuperação de senha:** o Firebase Auth tem `sendPasswordResetEmail`; dá para colocar um link "Esqueci a senha" na tela de login.
- **Limitar tentativas:** considere `express-rate-limit` na API.
- **Auditoria:** já guardamos quem criou e quando; um histórico de alterações é um bom próximo passo.
- **LGPD:** são dados pessoais de menores. Restrinja quem tem acesso ao console do Firebase, mantenha backups (exportação agendada do Firestore) e defina uma política de retenção.
- **Testes automatizados:** transforme o roteiro do passo 8 em testes (ex.: Vitest + Firebase Emulator Suite).
