import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Header from '../components/SiteHeader';
import LoginCard from '../components/LoginCard';



export default function Login() {
  const { usuario, carregando, erroAcesso, entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Se já estiver logado, redireciona para a home
  if (!carregando && usuario) return <Navigate to="/turmas" replace />;

  async function enviar(e) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
    } catch (err) {
      setErro(err.message);
    }
    setEnviando(false);
  }

  return (
    <div className="app-layout">
      {/* 1. Header no topo com a logo e menu de navegação */}
      <Header />

      {/* 2. Conteúdo central dividindo espaço entre o carrossel e o formulário */}
      <main className="main-content">

        <div className="login-section">
          <LoginCard 
            email={email}
            setEmail={setEmail}
            senha={senha}
            setSenha={setSenha}
            handleLogin={enviar}
            erro={erro || erroAcesso}
            enviando={enviando}
          />
        </div>
      </main>
    </div>
  );
}