import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { etiquetasDeTipos } from "./mapa-nodos";
import type { Idioma } from "./sitio";

// El módulo también corre desde dist durante el prerender: la raíz es el cwd.
const RAIZ = process.cwd();
const RUTA_CACHE = resolve(RAIZ, ".cache/n8n.json");
const RUTA_INSTANTANEA = resolve(RAIZ, "src/datos/instantanea-n8n.json");
const BASE_RAW = "https://raw.githubusercontent.com/GiancarlosDev-10/n8n-workflows/main";
const BASE_REPO = "https://github.com/GiancarlosDev-10/n8n-workflows/blob/main";
const VIGENCIA_CACHE_MS = 1000 * 60 * 60 * 12;

/**
 * Registro de los workflows publicados. Solo la ruta y el caso de estudio al
 * que pertenecen se declaran acá: conteo de nodos, tecnologías y topología
 * salen del JSON en build time.
 */
export const REGISTRO_WORKFLOWS = [
  {
    id: "colegio-profesores-notas",
    caso: "colegio",
    nombre: { es: "Bot de consulta de notas · docentes", en: "Grade lookup bot · teachers" },
    ruta: "sistema-bots-colegio/bot-profesores-notas.json",
  },
  {
    id: "colegio-padres-notificacion",
    caso: "colegio",
    nombre: { es: "Notificación de asistencia · apoderados", en: "Attendance notification · parents" },
    ruta: "sistema-bots-colegio/bot-padres-notificacion.json",
  },
  {
    id: "colegio-manual-ayuda",
    caso: "colegio",
    nombre: { es: "Bot de ayuda del sistema (texto y audio)", en: "System help bot (text and voice)" },
    ruta: "sistema-bots-colegio/bot-manual-ayuda.json",
  },
  {
    id: "colegio-padres-vinculacion",
    caso: "colegio",
    nombre: { es: "Vinculación de apoderados por DNI", en: "Parent linking by national ID" },
    ruta: "sistema-bots-colegio/bot-padres-vinculacion.json",
  },
  {
    id: "cotizaciones-principal",
    caso: "workflows",
    nombre: { es: "Cotizador inmobiliario · flujo principal", en: "Real-estate quoting bot · main flow" },
    ruta: "bot-cotizaciones-inmobiliarias/cotizador-principal.json",
  },
  {
    id: "cotizaciones-audio",
    caso: "workflows",
    nombre: { es: "Cotizador inmobiliario · con audio", en: "Real-estate quoting bot · voice input" },
    ruta: "bot-cotizaciones-inmobiliarias/cotizador-con-audio.json",
  },
  {
    id: "instagram-analytics",
    caso: "workflows",
    nombre: { es: "Analytics de Instagram · +400 publicaciones", en: "Instagram analytics · 400+ posts" },
    ruta: "pablo-instagram-analytics/workflow.json",
  },
  {
    id: "karlant-informes",
    caso: "workflows",
    nombre: { es: "Informes médicos con GPT-4o", en: "KARLANT · medical reports with GPT-4o" },
    ruta: "karlant-informes-medicos/workflow.json",
  },
  {
    id: "karlant-sigeps",
    caso: "workflows",
    nombre: { es: "Descarga masiva de documentos sector salud", en: "KARLANT · SIGEPS bulk download" },
    ruta: "karlant-sigeps-pdfs/workflow.json",
  },
] as const;

export type IdWorkflow = (typeof REGISTRO_WORKFLOWS)[number]["id"];

export interface NodoWorkflow {
  x: number;
  y: number;
  tipo: string;
}

export interface Workflow {
  id: IdWorkflow;
  caso: string;
  nombre: Record<Idioma, string>;
  ruta: string;
  urlRaw: string;
  urlRepo: string;
  nodos: number;
  tecnologias: string[];
  /** Coordenadas propias del workflow, normalizadas a 0–1 para el canvas. */
  puntos: NodoWorkflow[];
  /** Pares de índices de `puntos` conectados entre sí. */
  aristas: [number, number][];
}

interface NodoCrudo {
  type?: unknown;
  position?: unknown;
  name?: unknown;
}

interface WorkflowCrudo {
  nodes?: unknown;
  connections?: unknown;
}

function esNodoValido(nodo: unknown): nodo is NodoCrudo {
  return typeof nodo === "object" && nodo !== null;
}

function leerPosicion(posicion: unknown): [number, number] {
  if (Array.isArray(posicion) && typeof posicion[0] === "number" && typeof posicion[1] === "number") {
    return [posicion[0], posicion[1]];
  }
  return [0, 0];
}

function normalizar(valores: number[]): number[] {
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min;
  if (rango === 0) return valores.map(() => 0.5);
  return valores.map((valor) => (valor - min) / rango);
}

function analizar(
  { id, caso, nombre, ruta }: (typeof REGISTRO_WORKFLOWS)[number],
  crudo: WorkflowCrudo
): Workflow {
  const nodosCrudos = Array.isArray(crudo.nodes) ? crudo.nodes.filter(esNodoValido) : [];
  const tipos = nodosCrudos.map((nodo) => (typeof nodo.type === "string" ? nodo.type : "desconocido"));
  const posiciones = nodosCrudos.map((nodo) => leerPosicion(nodo.position));
  const xs = normalizar(posiciones.map(([x]) => x));
  const ys = normalizar(posiciones.map(([, y]) => y));

  const indicePorNombre = new Map<string, number>();
  nodosCrudos.forEach((nodo, indice) => {
    if (typeof nodo.name === "string") indicePorNombre.set(nodo.name, indice);
  });

  const aristas: [number, number][] = [];
  const conexiones = crudo.connections;
  if (typeof conexiones === "object" && conexiones !== null) {
    for (const [origen, salidas] of Object.entries(conexiones as Record<string, unknown>)) {
      const desde = indicePorNombre.get(origen);
      if (desde === undefined || typeof salidas !== "object" || salidas === null) continue;
      for (const grupo of Object.values(salidas as Record<string, unknown>)) {
        if (!Array.isArray(grupo)) continue;
        for (const rama of grupo) {
          if (!Array.isArray(rama)) continue;
          for (const destino of rama) {
            const nombre =
              typeof destino === "object" && destino !== null && typeof (destino as { node?: unknown }).node === "string"
                ? (destino as { node: string }).node
                : null;
            if (!nombre) continue;
            const hasta = indicePorNombre.get(nombre);
            if (hasta !== undefined) aristas.push([desde, hasta]);
          }
        }
      }
    }
  }

  return {
    id,
    caso,
    nombre: { ...nombre },
    ruta,
    urlRaw: `${BASE_RAW}/${ruta}`,
    urlRepo: `${BASE_REPO}/${ruta}`,
    nodos: nodosCrudos.length,
    tecnologias: etiquetasDeTipos(tipos),
    puntos: nodosCrudos.map((_, indice) => ({ x: xs[indice], y: ys[indice], tipo: tipos[indice] })),
    aristas,
  };
}

async function leerJson<T>(ruta: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(ruta, "utf8")) as T;
  } catch {
    return null;
  }
}

async function descargar(): Promise<Record<string, WorkflowCrudo>> {
  const descargas = await Promise.all(
    REGISTRO_WORKFLOWS.map(async (entrada) => {
      const respuesta = await fetch(`${BASE_RAW}/${entrada.ruta}`);
      if (!respuesta.ok) throw new Error(`GitHub respondió ${respuesta.status} para ${entrada.ruta}`);
      return [entrada.id, (await respuesta.json()) as WorkflowCrudo] as const;
    })
  );
  return Object.fromEntries(descargas);
}

function analizarTodos(crudos: Record<string, WorkflowCrudo>): Workflow[] {
  return REGISTRO_WORKFLOWS.map((entrada) => analizar(entrada, crudos[entrada.id] ?? {}));
}

/** Escribir caché es una optimización: si el disco es de solo lectura, se sigue. */
async function guardar(ruta: string, contenido: string): Promise<void> {
  try {
    await mkdir(dirname(ruta), { recursive: true });
    await writeFile(ruta, contenido);
  } catch (error) {
    console.warn(`[n8n] no se pudo escribir ${ruta}: ${(error as Error).message}`);
  }
}

let enCurso: Promise<Workflow[]> | null = null;

/**
 * Workflows resueltos en build time.
 */
export function obtenerWorkflows(): Promise<Workflow[]> {
  enCurso ??= (async () => {
    // La caché guarda el JSON crudo, no el análisis: cambiar el mapa de nodos
    // se refleja en el siguiente build sin tener que invalidarla a mano.
    const cache = await leerJson<{ generado: number; crudos: Record<string, WorkflowCrudo> }>(RUTA_CACHE);
    if (cache?.crudos && Date.now() - cache.generado < VIGENCIA_CACHE_MS) {
      return analizarTodos(cache.crudos);
    }

    try {
      const crudos = await descargar();
      const workflows = analizarTodos(crudos);
      await guardar(RUTA_CACHE, JSON.stringify({ generado: Date.now(), crudos }));
      await guardar(RUTA_INSTANTANEA, `${JSON.stringify(workflows, null, 2)}\n`);
      return workflows;
    } catch (error) {
      const instantanea = await leerJson<Workflow[]>(RUTA_INSTANTANEA);
      if (instantanea && instantanea.length > 0) {
        console.warn(`[n8n] usando la instantánea versionada: ${(error as Error).message}`);
        return instantanea;
      }
      throw error;
    }
  })();
  return enCurso;
}

export interface ResumenWorkflows {
  workflows: Workflow[];
  totalWorkflows: number;
  totalNodos: number;
  tecnologias: string[];
}

export async function obtenerResumen(): Promise<ResumenWorkflows> {
  const workflows = await obtenerWorkflows();
  return {
    workflows,
    totalWorkflows: workflows.length,
    totalNodos: workflows.reduce((suma, workflow) => suma + workflow.nodos, 0),
    tecnologias: [...new Set(workflows.flatMap((workflow) => workflow.tecnologias))].sort(),
  };
}

export async function workflowsDelCaso(caso: string): Promise<Workflow[]> {
  return (await obtenerWorkflows()).filter((workflow) => workflow.caso === caso);
}
