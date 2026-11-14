import { useEffect, useRef, useState } from "react";

export default function SiteSection({ id, as: Tag = "section", className = "", children }) {
  const ref = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag id={id} ref={ref} className={`${className} fade-in ${show ? "show" : ""}`}>
      {children}
    </Tag>
  );
}