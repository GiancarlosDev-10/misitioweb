import type { APIRoute } from "astro";

import { SITIO } from "../datos/sitio";

export const GET: APIRoute = () =>
  new Response(
    [
      "User-agent: *",
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /admin/",
      "Disallow: /_astro/",
      "Disallow: /*?*",
      "",
      `Sitemap: ${SITIO.url}/sitemap-index.xml`,
      "",
    ].join("\n"),
    { headers: { "content-type": "text/plain; charset=utf-8" } }
  );
