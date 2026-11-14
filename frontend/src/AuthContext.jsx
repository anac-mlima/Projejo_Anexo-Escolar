import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';
import { auth } from './firebase';

const Contexto = createContext(null);
export const useAuth = () => useContext(Contexto);

const MENSAGENS = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-disabled': 'Este usuário está desativado.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
};

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null); // { uid, nome, email, perfil }
  const [carregando, setCarregando] = useState(true);
  const [erroAcesso, setErroAcesso] = useState('');

  // Dispara ao abrir o site (restaura sessão) e a cada login/logout.
  useEffect(() => {
    return onAuthStateChanged(auth, async (usuarioFirebase) => {
      if (!usuarioFirebase) {
        setUsuario(null);
        setCarregando(false);
        return;
      }
      setCarregando(true);
      try {
        // O perfil mora no Firestore; só a API (com a chave de serviço) consegue ler.
        setUsuario(await api.get('/me'));
        setErroAcesso('');
      } catch (erro) {
        setErroAcesso(erro.message);
        await signOut(auth);
        setUsuario(null);
      }
      setCarregando(false);
    });
  }, []);

  async function entrar(email, senha) {
    setErroAcesso('');
    try {
      await signInWithEmailAndPassword(auth, email, senha);
    } catch (erro) {
      throw new Error(MENSAGENS[erro.code] || 'Não foi possível entrar. Tente novamente.');
    }
  }

  const sair = () => signOut(auth);

  return (
    <Contexto.Provider value={{ usuario, carregando, erroAcesso, entrar, sair }}>{children}</Contexto.Provider>
  );
}
