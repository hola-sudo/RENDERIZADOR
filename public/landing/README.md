# Imágenes y videos de la landing

Los archivos ya están generados a partir de los originales de `public/RENDERS/`
(esa carpeta está en `.gitignore`: pesa ~328 MB y no se publica).

Si falta algún archivo la landing dibuja un marcador neutro en su lugar,
no se rompe nada. Los nombres se configuran en `components/landing/content.ts`.

## Imágenes de sección

| Archivo           | Dónde sale                     | Origen                    |
|-------------------|--------------------------------|---------------------------|
| hero.jpg          | Imagen grande del hero         | F1.png                    |
| proceso.jpg       | Sección "Proceso"              | F2.png                    |
| tool-render.jpg   | Pestaña "Render Fijo"          | F3.png                    |
| tool-video.jpg    | Pestaña "Recorrido Virtual"    | MB2.png                   |
| tool-history.jpg  | Pestaña "Historial"            | MB1.png                   |

## Galería (collage con hover)

Cada caso necesita **el mismo encuadre** en las dos versiones: el render y
el modelo 3D del que salió. El hover intercambia una por otra.

| Caso        | Render (`-render.jpg`) | Modelo 3D (`-modelo.jpg`) | Recorrido (`/video/`) |
|-------------|------------------------|---------------------------|-----------------------|
| fachada-1   | F1.png                 | MODELO FACHADA 24.04.png  | fachada-1.mp4         |
| fachada-2   | F2.png                 | MODELO FACHADA 24.056.png | fachada-2.mp4         |
| fachada-3   | F3.png                 | MODELO FACHADA 24.05.png  | fachada-3.mp4         |
| interior-1  | MB1.png                | MASTER BEDROOM 23.05.png  | interior-1.mp4        |
| interior-2  | MB2.png                | MASTER BEDROOM 23.06.png  | —                     |

## Cómo regenerar las imágenes

Desde la raíz del proyecto, con los originales en `public/RENDERS/`:

```sh
sips -s format jpeg -s formatOptions 78 -Z 1400 \
  "public/RENDERS/F1.png" --out "public/landing/galeria/fachada-1-render.jpg"
```

Galería y pestañas a 1400–1600 px, hero a 2000 px. Calidad 78–80.

## Videos

Son las salidas de 8 s en 1080p de la plataforma. **Pesan entre 20 y 30 MB cada
uno y conviene recomprimirlos** (H.264 CRF 28 o WebM) antes de publicar:

```sh
ffmpeg -i entrada.mp4 -vcodec libx264 -crf 28 -preset slow -an salida.mp4
```

Mientras tanto se cargan con `preload` del navegador solo al pulsar play,
así que no afectan la carga inicial de la página.
