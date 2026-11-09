"""
Gera os ícones do app a partir do Caramelo, o mascote do login.

A geometria é a mesma de src/presentation/components/Caramelo.tsx (caixa de
120 unidades): cabeça, focinho, nariz, olhos e orelhas caídas. Mudou o
desenho lá? Ajuste aqui e rode de novo:

    python scripts/gerar-icones.py

Desenha em 4x e reduz, para as bordas saírem suaves. Só precisa do Pillow.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

ASSETS = Path(__file__).resolve().parent.parent / 'assets'

CAFE = (22, 16, 14, 255)          # colors.background #16100E
LARANJA = (255, 122, 69, 255)     # colors.primary #FF7A45
LARANJA_ESCURO = (226, 96, 46, 255)  # colors.primaryDark #E2602E
BEGE = (232, 213, 190, 255)       # colors.secondary #E8D5BE
TINTA = (26, 14, 8, 255)          # colors.onPrimary #1A0E08
SULCO = (201, 84, 42, 128)        # risco da orelha, #C9542A a 50%
BRANCO = (255, 255, 255, 255)
SS = 4  # supersampling

# Orelha esquerda (SVG 30x56): M23 2 C11 2 2 14 2.5 31 C3 45 8.5 55 16 54 C25 53 28.5 40 28 23 C27.7 12 27 2 23 2 Z
EAR = [((23, 2), (11, 2), (2, 14), (2.5, 31)), ((2.5, 31), (3, 45), (8.5, 55), (16, 54)),
       ((16, 54), (25, 53), (28.5, 40), (28, 23)), ((28, 23), (27.7, 12), (27, 2), (23, 2))]
EAR_GROOVE = [((20, 10), (13, 12), (9, 21), (10, 33))]


def bezier(segments, steps=32):
    points = []
    for p0, p1, p2, p3 in segments:
        for i in range(steps):
            t = i / steps
            u = 1 - t
            points.append((
                u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
            ))
    return points


def ear_points(side, segments):
    """Orelha posicionada como no componente: top 20, left/right -10, girada 10° para fora."""
    pts = bezier(segments)
    if side == -1:  # direita: espelhada
        pts = [(30 - x, y) for x, y in pts]
    left = -10 if side == 1 else 120 + 10 - 30
    origin = (30 * (0.75 if side == 1 else 0.25), 56 * 0.10)
    angle = math.radians(10 * side)
    cos, sin = math.cos(angle), math.sin(angle)
    out = []
    for x, y in pts:
        dx, dy = x - origin[0], y - origin[1]
        rx, ry = dx * cos - dy * sin + origin[0], dx * sin + dy * cos + origin[1]
        out.append((rx + left, ry + 20))
    return out


def draw_caramelo(img, scale, offset, silhouette=False):
    d = ImageDraw.Draw(img)
    S = lambda x, y: (offset[0] + x * scale, offset[1] + y * scale)
    box = lambda x0, y0, x1, y1: [*S(x0, y0), *S(x1, y1)]
    head = BRANCO if silhouette else LARANJA

    d.ellipse(box(2, 8, 118, 118), fill=head)
    if silhouette:
        # Monocromático (ícone temático do Android): só a forma, com olhos e nariz vazados.
        clear = (0, 0, 0, 0)
        d.ellipse(box(35, 50, 47, 62), fill=clear)
        d.ellipse(box(73, 50, 85, 62), fill=clear)
        d.rounded_rectangle(box(50, 73, 70, 86), radius=7 * scale, fill=clear)
    else:
        d.rounded_rectangle(box(29, 66, 91, 108), radius=21 * scale, fill=BEGE)
        d.rounded_rectangle(box(50, 73, 70, 86), radius=7 * scale, fill=TINTA)
        d.ellipse(box(35, 50, 47, 62), fill=TINTA)
        d.ellipse(box(73, 50, 85, 62), fill=TINTA)

    for side in (1, -1):
        d.polygon([S(x, y) for x, y in ear_points(side, EAR)], fill=BRANCO if silhouette else LARANJA_ESCURO)
        if not silhouette:
            groove = [S(x, y) for x, y in ear_points(side, EAR_GROOVE)]
            d.line(groove, fill=SULCO, width=round(2 * scale), joint='curve')


# Caixa do desenho com as orelhas: x de -12 a 132, y de 8 a 118.
DOG_W, DOG_H, DOG_X0, DOG_Y0 = 144, 110, -12, 8


def render(size, dog_width_ratio, background=None, silhouette=False):
    big = size * SS
    img = Image.new('RGBA', (big, big), background or (0, 0, 0, 0))
    scale = big * dog_width_ratio / DOG_W
    offset = ((big - DOG_W * scale) / 2 - DOG_X0 * scale, (big - DOG_H * scale) / 2 - DOG_Y0 * scale)
    draw_caramelo(img, scale, offset, silhouette)
    return img.resize((size, size), Image.LANCZOS)


def main():
    # iOS e geral: fundo café cheio (o sistema recorta os cantos).
    render(1024, 0.70, CAFE).convert('RGB').save(ASSETS / 'icon.png')
    # Android adaptativo: o desenho cabe na zona segura (círculo de 66/108 do lado).
    render(512, 0.54).save(ASSETS / 'android-icon-foreground.png')
    Image.new('RGBA', (512, 512), CAFE).save(ASSETS / 'android-icon-background.png')
    render(432, 0.54, silhouette=True).save(ASSETS / 'android-icon-monochrome.png')
    # Splash e web.
    render(1024, 0.62).save(ASSETS / 'splash-icon.png')
    render(48, 0.86, CAFE).save(ASSETS / 'favicon.png')
    print('Ícones gerados em', ASSETS)


if __name__ == '__main__':
    main()
