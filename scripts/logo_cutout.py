import sys
from collections import deque
from PIL import Image


def cutout(src, dst, thresh, width, corner=None):
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    if corner:
        cx, cy = corner
        for y in range(h):
            for x in range(w):
                if x / cx + y / cy < 1.08:
                    px[x, y] = (0, 0, 0, 255)
    lum = [[max(px[x, y][:3]) for x in range(w)] for y in range(h)]
    bg = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if lum[y][x] < thresh and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if lum[y][x] < thresh and not bg[y][x]:
                bg[y][x] = True
                q.append((x, y))
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not bg[ny][nx] and lum[ny][nx] < thresh:
                bg[ny][nx] = True
                q.append((nx, ny))
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if bg[y][x]:
                px[x, y] = (r, g, b, 0)
            else:
                near_bg = any(
                    0 <= x + dx < w and 0 <= y + dy < h and bg[y + dy][x + dx]
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                )
                if near_bg and lum[y][x] < thresh + 40:
                    px[x, y] = (r, g, b, int(255 * (lum[y][x] - thresh + 40) / 80))
    im = im.crop(im.getbbox())
    cw, ch = im.size
    im = im.resize((width, int(ch * width / cw)), Image.LANCZOS)
    im.save(dst, optimize=True)
    print(dst, im.size)


if __name__ == "__main__":
    base = "/app/client/public/"
    cutout(base + "_logo.jpg", base + "gorillacc-logo-transparent.png", 45, 640, corner=(335, 245))
    cutout(base + "_eye.jpg", base + "gorillacc-eye-transparent.png", 60, 512)
