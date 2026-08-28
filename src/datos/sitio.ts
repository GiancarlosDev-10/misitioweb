/**
 * Configuración central del sitio. Toda URL de contacto o red social vive aquí
 * y en ningún otro archivo.
 */
export const SITIO = {
  url: "https://giancarlosormeno.dev",
  nombre: "Giancarlos Ormeño",
  rol: "Full-Stack & Automation Developer",
  ubicacion: "Lima, Perú — remoto",
  email: "giangio237@gmail.com",
  telefono: "+51 947 466 978 — +51 939 378 048",
  telefonoEnlace: "+51947466978-+51939378048",
  whatsapp: "https://wa.me/51939378048",
  linkedin: "https://www.linkedin.com/in/giancarlos-ormeno",
  github: "https://github.com/GiancarlosDev-10",
  imagenOg: "/og/portada.png",
  cv: {
    es: "/cv/giancarlos-ormeno-cv-es.pdf",
    en: "/cv/giancarlos-ormeno-cv-en.pdf",
  },
} as const;

export const IDIOMAS = ["es", "en"] as const;
export type Idioma = (typeof IDIOMAS)[number];
export const IDIOMA_POR_DEFECTO: Idioma = "es";

/** Locale BCP-47 por idioma, para og:locale y hreflang. */
export const LOCALES: Record<Idioma, string> = {
  es: "es-PE",
  en: "en",
};

/** Ruta de una página en un idioma dado. El español vive en la raíz. */
export function rutaIdioma(idioma: Idioma, ruta = "/"): string {
  const limpia = ruta === "/" ? "" : ruta.replace(/^\/|\/$/g, "");
  if (idioma === IDIOMA_POR_DEFECTO) return limpia ? `/${limpia}` : "/";
  return limpia ? `/${idioma}/${limpia}` : `/${idioma}`;
}
