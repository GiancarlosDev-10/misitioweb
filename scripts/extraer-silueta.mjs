/**
 * Extrae una silueta real (imagen con fondo blanco) a una nube de puntos
 * normalizada (0-1), para renderizarla como puntos en canvas — sin dibujar
 * el trazo a mano. Usa sharp (ya es dependencia del proyecto).
 *
 * Uso: node scripts/extraer-silueta.mjs <entrada> <salida.json> [ancho] [--voltear]
 * Ejemplo: node scripts/extraer-silueta.mjs scripts/referencias/f16nuevo.png src/datos/avion-puntos.json 160 --voltear
 *
 * La imagen de entrada debe ser una silueta sólida (oscura), con fondo
 * blanco o transparente, ya recortada a la forma que quieras (usa un editor
 * de imágenes o `sharp().extract()` a mano si la fuente tiene varias vistas).
 * `--voltear` la espeja horizontalmente (útil si la nariz mira al lado
 * contrario al que necesitás).
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2).filter((a) => a !== "--voltear");
const voltear = process.argv.includes("--voltear");
const [entrada, salida, anchoArg] = args;

if (!entrada || !salida) {
  console.error("Uso: node scripts/extraer-silueta.mjs <entrada> <salida.json> [ancho=80] [--voltear]");
  process.exit(1);
}

const ANCHO_MUESTREO = Number(anchoArg) || 80;
const UMBRAL = 140;

let pipeline = sharp(entrada)
  .flatten({ background: "#ffffff" }) // por si la fuente tiene transparencia en vez de fondo blanco
  .trim({ threshold: 10 });

if (voltear) pipeline = pipeline.flop();

const { data, info } = await pipeline
  .resize({ width: ANCHO_MUESTREO, fit: "inside" })
  .grayscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

const puntos = [];
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[y * info.width + x] < UMBRAL) {
      puntos.push([Math.round((x / info.width) * 1000) / 1000, Math.round((y / info.height) * 1000) / 1000]);
    }
  }
}

writeFileSync(salida, JSON.stringify({ ancho: info.width, alto: info.height, puntos }));
console.log(`${puntos.length} puntos escritos en ${salida} (muestreo ${info.width}x${info.height})`);
