import { Link } from "react-router-dom";

export default function SiteHeader() {
  return (
    <header className="site-header">
      <a href="#inicio" className="site-logo">
        <img src="/logoCrescer.PNG" alt="Logo do Colégio Crescer" />
      </a>

      <nav className="site-nav">
        <Link to="/">Início</Link>
        <a href="#sobre">Sobre</a>
        <a href="#contato">Contato</a>
       
      </nav>
    </header>
  );
}