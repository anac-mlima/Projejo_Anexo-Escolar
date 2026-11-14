import { Router } from 'express';
import { lerToken, PASTA_ARQUIVOS } from '../services/storage.js';

/**
 * Entrega o PDF a quem tem um link temporário válido (gerado por quem estava logado).
 * É pública de propósito: o navegador abre links <a href> sem enviar o token de login,
 * então a segurança está na assinatura + validade de 30 minutos do link.
 */
const router = Router();

router.get('/:token', (req, res) => {
  const dados = lerToken(req.params.token);
  if (!dados) {
    return res.status(403).json({ erro: 'Link inválido ou expirado. Recarregue a página para gerar um novo.' });
  }

  const nome = String(dados.n || 'documento.pdf').replace(/[\r\n"]/g, '');
  res.sendFile(
    dados.c,
    {
      root: PASTA_ARQUIVOS, // com "root", o Express impede sair da pasta
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(nome)}`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    },
    (erro) => {
      if (erro && !res.headersSent) res.status(404).json({ erro: 'Arquivo não encontrado.' });
    },
  );
});

export default router;
