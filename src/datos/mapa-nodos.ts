/**
 * Traducción de tipos de nodo de n8n a etiquetas legibles.
 * Los badges de tecnología de cada workflow se derivan de aquí, nunca se
 * escriben a mano por proyecto.
 */
const MAPA: Record<string, string> = {
  "n8n-nodes-base.whatsApp": "WhatsApp",
  "n8n-nodes-base.whatsAppTrigger": "WhatsApp",
  "@n8n/n8n-nodes-langchain.toolCode": "Herramienta personalizada",
  "n8n-nodes-base.googleSheetsTool": "Google Sheets (tool)",
  "n8n-nodes-base.telegram": "Telegram",
  "n8n-nodes-base.telegramTrigger": "Telegram",
  "@n8n/n8n-nodes-langchain.agent": "AI Agent",
  "@n8n/n8n-nodes-langchain.lmChatOpenAi": "OpenAI",
  "@n8n/n8n-nodes-langchain.openAi": "OpenAI",
  "n8n-nodes-base.openAi": "OpenAI",
  "@n8n/n8n-nodes-langchain.memoryBufferWindow": "Memoria conversacional",
  "@n8n/n8n-nodes-langchain.toolWorkflow": "Tool calling",
  "@n8n/n8n-nodes-langchain.toolHttpRequest": "Tool calling",
  "@n8n/n8n-nodes-langchain.outputParserStructured": "Salida estructurada",
  "@n8n/n8n-nodes-langchain.chainLlm": "OpenAI",
  "n8n-nodes-base.googleSheets": "Google Sheets",
  "n8n-nodes-base.googleDrive": "Google Drive",
  "n8n-nodes-base.googleDocs": "Google Docs",
  "n8n-nodes-base.gmail": "Gmail",
  "n8n-nodes-base.httpRequest": "REST API",
  "n8n-nodes-base.webhook": "Webhooks",
  "n8n-nodes-base.code": "Custom JS",
  "n8n-nodes-base.supabase": "Supabase",
  "n8n-nodes-base.mongoDb": "MongoDB",
  "n8n-nodes-base.postgres": "PostgreSQL",
  "n8n-nodes-base.executeCommand": "Shell",
  "n8n-nodes-base.scheduleTrigger": "Scheduling",
  "n8n-nodes-base.cron": "Scheduling",
};

/** Tipos que son plomería del flujo y no aportan información al lector. */
const IGNORADOS = new Set([
  "n8n-nodes-base.set",
  "n8n-nodes-base.if",
  "n8n-nodes-base.switch",
  "n8n-nodes-base.merge",
  "n8n-nodes-base.noOp",
  "n8n-nodes-base.stickyNote",
  "n8n-nodes-base.splitInBatches",
  "n8n-nodes-base.splitOut",
  "n8n-nodes-base.filter",
  "n8n-nodes-base.wait",
  "n8n-nodes-base.limit",
  "n8n-nodes-base.aggregate",
  "n8n-nodes-base.manualTrigger",
  "n8n-nodes-base.executeWorkflowTrigger",
  "n8n-nodes-base.stopAndError",
  "n8n-nodes-base.errorTrigger",
]);

/** Fallback legible para cualquier tipo que no esté mapeado. */
function derivarEtiqueta(tipo: string): string {
  const cola = tipo.split(".").pop() ?? tipo;
  const palabras = cola
    .replace(/Trigger$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  if (!palabras) return tipo;
  return palabras.charAt(0).toUpperCase() + palabras.slice(1);
}

export function etiquetaDeNodo(tipo: string): string | null {
  if (IGNORADOS.has(tipo)) return null;
  return MAPA[tipo] ?? derivarEtiqueta(tipo);
}

/** Etiquetas únicas de un conjunto de tipos, en orden de aparición. */
export function etiquetasDeTipos(tipos: readonly string[]): string[] {
  const vistas = new Set<string>();
  for (const tipo of tipos) {
    const etiqueta = etiquetaDeNodo(tipo);
    if (etiqueta) vistas.add(etiqueta);
  }
  return [...vistas];
}
