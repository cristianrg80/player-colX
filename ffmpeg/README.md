# FFmpeg para CCH Player

## Instrucciones para incluir FFmpeg en el instalador

1. Descarga FFmpeg para Windows desde: https://ffmpeg.org/download.html
2. Extrae el archivo `ffmpeg.exe` (versión estática recomendada)
3. Coloca `ffmpeg.exe` en esta carpeta (`ffmpeg/`)
4. La estructura debe ser:
   ```
   ffmpeg/
     └── ffmpeg.exe
   ```

## Nota

- El instalador incluirá automáticamente `ffmpeg.exe` en los recursos de la app
- En desarrollo, la app buscará FFmpeg en el PATH del sistema
- En producción, la app usará el FFmpeg incluido en los recursos

