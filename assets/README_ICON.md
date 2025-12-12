# Icono para CCH Player

## 📋 Requisitos del Icono

### Para Windows (.ico):
- **Formato:** .ico (debe contener múltiples tamaños)
- **Tamaños incluidos:** 16x16, 32x32, 48x48, 64x64, 128x128, 256x256 píxeles
- **Imagen base recomendada:** 256x256 o 512x512 píxeles (el generador creará todos los tamaños)
- **Archivo:** `icon.ico`
- **Ubicación:** `assets/icon.ico`

### Para Linux y Ventanas en Ejecución (.png):
- **Formato:** .png
- **Tamaño:** **512x512 píxeles** (tamaño único requerido)
- **Archivo:** `icon.png`
- **Ubicación:** `assets/icon.png`

## 🎨 Creación del Icono

### Opción 1: Usar un generador online
1. Ir a: https://www.icoconverter.com/
2. Subir una imagen (PNG, JPG, etc.)
3. Descargar el archivo .ico generado
4. Guardar como `assets/icon.ico`

### Opción 2: Usar GIMP (gratuito)
1. Abrir GIMP
2. Crear nueva imagen 256x256 píxeles
3. Diseñar el icono
4. Exportar como .ico

### Opción 3: Usar Paint.NET
1. Crear imagen 256x256 píxeles
2. Diseñar el icono
3. Guardar como .ico

## 📁 Estructura Requerida

```
assets/
├── icon.ico    ← Para Windows
├── icon.png    ← Para Linux
└── README_ICON.md
```

## ⚠️ Importante

**Sin el icono, la compilación fallará.** Asegúrate de crear ambos archivos antes de compilar.

## 🚀 Después de Crear el Icono

Una vez que tengas los iconos:
```bash
npm run build-win
```

La compilación debería funcionar correctamente.
