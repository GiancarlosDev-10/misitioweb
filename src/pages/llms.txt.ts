import type { APIRoute } from "astro";

import { SITIO } from "../datos/sitio";
import { obtenerResumen } from "../datos/n8n";
import { contenido } from "../i18n";

/** Resumen legible por crawlers de IA. Los números salen del mismo build. */
export const GET: APIRoute = async () => {
  const { workflows, totalWorkflows, totalNodos, tecnologias } = await obtenerResumen();
  const t = contenido("es");

  const cuerpo = [
    `# ${SITIO.nombre}`,
    "",
    `> ${SITIO.rol} en ${SITIO.ubicacion}. ${t.meta.descripcion}`,
    "",
    "## Qué hace",
    "",
    "- Desarrollo full-stack de productos web (Next.js, Astro, TypeScript).",
    "- Automatización de procesos de negocio con n8n e IA (OpenAI, Telegram, Google Workspace, Supabase).",
    "- Integración de IA en producto: agentes con tool calling, transcripción de audio y salida estructurada validada.",
    "",
    "## Evidencia verificable",
    "",
    ...t.proyectos.lista.map(
      (proyecto) =>
        `- ${proyecto.titulo}: ${proyecto.resultado}${proyecto.urlVivo ? ` (${proyecto.urlVivo})` : ""}`
    ),
    "",
    `## Automatizaciones publicadas (${totalWorkflows} workflows, ${totalNodos} nodos)`,
    "",
    ...workflows.map((workflow) => `- ${workflow.nombre.es} — ${workflow.nodos} nodos — ${workflow.urlRaw}`),
    "",
    `Tecnologías detectadas en los workflows: ${tecnologias.join(", ")}.`,
    "",
    "## Contacto",
    "",
    `- Email: ${SITIO.email}`,
    `- Teléfono: ${SITIO.telefono}`,
    `- LinkedIn: ${SITIO.linkedin}`,
    `- GitHub: ${SITIO.github}`,
    "",
  ].join("\n");

  return new Response(cuerpo, { headers: { "content-type": "text/plain; charset=utf-8" } });
};
