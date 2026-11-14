import SiteSection from "./SiteSection";
import { FaFacebookF, FaInstagram, FaWhatsapp } from "react-icons/fa";

export default function SiteFooter() {
  return (
    <SiteSection as="footer" className="site-footer">
      <div className="footer-conteudo">
        <div className="footer-contato">
          <h3>Colégio Crescer</h3>
          <p>Próximo à Av. Hélio Prates e à estação Ceilândia Centro.</p>
        </div>

        <ul className="redes">
          <li>
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebookF />
            </a>
          </li>
          <li>
            <a href="https://www.instagram.com/colegiocrescerdf/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram />
            </a>
          </li>
          <li>
            <a href="#" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <FaWhatsapp />
            </a>
          </li>
        </ul>
      </div>

      <p className="footer-copy">
        Imagens utilizadas com autorização dos autores. © 2025 Colégio Crescer.
      </p>
    </SiteSection>
  );
}