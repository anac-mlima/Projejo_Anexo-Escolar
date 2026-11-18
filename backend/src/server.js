import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import './firebase.js';
import { autenticar } from './middleware/auth.js';
import alunosRouter from './routes/alunos.js';
import arquivosRouter from './routes/arquivos.js';
import turmasRouter from './routes/turmas.js';
import usuariosRouter from './routes/usuarios.js';
import { HttpError } from './utils/erros.js';
import frequenciaRouter from './routes/frequencia.js';
import professoresRouter from './routes/professores.js';


const app = express();

app.use(helmet());
app.use(cors({ origin: (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',') }));
app.use(express.json());

/**
 * Entrega o PDF somente para quem:
 *   1) está logado (o middleware `autenticar` já rodou antes desta rota), e
 *   2) tem um link assinado e ainda válido (30 minutos).
 * O front-end baixa o arquivo com o cabeçalho Authorization (veja `abrirPdf` em api.js).
 */

app.get('/api/saude', (req, res) => res.json({ ok: true }));


// A partir daqui TUDO exige login.
app.use('/api', autenticar);

// PDFs: exigem o token de login E um link assinado válido.
app.use('/api/arquivos', arquivosRouter);

app.get('/api/me', (req, res) => {
  const { uid, nome, email, perfil } = req.usuario;
  res.json({ uid, nome, email, perfil });
});

app.use('/api/turmas', turmasRouter);
app.use('/api/alunos', alunosRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/professores', professoresRouter);
app.use('/api/frequencia', frequenciaRouter);

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// Tratamento central de erros (o Express 5 já encaminha erros de funções async para cá).
// eslint-disable-next-line no-unused-vars
app.use((erro, req, res, next) => {
  if (erro instanceof HttpError) {
    return res.status(erro.status).json({ erro: erro.message, detalhes: erro.detalhes });
  }
  if (erro instanceof multer.MulterError) {
    const mensagem = erro.code === 'LIMIT_FILE_SIZE' ? 'O PDF excede o limite de 10 MB.' : 'Falha no envio do arquivo.';
    return res.status(400).json({ erro: mensagem });
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const porta = process.env.PORT || 3001;
app.listen(porta, () => console.log(`API rodando em http://localhost:${porta}`));
