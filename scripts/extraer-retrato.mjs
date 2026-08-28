/**
 * Extrae un retrato real a una nube de puntos normalizada (0-1), igual que
 * extraer-silueta.mjs pero por CONTORNOS (Sobel) en vez de umbral plano de
 * oscuridad. Una foto de estudio no es un logo binario: el fondo gris y las
 * sombras de la cara caen en el mismo rango de gris, así que un umbral
 * simple mezcla ambos. Los bordes (cambios de intensidad) sí separan cara,
 * pelo y saco del fondo, que es liso.
 *
 * Uso:
 *   node scripts/extraer-retrato.mjs <entrada> <salida.json> [--ancho=200] [--umbral=45] [--blur=2.2]
 *     [--recorte=x0,y0,x1,y1] [--fusion=otro.json]
 *
 * --recorte: fracciones (0-1) del cuadro ORIGINAL a procesar — para tratar
 *   una zona (ej. la cara) con su propio ancho/blur/umbral sin afectar el
 *   resto. Los puntos resultantes igual quedan en el espacio 0-1 del cuadro
 *   completo, no del recorte.
 * --fusion: une los puntos nuevos con los de un JSON ya generado (por
 *   ejemplo, el del cuerpo completo) y escribe el combinado en <salida.json>.
 *
 * Ejemplos:
 *   node scripts/extraer-retrato.mjs "scripts/referencias/FOTO PERFIL.jpeg" src/datos/retrato-puntos.json
 *   node scripts/extraer-retrato.mjs "scripts/referencias/FOTO PERFIL.jpeg" src/datos/retrato-puntos.json \
 *     --recorte=0.27,0.02,0.72,0.40 --ancho=420 --blur=0.9 --umbral=28 --fusion=src/datos/retrato-cuerpo.json
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";

const argumentos = process.argv.slice(2);
const posicionales = argumentos.filter((a) => !a.startsWith("--"));
const banderas = Object.fromEntries(
  argumentos
    .filter((a) => a.startsWith("--"))
    .map((a) => a.slice(2).split("="))
);

const [entrada, salida] = posicionales;

if (!entrada || !salida) {
  console.error(
    "Uso: node scripts/extraer-retrato.mjs <entrada> <salida.json> [--ancho=200] [--umbral=45] [--blur=2.2] [--recorte=x0,y0,x1,y1] [--fusion=otro.json]"
  );
  process.exit(1);
}

const ANCHO_MUESTREO = Number(banderas.ancho) || 200;
const UMBRAL = Number(banderas.umbral) || 45;
const DESENFOQUE = banderas.blur !== undefined ? Number(banderas.blur) : 2.2;
const RECORTE = banderas.recorte ? banderas.recorte.split(",").map(Number) : null;

let pipeline = sharp(entrada).grayscale();

if (RECORTE) {
  const [x0, y0, x1, y1] = RECORTE;
  const { width: anchoOriginal, height: altoOriginal } = await sharp(entrada).metadata();
  pipeline = pipeline.extract({
    left: Math.round(x0 * anchoOriginal),
    top: Math.round(y0 * altoOriginal),
    width: Math.round((x1 - x0) * anchoOriginal),
    height: Math.round((y1 - y0) * altoOriginal),
  });
}

// El desenfoque previo apaga la textura fina de la tela (que si no, genera
// ruido de bordes en todo el saco) sin perder el contorno de cara/pelo/saco.
// En zonas sin esa textura (ej. la cara sola) conviene mucho menos desenfoque.
const base = pipeline.resize({ width: ANCHO_MUESTREO }).blur(DESENFOQUE);

const GX = { width: 3, height: 3, kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1], offset: 128 };
const GY = { width: 3, height: 3, kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1], offset: 128 };

const [rx, ry] = await Promise.all([
  base.clone().convolve(GX).raw().toBuffer({ resolveWithObject: true }),
  base.clone().convolve(GY).raw().toBuffer({ resolveWithObject: true }),
]);

const { width, height } = rx.info;
const puntosLocales = [];

for (let i = 0; i < width * height; i++) {
  const gx = rx.data[i] - 128;
  const gy = ry.data[i] - 128;
  const magnitud = Math.sqrt(gx * gx + gy * gy);
  if (magnitud > UMBRAL) {
    puntosLocales.push([(i % width) / width, Math.floor(i / width) / height]);
  }
}

// Si vino de un --recorte, los puntos están en el espacio 0-1 del recorte:
// se reproyectan al espacio 0-1 del cuadro completo antes de guardar/fusionar.
const redondear = (n) => Math.round(n * 1000) / 1000;
const puntosNuevos = RECORTE
  ? puntosLocales.map(([xn, yn]) => [
      redondear(RECORTE[0] + xn * (RECORTE[2] - RECORTE[0])),
      redondear(RECORTE[1] + yn * (RECORTE[3] - RECORTE[1])),
    ])
  : puntosLocales.map(([xn, yn]) => [redondear(xn), redondear(yn)]);

let salidaFinal = { ancho: width, alto: height, puntos: puntosNuevos };

if (banderas.fusion) {
  const base = JSON.parse(readFileSync(banderas.fusion, "utf8"));
  salidaFinal = { ancho: base.ancho, alto: base.alto, puntos: [...base.puntos, ...puntosNuevos] };
}

writeFileSync(salida, JSON.stringify(salidaFinal));
console.log(
  `${puntosNuevos.length} puntos nuevos (total ${salidaFinal.puntos.length}) escritos en ${salida} (muestreo ${width}x${height}, umbral ${UMBRAL}${RECORTE ? ", recorte " + banderas.recorte : ""})`
);
