# Portafolio — Giancarlos Ormeño

Mi sitio web en Español por defecto en `/`, inglés en `/en`.

Los conteos de workflows, los nodos y los badges de tecnología **no están escritos a mano**:
se leen en build time desde los JSON públicos de
[GiancarlosDev-10/n8n-workflows](https://github.com/GiancarlosDev-10/n8n-workflows).

## Documentación de origen

`docs/` guarda el material con el que se construyó el sitio, para que cualquier cambio posterior
mantenga el mismo criterio:

- `BRIEF.md` — brief del proyecto: audiencias, contenido, arquitectura y requisitos. Fuente de verdad.
- `AARU.md` — sistema de diseño de referencia (color, tipografía, densidad, movimiento).
- `GIGA.md` — referencia de arquitectura de información, solo estructura.
- `PLAN-DISENO.md` — plan de diseño, autocrítica y los datos que se verificaron o se descartaron.

## Requisitos

- [Bun](https://bun.sh) >= 1.3

## Comandos

```bash
bun install
bun run dev        # servidor de desarrollo
bun run build      # build estático a dist/
bun run preview    # sirve dist/
bun run typecheck  # astro check
```

## Cómo funcionan los datos de n8n

`src/datos/n8n.ts` resuelve los workflows con este orden de preferencia:

1. `.cache/n8n.json` — JSON crudo descargado, válido 12 h (no se versiona).
2. Descarga desde `raw.githubusercontent.com`.
3. `src/datos/instantanea-n8n.json` — instantánea versionada, último recurso si GitHub falla.

La caché guarda el JSON **crudo**, no el análisis: editar `src/datos/mapa-nodos.ts` cambia los
badges en el siguiente build sin borrar nada.

Para agregar un workflow: una entrada en `REGISTRO_WORKFLOWS` con `id`, `caso`, `nombre` y `ruta`.
Todo lo demás (nodos, topología, tecnologías) sale del JSON.

## Cómo agregar un idioma

1. Copiar `src/i18n/es.json` a `src/i18n/<código>.json` y traducir el contenido.
2. Registrarlo en `IDIOMAS` y `LOCALES` en `src/datos/sitio.ts`, y en `CONTENIDO` en `src/i18n/index.ts`.
3. Crear `src/pages/<código>/index.astro` copiando `src/pages/en/index.astro`.

Ningún componente necesita cambios: `hreflang`, canonical, sitemap y el selector de idioma
salen de esa configuración.

## Assets de marca

`python3 scripts/generar-imagenes.py` regenera la imagen Open Graph (1200×630), el favicon ICO y
el apple touch icon a partir de las fuentes en `public/fuentes` y los datos de los workflows.
Solo hace falta correrlo cuando cambia el copy de la portada.

## Deploy

Salida estática. En Vercel: framework Astro, sin configuración extra; `vercel.json` fija
`cleanUrls` y desactiva la barra final para que las canonical coincidan con las URLs servidas.

Antes del primer deploy, cambiar `SITIO.url` en `src/datos/sitio.ts` al dominio definitivo:
de ahí salen canonical, `hreflang`, sitemap, JSON-LD, `robots.txt` y `llms.txt`.
