import { useEffect, useState } from "react";


export default function Carrossel({ imagens, intervalo = 4000 }) {
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndice((i) => (i + 1) % imagens.length);
    }, intervalo);
    return () => clearInterval(id);
  }, [imagens.length, intervalo]);

  return (
    <div className="carousel">
      {imagens.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={`Foto ${i + 1}`}
          className={i === indice ? "active" : ""}
        />
      ))}
    </div>
  );
}