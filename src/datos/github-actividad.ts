import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { SITIO } from "./sitio";

// Mismo patrón que n8n.ts: caché de build + instantánea versionada como
// respaldo si GitHub no responde. Sin token — ambos endpoints son públicos.
const RAIZ = process.cwd();
const RUTA_CACHE = resolve(RAIZ, ".cache/github.json");
const RUTA_INSTANTANEA = resolve(RAIZ, "src/datos/instantanea-github.json");
const VIGENCIA_CACHE_MS = 1000 * 60 * 60 * 12;

const USUARIO = new URL(SITIO.github).pathname.replace(/^\//, "");
// Endpoint público que usa el propio github.com para pintar el calendario
// del perfil — no es la API oficial (esa exige token vía GraphQL), pero es
// la misma fuente que ve cualquier visitante del perfil.
const URL_CONTRIBUCIONES = `https://github.com/users/${USUARIO}/contributions`;
const URL_PERFIL = `https://api.github.com/users/${USUARIO}`;

export interface DiaContribucion {
  fecha: string;
  conteo: number;
  nivel: number;
}

export interface ActividadGithub {
  dias: DiaContribucion[];
  totalContribuciones: number;
  rachaMaxima: number;
  repositoriosPublicos: number;
}

/** Lee cada celda del calendario y cruza su conteo real con el tool-tip asociado. */
function extraerDias(html: string): DiaContribucion[] {
  const celdas = html.match(/<td\b[^>]*class="ContributionCalendar-day"[^>]*>/g) ?? [];
  const porId = new Map<string, { fecha: string; nivel: number }>();

  for (const celda of celdas) {
    const id = celda.match(/\sid="([^"]+)"/)?.[1];
    const fecha = celda.match(/\sdata-date="([^"]+)"/)?.[1];
    const nivel = celda.match(/\sdata-level="([^"]+)"/)?.[1];
    if (id && fecha && nivel) porId.set(id, { fecha, nivel: Number(nivel) });
  }

  const conteoPorId = new Map<string, number>();
  for (const [, id, texto] of html.matchAll(/<tool-tip[^>]*\sfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const numero = texto.trim().match(/^(\d+)/)?.[1];
    if (numero) conteoPorId.set(id, Number(numero));
  }

  return [...porId.entries()]
    .map(([id, { fecha, nivel }]) => ({ fecha, nivel, conteo: conteoPorId.get(id) ?? 0 }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/** Racha máxima = la corrida más larga de días consecutivos con actividad. */
function calcularRachaMaxima(dias: DiaContribucion[]): number {
  let maxima = 0;
  let corrida = 0;
  for (const dia of dias) {
    corrida = dia.conteo > 0 ? corrida + 1 : 0;
    if (corrida > maxima) maxima = corrida;
  }
  return maxima;
}

async function leerJson<T>(ruta: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(ruta, "utf8")) as T;
  } catch {
    return null;
  }
}

/** Escribir caché/instantánea es una optimización: si el disco es de solo lectura, se sigue. */
async function guardar(ruta: string, contenido: string): Promise<void> {
  try {
    await mkdir(dirname(ruta), { recursive: true });
    await writeFile(ruta, contenido);
  } catch (error) {
    console.warn(`[github] no se pudo escribir ${ruta}: ${(error as Error).message}`);
  }
}

async function descargar(): Promise<ActividadGithub> {
  const [respuestaContribuciones, respuestaPerfil] = await Promise.all([
    fetch(URL_CONTRIBUCIONES, { headers: { "Accept-Language": "en-US,en;q=0.9" } }),
    fetch(URL_PERFIL, { headers: { Accept: "application/vnd.github+json" } }),
  ]);

  if (!respuestaContribuciones.ok) {
    throw new Error(`GitHub respondió ${respuestaContribuciones.status} para el calendario de contribuciones`);
  }

  const dias = extraerDias(await respuestaContribuciones.text());
  if (dias.length === 0) throw new Error("No se pudo leer ningún día del calendario de contribuciones");

  const perfil = respuestaPerfil.ok ? ((await respuestaPerfil.json()) as { public_repos?: number }) : {};

  return {
    dias,
    totalContribuciones: dias.reduce((suma, dia) => suma + dia.conteo, 0),
    rachaMaxima: calcularRachaMaxima(dias),
    repositoriosPublicos: perfil.public_repos ?? 0,
  };
}

let enCurso: Promise<ActividadGithub> | null = null;

/**
 * Actividad de GitHub resuelta en build time.
 */
export function obtenerActividadGithub(): Promise<ActividadGithub> {
  enCurso ??= (async () => {
    const cache = await leerJson<{ generado: number; datos: ActividadGithub }>(RUTA_CACHE);
    if (cache?.datos && Date.now() - cache.generado < VIGENCIA_CACHE_MS) {
      return cache.datos;
    }

    try {
      const datos = await descargar();
      await guardar(RUTA_CACHE, JSON.stringify({ generado: Date.now(), datos }));
      await guardar(RUTA_INSTANTANEA, `${JSON.stringify(datos, null, 2)}\n`);
      return datos;
    } catch (error) {
      const instantanea = await leerJson<ActividadGithub>(RUTA_INSTANTANEA);
      if (instantanea && instantanea.dias.length > 0) {
        console.warn(`[github] usando la instantánea versionada: ${(error as Error).message}`);
        return instantanea;
      }
      throw error;
    }
  })();
  return enCurso;
}
