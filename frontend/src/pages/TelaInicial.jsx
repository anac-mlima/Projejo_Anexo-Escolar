import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import SiteSection from "../components/SiteSection";
import SiteFooter from "../components/SiteFooter";
import Carrossel from "../components/Carrossel";
import { FaBook, FaChalkboardTeacher, FaSchool } from "react-icons/fa";


const features = [
  { icone: FaBook, titulo: "Educação de Qualidade", texto: "Metodologias modernas para potencializar o aprendizado." },
  { icone: FaChalkboardTeacher, titulo: "Professores Capacitados", texto: "Equipe experiente e apaixonada por ensinar." },
  { icone: FaSchool, titulo: "Infraestrutura Completa", texto: "Salas equipadas, laboratórios e espaços interativos." },
];

const icones = [
  { img: "/img/icone11.png", nome: "Salas de Aula" },
  { img: "/img/icone33.png", nome: "Ateliê e Laboratório" },
  { img: "/img/icone44.png", nome: "Esportes" },
  { img: "/img/icone11.png", nome: "Atividades Complementares" },
];

const fotos = ["/img/escola1.jpg", "/img/escola2.jpg", "/img/escola3.jpeg"];

export default function TelaInicial() {
  return (
    <>
      <SiteHeader />

      <section className="hero" id="inicio">
        <div className="hero-content">
          <h2>Bem-vindo ao Colégio Crescer</h2>
          <p>Educação para transformar vidas</p>
          <Link to="/login" className="btn">Login</Link>
        </div>
      </section>

      <SiteSection id="sobre" className="section">
        <h2>Por que escolher o Colégio Crescer?</h2>
        <div className="features">
          {features.map(({ icone: Icone, titulo, texto }) => (
            <div key={titulo} className="feature">
              <Icone size={32} color="#2563eb" />
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <SiteSection id="diferenciais" className="section">
        <div className="image-text">
          <div className="text">
            <h2>A liberdade de inventar o futuro</h2>
            <div className="icones">
              {icones.map((item) => (
                <div className="box" key={item.nome}>
                  <img src={item.img} alt={item.nome} />
                  <span>{item.nome}</span>
                </div>
              ))}
            </div>
          </div>
          <Carrossel imagens={fotos} />
        </div>
      </SiteSection>

      <SiteSection id="contato" className="containerloc">
        <div className="conteudo-principal">
          <h2>LOCALIZAÇÃO ESTRATÉGICA</h2>
          <p>
            O Colégio Crescer fica localizado perto da Avenida Hélio Prates e da
            estação Ceilândia Centro.
          </p>
          <div className="mapa">
            <iframe
              title="Mapa do Colégio Crescer"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3838.6003709765027!2d-48.11929132486938!3d-15.825012284819666!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x935bccf9e6aa9f3f%3A0x560c3abeed39ada2!2sCol%C3%A9gio%20Crescer%20-%20Escola%20de%20Educa%C3%A7%C3%A3o%20Infantil%20em%20Ceil%C3%A2ndia!5e0!3m2!1spt-BR!2sbr!4v1744315074803!5m2!1spt-BR!2sbr"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </SiteSection>

      <SiteFooter />
    </>
  );
}