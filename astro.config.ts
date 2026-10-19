import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

import { SITIO } from "./src/datos/sitio";

export default defineConfig({
  site: SITIO.url,
  trailingSlash: "never",
  build: {
    inlineStylesheets: "always",
  },
  integrations: [
    sitemap({
      // Fecha del build: con el redeploy diario, Google ve que el contenido
      // (calendario de GitHub, workflows de n8n) cambió y vuelve a rastrear.
      lastmod: new Date(),
      i18n: {
        defaultLocale: "es",
        locales: { es: "es-PE", en: "en" },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
