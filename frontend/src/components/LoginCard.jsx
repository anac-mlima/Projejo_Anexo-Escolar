import React from 'react';
import './LoginCard.css';

export default function LoginCard({ email, setEmail, senha, setSenha, handleLogin, erro }) {
  return (
    <div className="login-card">
      <div className="login-header-box">
        <h2>Sistema Escolar</h2>
        <p>Entre com seu e-mail e senha.</p>
      </div>

      {erro && <div className="erro-msg">{erro}</div>}

      <form onSubmit={handleLogin} className="login-form">
        <label>E-mail</label>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="seu.email@escola.com"
          required 
        />

        <label>Senha</label>
        <input 
          type="password" 
          value={senha} 
          onChange={(e) => setSenha(e.target.value)} 
          placeholder="********"
          required 
        />

        <button type="submit" className="btn-entrar">Entrar</button>
      </form>
    </div>
  );
}