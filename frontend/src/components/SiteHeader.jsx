import { Link } from "react-router-dom";
import "./Header.css";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link to="/" className="site-logo">
        <img src="/logoCrescer.PNG" alt="Logo do Colégio Crescer" />
      </Link>

      <nav className="nav-links">
        <a href="/#inicio">Início</a>
        <a href="/#sobre">Sobre</a>
        <a href="/#contato">Contato</a>
        <Link to="/login" className="nav-login-btn">
          Login
        </Link>
      </nav>
    </header>
  );
}