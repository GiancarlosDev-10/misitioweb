import es from "./es.json";
import en from "./en.json";

import { IDIOMAS, IDIOMA_POR_DEFECTO, type Idioma } from "../datos/sitio";

/** El español es la fuente de verdad: cualquier idioma nuevo copia su forma. */
export type Contenido = typeof es;

const CONTENIDO: Record<Idioma, Contenido> = { es, en };

export function contenido(idioma: Idioma): Contenido {
  return CONTENIDO[idioma];
}

export function esIdioma(valor: string | undefined): valor is Idioma {
  return IDIOMAS.includes(valor as Idioma);
}

/** Idioma de la URL actual. La raíz es español; `/en/...` es inglés. */
export function idiomaDeUrl(url: URL): Idioma {
  const [primero] = url.pathname.split("/").filter(Boolean);
  return esIdioma(primero) ? primero : IDIOMA_POR_DEFECTO;
}

export function otroIdioma(idioma: Idioma): Idioma {
  return idioma === "es" ? "en" : "es";
}
