# CCH Player

Reproductor multimedia con programación temporal

## 📋 Descripción

Aplicación de escritorio desarrollada con Electron para reproducir contenido multimedia con programación temporal.

## 🚀 Instalación

### Requisitos
- Node.js v20.13.1 o superior
- npm o yarn

### Pasos

1. Clonar el repositorio:
```bash
git clone [URL_DEL_REPOSITORIO]
cd CCH-Player-Recuperado
```

2. Instalar dependencias:
```bash
npm install
```

3. Ejecutar en modo desarrollo:
```bash
npm start
```

## 🛠️ Compilación

Para compilar la aplicación para Windows:

```bash
npm run build-win
```

Los archivos compilados se generarán en la carpeta `dist/`.

## 📦 Estructura del Proyecto

```
CCH Player-Recuperado/
├── assets/          # Iconos y recursos
├── ffmpeg/          # Binarios de FFmpeg
├── fonts/           # Fuentes
├── main.js          # Proceso principal de Electron
├── renderer.js      # Proceso de renderizado
├── index.html       # Interfaz principal
└── package.json     # Configuración del proyecto
```

## 📝 Notas

- Los datos de la aplicación se guardan en: `C:\Users\[Usuario]\Documents\cch_player`
- Asegúrate de tener el icono `assets/icon.ico` antes de compilar

## 📄 Licencia

MIT

