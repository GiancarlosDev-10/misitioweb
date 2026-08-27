"""Genera los assets estáticos de marca: OG image, favicon ICO y apple touch icon.

Se ejecuta a mano cuando cambia el copy de la portada; el resultado queda
versionado en public/. Requiere Pillow y fontTools (con brotli) solo en local.
"""

import json
import pathlib
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

RAIZ = pathlib.Path(__file__).resolve().parent.parent
PUBLICO = RAIZ / "public"
FUENTES = PUBLICO / "fuentes"

VACIO = (0, 0, 0)
ESCARCHA = (255, 255, 255)
CENIZA = (186, 186, 186)
HUMO = (157, 157, 157)
LIMA = (166, 255, 26)


def ttf(nombre: str) -> pathlib.Path:
    """Convierte el WOFF2 variable a TTF temporal para que Pillow lo lea."""
    from fontTools.ttLib import TTFont

    destino = pathlib.Path(tempfile.gettempdir()) / f"{nombre}.ttf"
    if not destino.exists():
        fuente = TTFont(FUENTES / f"{nombre}.woff2")
        fuente.flavor = None
        fuente.save(destino)
    return destino


def workflows() -> list[dict]:
    """Workflows resueltos por el build; sin ellos la imagen sale sin campo."""
    for ruta in (RAIZ / ".cache" / "n8n.json", RAIZ / "src" / "datos" / "instantanea-n8n.json"):
        if not ruta.exists():
            continue
        datos = json.loads(ruta.read_text())
        lista = datos["workflows"] if isinstance(datos, dict) else datos
        if lista:
            return lista
    return []


def nodos() -> list[tuple[float, float]]:
    datos = workflows()
    puntos: list[tuple[float, float]] = []
    for indice, workflow in enumerate(datos):
        cx = (indice % 3) / 2
        cy = (indice // 3) / 2
        for punto in workflow["puntos"]:
            puntos.append((cx * 0.8 + punto["x"] * 0.2, cy * 0.8 + punto["y"] * 0.2))
    return puntos


def ligera(fuente: ImageFont.FreeTypeFont, peso: int) -> ImageFont.FreeTypeFont:
    """Fija el eje de peso de la fuente variable: Aaru es tipografía ligera."""
    try:
        fuente.set_variation_by_axes([peso])
    except OSError:
        pass
    return fuente


def og() -> None:
    ancho, alto = 1200, 630
    lienzo = Image.new("RGB", (ancho, alto), VACIO)
    dibujo = ImageDraw.Draw(lienzo)

    for x, y in nodos():
        # El campo respira alrededor del texto: nada de puntos detrás del nombre.
        if 0.34 < y < 0.86 and x < 0.62:
            continue
        px = 60 + x * (ancho - 120)
        py = 60 + y * (alto - 120)
        dibujo.rectangle([px, py, px + 2, py + 2], fill=(74, 74, 74))

    dibujo.rectangle([0, 0, ancho - 1, alto - 1], outline=(36, 36, 36))

    display = ligera(ImageFont.truetype(str(ttf("general-sans-variable")), 62), 340)
    cuerpo = ligera(ImageFont.truetype(str(ttf("inter-variable")), 26), 360)
    leyenda = ligera(ImageFont.truetype(str(ttf("inter-variable")), 20), 400)

    dibujo.text((72, 300), "Giancarlos Ormeño", font=display, fill=ESCARCHA)
    dibujo.text((72, 388), "Full-Stack & Automation Developer", font=cuerpo, fill=CENIZA)
    lista = workflows()
    total_nodos = sum(workflow["nodos"] for workflow in lista)
    dibujo.text(
        (72, 470),
        f"{len(lista)} workflows en producción · {total_nodos} nodos auditables · Lima, Perú",
        font=leyenda,
        fill=HUMO,
    )
    dibujo.rectangle([72, 262, 96, 266], fill=LIMA)

    salida = PUBLICO / "og"
    salida.mkdir(parents=True, exist_ok=True)
    lienzo.save(salida / "portada.png", optimize=True)


def iconos() -> None:
    tamano = 512
    lienzo = Image.new("RGBA", (tamano, tamano), (0, 0, 0, 255))
    dibujo = ImageDraw.Draw(lienzo)
    fuente = ligera(ImageFont.truetype(str(ttf("general-sans-variable")), 300), 400)
    dibujo.text((tamano / 2, tamano / 2 + 10), "G", font=fuente, fill=LIMA, anchor="mm")

    lienzo.convert("RGB").resize((180, 180), Image.LANCZOS).save(PUBLICO / "apple-touch-icon.png")
    lienzo.save(PUBLICO / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])


if __name__ == "__main__":
    if not (FUENTES / "inter-variable.woff2").exists():
        sys.exit("Faltan las fuentes en public/fuentes")
    og()
    iconos()
    subprocess.run(["ls", "-la", str(PUBLICO)], check=False)
