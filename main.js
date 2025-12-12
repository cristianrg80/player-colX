
const { app, BrowserWindow, dialog, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

// =========================
// RUTAS BASE DE DATOS (DOCUMENTOS DEL USUARIO)
// =========================

// Devuelve la carpeta base donde se guardará toda la data del player
// Ejemplo: C:\Users\USUARIO\Documents\cch_player
function getBaseDataPath() {
  try {
    const documentsPath = app.getPath('documents');
    const basePath = path.join(documentsPath, 'cch_player');

    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    return basePath;
  } catch (error) {
    // Si falla por alguna razón, como último recurso usar el directorio actual
    const fallbackPath = path.join(process.cwd(), 'cch_player');
    if (!fs.existsSync(fallbackPath)) {
      fs.mkdirSync(fallbackPath, { recursive: true });
    }
    return fallbackPath;
  }
}

// Crear carpeta de programación si no existe
function ensureProgramacionFolder() {
  const basePath = getBaseDataPath();
  const programacionPath = path.join(basePath, 'programacion');
  const videosPath = path.join(programacionPath, 'videos');
  
  if (!fs.existsSync(programacionPath)) {
    fs.mkdirSync(programacionPath, { recursive: true });
    // // console.log('Carpeta de programación creada:', programacionPath);
  }
  
  if (!fs.existsSync(videosPath)) {
    fs.mkdirSync(videosPath, { recursive: true });
    // // console.log('Carpeta de videos creada:', videosPath);
  }
  
  return { programacionPath, videosPath };
}

// Crear carpeta de audios si no existe
function ensureAudiosFolder() {
  const basePath = getBaseDataPath();
  const audiosFolder = path.join(basePath, 'audios');
  if (!fs.existsSync(audiosFolder)) {
    fs.mkdirSync(audiosFolder, { recursive: true });
    // // console.log('Carpeta de audios creada:', audiosFolder);
  }
  return audiosFolder;
}

// Crear carpeta de música si no existe
function ensureMusicFolder() {
  const basePath = getBaseDataPath();
  const musicFolder = path.join(basePath, 'music');
  if (!fs.existsSync(musicFolder)) {
    fs.mkdirSync(musicFolder, { recursive: true });
    // // console.log('Carpeta de música creada:', musicFolder);
  }
  return musicFolder;
}

// Crear carpeta de videos "sueltos" si no existe
function ensureVideosFolder() {
  const basePath = getBaseDataPath();
  const videosFolder = path.join(basePath, 'videos');
  if (!fs.existsSync(videosFolder)) {
    fs.mkdirSync(videosFolder, { recursive: true });
    // // console.log('Carpeta de videos creada:', videosFolder);
  }
  return videosFolder;
}

// Crear carpeta de logs si no existe
function ensureLogsFolder() {
  const basePath = getBaseDataPath();
  const logsFolder = path.join(basePath, 'logs');
  if (!fs.existsSync(logsFolder)) {
    fs.mkdirSync(logsFolder, { recursive: true });
    // // console.log('Carpeta de logs creada:', logsFolder);
  }
  return logsFolder;
}

// Obtener fecha actual en formato dd-mm-yyyy
function getCurrentDateString() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
}

// Obtener hora actual en formato 24hs (HH:MM)
function getCurrentTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Convertir segundos a formato hh:mm:ss
function secondsToTimeFormat(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  
  return `${hh}:${mm}:${ss}`;
}

// Crear archivo de log diario si no existe
function createDailyLogFile() {
  try {
    const logsFolder = ensureLogsFolder();
    const dateString = getCurrentDateString();
    const logFileName = `${dateString}.txt`;
    const logFilePath = path.join(logsFolder, logFileName);
    
    // Solo crear el archivo si no existe
    if (!fs.existsSync(logFilePath)) {
      const header = `# Log diario CCH Player - ${dateString}\n`;
      const formatInfo = `# Formato: dd-mm-yyyy; HH:MM; nombre_video; hh:mm:ss\n`;
      const separator = `# ===========================================\n`;
      
      const initialContent = header + formatInfo + separator;
      fs.writeFileSync(logFilePath, initialContent, 'utf8');
      
      // // console.log('Archivo de log diario creado:', logFilePath);
    }
  } catch (error) {
    // // console.error('Error creando archivo de log diario:', error);
  }
}

// Registrar video reproducido en el log diario
function logVideoPlayed(videoName, duration) {
  try {
    
    const logsFolder = ensureLogsFolder();
    const dateString = getCurrentDateString();
    const timeString = getCurrentTimeString();
    const durationString = secondsToTimeFormat(duration);
    
    const logFileName = `${dateString}.txt`;
    const logFilePath = path.join(logsFolder, logFileName);
    
    // Formato: dd-mm-yyyy; HH:MM; nombre_video; hh:mm:ss
    const logEntry = `${dateString};${timeString};${videoName};${durationString}\n`;
    
    // Agregar entrada al archivo de log
    fs.appendFileSync(logFilePath, logEntry, 'utf8');
    
  } catch (error) {
    // // console.error('Error registrando video en log:', error);
  }
}

// Crear todos los directorios necesarios al inicio
function ensureAllDirectories() {
  
  // Crear directorio programacion y programacion/videos
  const { programacionPath, videosPath } = ensureProgramacionFolder();
  
  // Crear directorio audios
  const audiosFolder = ensureAudiosFolder();
  
  // Crear directorio música
  const musicFolder = ensureMusicFolder();
  
  // Crear directorio videos
  const videosFolder = ensureVideosFolder();
  
  // Crear directorio logs
  const logsFolder = ensureLogsFolder();
  
}

// Cargar proyecto desde directorio fijo
function loadProjectFromProgramacion() {
  try {
    const { programacionPath } = ensureProgramacionFolder();
    
    // Buscar archivos JSON en el directorio programacion
    const files = fs.readdirSync(programacionPath);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      return { success: false, error: 'No hay archivos JSON en el directorio programacion' };
    }
    
    // Usar el primer archivo JSON encontrado
    const jsonFile = jsonFiles[0];
    const jsonPath = path.join(programacionPath, jsonFile);
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const projectData = JSON.parse(jsonContent);
    
    // Actualizar las rutas de los videos para que apunten al directorio fijo
    if (projectData.blocks) {
      projectData.blocks.forEach(block => {
        if (block.items) {
          block.items.forEach(item => {
            if (item.type === 'video' && item.file) {
              // Actualizar la ruta del video para que apunte al directorio fijo
              item.relativePath = `videos/${item.file}`;
            }
          });
        }
      });
    }
    
    return {
      success: true,
      data: projectData,
      projectPath: programacionPath,
      jsonFile: jsonFile
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

let mainWindow;
let secondWindow;

function createWindow() {
  // Obtener información de las pantallas
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Buscar pantalla secundaria (no principal)
  let targetDisplay = primaryDisplay;
  if (displays.length > 1) {
    // Buscar el primer monitor que NO sea el principal
    for (let i = 0; i < displays.length; i++) {
      if (displays[i].id !== primaryDisplay.id) {
        targetDisplay = displays[i];
        // console.log('Pantalla secundaria detectada para player:', targetDisplay.label);
        break;
      }
    }
    // Si no se encontró ninguno diferente, usar el segundo (índice 1) como fallback
    if (targetDisplay.id === primaryDisplay.id && displays.length > 1) {
      targetDisplay = displays[1];
    }
  } else {
    // console.log('Solo hay una pantalla disponible, usando pantalla principal');
  }

  // Determinar si hay pantalla secundaria
  const hasSecondaryScreen = displays.length > 1;
  
  // Crear la ventana del navegador
  const windowOptions = {
    width: 1200,
    height: 800,
    x: targetDisplay.bounds.x + 100,
    y: targetDisplay.bounds.y + 100,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: false // DevTools deshabilitado
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Player - Reproductor Multimedia',
    autoHideMenuBar: true,
    fullscreenable: true
  };

  // Si hay pantalla secundaria, configurar para pantalla completa
  if (hasSecondaryScreen) {
    windowOptions.fullscreen = true;
    windowOptions.frame = false; // Sin marco
    windowOptions.resizable = false; // No redimensionable
    windowOptions.maximizable = false; // No maximizable
    windowOptions.minimizable = false; // No minimizable
    windowOptions.closable = false; // No cerrable
    windowOptions.alwaysOnTop = true; // Siempre por encima
    windowOptions.skipTaskbar = true; // No aparecer en la barra de tareas
    windowOptions.kiosk = true; // Modo kiosco (pantalla completa sin barras)
    windowOptions.show = false; // No mostrar hasta que esté listo
    windowOptions.focusable = true; // Puede recibir foco
    windowOptions.alwaysOnTop = 'screen-saver'; // Nivel más alto de alwaysOnTop
    windowOptions.webPreferences.devTools = false; // DevTools deshabilitado
    // Usar toda la resolución de la pantalla secundaria (incluyendo área de barra de tareas)
    windowOptions.width = targetDisplay.size.width;
    windowOptions.height = targetDisplay.size.height;
    windowOptions.x = targetDisplay.bounds.x;
    windowOptions.y = targetDisplay.bounds.y;
    // // console.log('Configurando para pantalla completa en pantalla secundaria');
  } else {
    // // console.log('Configurando ventana normal en pantalla principal');
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Centrar la ventana solo si no está en pantalla completa
  if (!hasSecondaryScreen) {
    mainWindow.setBounds({
      x: targetDisplay.bounds.x + Math.round((targetDisplay.bounds.width - 1200) / 2),
      y: targetDisplay.bounds.y + Math.round((targetDisplay.bounds.height - 800) / 2),
      width: 1200,
      height: 800
    });
  }

  // Cargar el archivo HTML
  mainWindow.loadFile('index.html');

  // DevTools deshabilitados - atajos de teclado removidos

  // Mostrar la ventana cuando esté lista (especialmente importante para modo kiosk)
  mainWindow.once('ready-to-show', () => {
    if (hasSecondaryScreen) {
      // Configurar adicionalmente para modo kiosk
      // Para Windows 11, usar configuración más agresiva para ocultar barra de tareas
      
      // Ocultar cursor con setIgnoreMouseEvents (pero permitir eventos)
      mainWindow.setIgnoreMouseEvents(false, { forward: true });
      
      // Configurar ventana para cubrir toda la pantalla antes de mostrar
      mainWindow.setBounds({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.size.width,
        height: targetDisplay.size.height
      });
      
      // Activar modo kiosk PRIMERO (esto debería ocultar la barra de tareas en Windows)
      mainWindow.setKiosk(true);
      
      // Pequeño delay para asegurar que Windows procese el modo kiosk
      setTimeout(() => {
        // Configuraciones adicionales después de activar kiosk
        mainWindow.setFullScreen(true);
        mainWindow.setSimpleFullScreen(true); // Modo fullscreen simple (más agresivo)
        mainWindow.setAlwaysOnTop(true, 'screen-saver');
        mainWindow.setSkipTaskbar(true);
        mainWindow.setMenuBarVisibility(false);
        
        // Forzar tamaño completo nuevamente
        mainWindow.setContentSize(targetDisplay.size.width, targetDisplay.size.height);
        mainWindow.setBounds({
          x: targetDisplay.bounds.x,
          y: targetDisplay.bounds.y,
          width: targetDisplay.size.width,
          height: targetDisplay.size.height
        });
        
        mainWindow.show();
        mainWindow.focus();
        
        // DevTools deshabilitado
        // mainWindow.webContents.openDevTools();
        
        // Reforzar modo kiosk después de mostrar
        setTimeout(() => {
          mainWindow.setKiosk(true);
          mainWindow.setSimpleFullScreen(true);
          // Asegurar que no hay márgenes - usar coordenadas de la pantalla objetivo
          mainWindow.setBounds({
            x: targetDisplay.bounds.x,
            y: targetDisplay.bounds.y,
            width: targetDisplay.size.width,
            height: targetDisplay.size.height
          });
        }, 50);
      }, 150);
      // // console.log('Ventana principal mostrada en modo kiosk');
    } else {
      mainWindow.show();
      // DevTools deshabilitado
      // mainWindow.webContents.openDevTools();
      // // console.log('Ventana principal mostrada en modo normal');
    }
  });

  // Habilitar acceso a herramientas de desarrollador
  // mainWindow.webContents.on('before-input-event', (event, input) => {
  //   // Bloquear F12 y Ctrl+Shift+I
  //   if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
  //     event.preventDefault();
  //   }
  // });

  // Deshabilitar menú contextual (clic derecho)
  mainWindow.webContents.on('context-menu', (event) => {
    event.preventDefault();
  });

  // Prevenir que la ventana principal se cierre solo si está en pantalla completa
  mainWindow.on('close', (event) => {
    if (hasSecondaryScreen) {
      // En pantalla completa, siempre prevenir el cierre
      event.preventDefault();
      // // console.log('Intento de cerrar ventana principal bloqueado (pantalla completa)');
    } else if (secondWindow && !secondWindow.isDestroyed()) {
      // En ventana normal, solo prevenir si el panel está abierto
      event.preventDefault();
      // // console.log('Intento de cerrar ventana principal bloqueado (panel abierto)');
    } else {
      // // console.log('Panel de control cerrado, permitiendo cierre del reproductor');
    }
  });

  // Emitido cuando la ventana es cerrada (no debería ocurrir)
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Función para crear la segunda ventana
function createSecondWindow() {
  if (secondWindow) {
    secondWindow.focus();
    return;
  }

  // Obtener información de las pantallas
  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  
  // Usar pantalla principal para el panel de control
  let targetDisplay = primaryDisplay;
  if (displays.length > 1) {
    // Forzar que el panel de control siempre vaya al monitor principal
    // Buscar el monitor principal explícitamente
    for (let i = 0; i < displays.length; i++) {
      if (displays[i].id === primaryDisplay.id) {
        targetDisplay = displays[i];
        // console.log('Panel de control en monitor principal:', targetDisplay.label);
        break;
      }
    }
    // Si no se encontró, usar el primero como fallback
    if (targetDisplay.id !== primaryDisplay.id) {
      targetDisplay = primaryDisplay;
    }
  }

  secondWindow = new BrowserWindow({
    width: 420,
    height: 520,
    minWidth: 420,
    minHeight: 520,
    resizable: true,
    maximizable: true,
    x: targetDisplay.bounds.x + 200,
    y: targetDisplay.bounds.y + 200,
    webPreferences: {
      nodeIntegration: true,
      devTools: false, // DevTools deshabilitado
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'CCH Player',
    autoHideMenuBar: true,
    parent: mainWindow, // Hacer que sea hija de la ventana principal
    modal: false // No modal, puede usarse independientemente
  });

  // Cargar panel de control en la segunda ventana
  secondWindow.loadFile('control-panel.html');
  
  // Asegurar que el título sea correcto
  secondWindow.setTitle('CCH Player');
  
  // Maximizar la ventana al iniciar
  secondWindow.once('ready-to-show', () => {
    secondWindow.maximize();
  });

  // DevTools deshabilitados - atajos de teclado removidos

  // Deshabilitar menú contextual (clic derecho) en el panel de control
  secondWindow.webContents.on('context-menu', (event) => {
    event.preventDefault();
  });

  // Detectar cambios en maximización
  secondWindow.on('maximize', () => {
    if (secondWindow && secondWindow.webContents) {
      secondWindow.webContents.send('window-maximized');
    }
  });

  secondWindow.on('unmaximize', () => {
    if (secondWindow && secondWindow.webContents) {
      secondWindow.webContents.send('window-unmaximized');
    }
  });

  // Limpiar referencia cuando se cierre y cerrar la app
  secondWindow.on('closed', () => {
    secondWindow = null;
    // // console.log('Panel de control cerrado, cerrando aplicación');
    
    // Forzar cierre inmediato
    setTimeout(() => {
      // // console.log('Forzando cierre de la aplicación...');
      process.exit(0);
    }, 100);
  });

  // DevTools disponibles en panel de control (se puede abrir con F12 o Ctrl+Shift+I)
}

// Este método será llamado cuando Electron haya terminado de inicializar
app.whenReady().then(() => {
  // Crear todos los directorios necesarios al inicio
  ensureAllDirectories();
  
  createWindow();
  createSecondWindow(); // Abrir panel de control automáticamente
  
  // Configurar eventos de pantalla después de que la app esté lista
  setupScreenEvents();
  
  // Iniciar polling automáticamente si hay configuración
  setTimeout(async () => {
    await loadManagerConfigOnStart(); // Cargar configuración del Manager
    startPolling(); // Iniciar polling
  }, 2000); // Esperar 2 segundos para que todo esté listo
});

// Salir solo cuando se cierre el panel de control
app.on('window-all-closed', () => {
  // Detener polling al cerrar
  stopPolling();
  
  // Solo cerrar si no hay panel de control abierto
  if (!secondWindow || secondWindow.isDestroyed()) {
    // // console.log('Todas las ventanas cerradas, cerrando aplicación');
    app.quit();
  } else {
    // // console.log('Panel de control aún abierto, manteniendo la app abierta');
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Función para configurar eventos de pantalla
function setupScreenEvents() {
  // Manejar cambios en las pantallas
  screen.on('display-added', (event, newDisplay) => {
    // // console.log('Nueva pantalla conectada:', newDisplay.label);
    // Opcional: mover ventana a la nueva pantalla secundaria
  });

  screen.on('display-removed', (event, oldDisplay) => {
    // // console.log('Pantalla desconectada:', oldDisplay.label);
    // Si se desconecta la pantalla secundaria, mover a la principal
    const displays = screen.getAllDisplays();
    if (displays.length === 1 && mainWindow) {
      const primaryDisplay = screen.getPrimaryDisplay();
      mainWindow.setBounds({
        x: primaryDisplay.bounds.x + 100,
        y: primaryDisplay.bounds.y + 100,
        width: 1200,
        height: 800
      });
    }
  });
}

// IPC para manejar la selección de archivos JSON
ipcMain.handle('select-json-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar archivo JSON del proyecto',
    filters: [
      { name: 'Archivos JSON', extensions: ['json'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const filePath = result.filePaths[0];
    try {
      const jsonContent = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(jsonContent);
      
      // Obtener la ruta base del proyecto (carpeta donde está el JSON)
      const projectBasePath = path.dirname(filePath);
      
      return {
        success: true,
        data: jsonData,
        projectPath: projectBasePath,
        jsonPath: filePath
      };
    } catch (error) {
      return {
        success: false,
        error: `Error al leer el archivo JSON: ${error.message}`
      };
    }
  }

  return { success: false, error: 'No se seleccionó ningún archivo' };
});

// IPC para seleccionar archivo ZIP
ipcMain.handle('select-zip-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar archivo ZIP del proyecto',
    filters: [
      { name: 'Archivos ZIP', extensions: ['zip'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return {
      success: true,
      filePath: result.filePaths[0]
    };
  }

  return { success: false, error: 'No se seleccionó ningún archivo' };
});

// Función helper para verificar video con FFmpeg (solo verificación, sin hash ni tamaño)
async function verifyVideoWithFFmpegOnly(videoPath) {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const ffmpegPath = getFFmpegPath();
    const command = `"${ffmpegPath}" -v error -i "${videoPath}" -f null - 2>&1`;
    
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 }); // 60 segundos timeout
      
      // IMPORTANTE: Con 2>&1, los errores de FFmpeg van a stdout, no a stderr
      // Combinar ambas salidas para capturar todos los errores
      const combinedOutput = (stdout || '') + (stderr || '');
      
      // Con -v error, cualquier salida es un error crítico
      // FFmpeg solo muestra errores cuando se usa -v error, no warnings
      if (combinedOutput && combinedOutput.trim().length > 0) {
        // Cualquier línea en la salida con -v error es un error crítico
        const errorLines = combinedOutput
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        if (errorLines.length > 0) {
          // Mostrar los primeros 5 errores para el log
          const errorPreview = errorLines.slice(0, 5).join('; ');
          const errorCount = errorLines.length > 5 ? ` (y ${errorLines.length - 5} más)` : '';
          console.error(`   ❌ [VERIFY-FFMPEG] Errores detectados: ${errorPreview}${errorCount}`);
          throw new Error(`Video dañado: ${errorPreview}${errorCount}`);
        }
      }
      
      console.log(`   ✅ [VERIFY-FFMPEG] Video verificado correctamente con FFmpeg`);
      return true;
    } catch (ffmpegError) {
      if (ffmpegError.code === 'ENOENT') {
        console.warn(`   ⚠️ [VERIFY-FFMPEG] FFmpeg no encontrado, saltando verificación`);
        // Si FFmpeg no está disponible, no podemos verificar, así que lanzamos error
        throw new Error('FFmpeg no está disponible. No se puede verificar la integridad de los videos.');
      }
      // Si FFmpeg detecta corrupción, lanzar error
      throw ffmpegError;
    }
  } catch (error) {
    console.error(`   ❌ [VERIFY-FFMPEG] Error verificando video:`, error.message);
    throw error;
  }
}

// IPC para importar proyecto desde ZIP
ipcMain.handle('import-project-from-zip', async (event, { zipPath }) => {
  const tempImportPath = path.join(FIXED_PATHS.temp, 'import');
  const tempImportVideosPath = path.join(tempImportPath, 'videos');
  
  try {
    console.log('📦 [IMPORT-ZIP] Iniciando importación de proyecto desde ZIP...');
    console.log(`   📁 Archivo ZIP: ${zipPath}`);
    
    // Crear directorio temporal para la importación
    if (fs.existsSync(tempImportPath)) {
      fs.rmSync(tempImportPath, { recursive: true, force: true });
    }
    fs.mkdirSync(tempImportVideosPath, { recursive: true });
    console.log(`   📂 Directorio temporal creado: ${tempImportPath}`);
    
    // Leer el archivo ZIP
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    console.log(`   📋 Archivos en ZIP: ${zipEntries.length}`);
    
    let jsonFile = null;
    const videoFiles = [];
    
    // Identificar el JSON y los videos
    for (const entry of zipEntries) {
      const entryName = entry.entryName;
      console.log(`   📄 Analizando: ${entryName}`);
      
      if (entryName.endsWith('.json') && !entryName.includes('/')) {
        // JSON en la raíz del ZIP
        jsonFile = entry;
        console.log(`   ✅ JSON encontrado: ${entryName}`);
      } else if (entryName.startsWith('videos/') && !entry.isDirectory) {
        // Video dentro de la carpeta videos/
        const videoName = path.basename(entryName);
        videoFiles.push({ entry, name: videoName });
        console.log(`   ✅ Video encontrado: ${videoName}`);
      }
    }
    
    if (!jsonFile) {
      console.error('   ❌ No se encontró archivo JSON en la raíz del ZIP');
      // Limpiar directorio temporal
      if (fs.existsSync(tempImportPath)) {
        fs.rmSync(tempImportPath, { recursive: true, force: true });
      }
      return { success: false, error: 'No se encontró archivo JSON en el ZIP' };
    }
    
    if (videoFiles.length === 0) {
      console.warn('   ⚠️ No se encontraron videos en el ZIP');
    }
    
    // PASO 1: Extraer todo a directorio temporal
    console.log(`   📄 Extrayendo JSON a directorio temporal...`);
    const jsonContent = jsonFile.getData().toString('utf8');
    const jsonFileName = path.basename(jsonFile.entryName);
    const tempJsonPath = path.join(tempImportPath, jsonFileName);
    fs.writeFileSync(tempJsonPath, jsonContent, 'utf8');
    console.log(`   ✅ JSON extraído: ${tempJsonPath}`);
    
    console.log(`   📹 Extrayendo ${videoFiles.length} videos a directorio temporal...`);
    for (const { entry, name } of videoFiles) {
      const videoData = entry.getData();
      const tempVideoPath = path.join(tempImportVideosPath, name);
      fs.writeFileSync(tempVideoPath, videoData);
      console.log(`   ✅ Video extraído: ${name} (${(videoData.length / 1024 / 1024).toFixed(2)} MB)`);
    }
    
    // PASO 2: Verificar TODOS los videos con FFmpeg antes de importar
    console.log(`   🔍 Verificando ${videoFiles.length} videos con FFmpeg...`);
    const verificationErrors = [];
    
    for (const { name } of videoFiles) {
      const tempVideoPath = path.join(tempImportVideosPath, name);
      try {
        console.log(`   🔍 Verificando: ${name}...`);
        await verifyVideoWithFFmpegOnly(tempVideoPath);
        console.log(`   ✅ ${name} verificado correctamente`);
      } catch (error) {
        console.error(`   ❌ ${name} falló la verificación: ${error.message}`);
        verificationErrors.push({ name, error: error.message });
      }
    }
    
    // PASO 3: Si algún video falló, NO importar nada y limpiar
    if (verificationErrors.length > 0) {
      console.error(`   ❌ [IMPORT-ZIP] ${verificationErrors.length} video(s) fallaron la verificación:`);
      verificationErrors.forEach(({ name, error }) => {
        console.error(`      - ${name}: ${error}`);
      });
      
      // Limpiar directorio temporal
      if (fs.existsSync(tempImportPath)) {
        fs.rmSync(tempImportPath, { recursive: true, force: true });
        console.log(`   🧹 Directorio temporal limpiado`);
      }
      
      const errorMessage = verificationErrors.length === 1
        ? `Video corrupto detectado: ${verificationErrors[0].name}`
        : `${verificationErrors.length} videos corruptos detectados. No se importó el proyecto.`;
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
    
    // PASO 4: Si todos los videos pasaron, mover a carpetas finales
    console.log(`   ✅ Todos los videos verificados correctamente. Moviendo a carpetas finales...`);
    
    // Asegurar que existan las carpetas finales
    const { programacionPath, videosPath } = ensureProgramacionFolder();
    
    // Eliminar JSON anterior si existe
    const existingJsonFiles = fs.readdirSync(programacionPath).filter(f => f.endsWith('.json'));
    for (const oldFile of existingJsonFiles) {
      const oldPath = path.join(programacionPath, oldFile);
      fs.unlinkSync(oldPath);
      console.log(`   🗑️ JSON anterior eliminado: ${oldFile}`);
    }
    
    // Mover JSON a carpeta final
    const finalJsonPath = path.join(programacionPath, jsonFileName);
    fs.copyFileSync(tempJsonPath, finalJsonPath);
    console.log(`   ✅ JSON guardado: ${finalJsonPath}`);
    
    // Mover videos a carpeta final
    let videosMoved = 0;
    for (const { name } of videoFiles) {
      const tempVideoPath = path.join(tempImportVideosPath, name);
      const finalVideoPath = path.join(videosPath, name);
      fs.copyFileSync(tempVideoPath, finalVideoPath);
      console.log(`   ✅ Video guardado: ${name}`);
      videosMoved++;
    }
    
    // Limpiar directorio temporal
    if (fs.existsSync(tempImportPath)) {
      fs.rmSync(tempImportPath, { recursive: true, force: true });
      console.log(`   🧹 Directorio temporal limpiado`);
    }
    
    console.log(`✅ [IMPORT-ZIP] Importación completada: ${videosMoved} videos importados y verificados`);
    
    // Notificar al panel de control que la importación se completó
    if (secondWindow && secondWindow.webContents) {
      secondWindow.webContents.send('download-completed', {
        timestamp: new Date().toISOString(),
        message: 'Proyecto importado exitosamente'
      });
    }
    
    // Reiniciar el player para cargar el nuevo proyecto
    setTimeout(() => {
      restartPlayer();
    }, 1000);
    
    return { 
      success: true, 
      message: `Proyecto importado exitosamente: ${videosMoved} videos importados y verificados` 
    };
    
  } catch (error) {
    console.error('❌ [IMPORT-ZIP] Error importando proyecto:', error);
    
    // Limpiar directorio temporal en caso de error
    if (fs.existsSync(tempImportPath)) {
      try {
        fs.rmSync(tempImportPath, { recursive: true, force: true });
        console.log(`   🧹 Directorio temporal limpiado después del error`);
      } catch (cleanupError) {
        console.error(`   ⚠️ Error limpiando directorio temporal:`, cleanupError.message);
      }
    }
    
    return { 
      success: false, 
      error: `Error al importar proyecto: ${error.message}` 
    };
  }
});

// IPC para seleccionar archivo de video
ipcMain.handle('select-video-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar archivo de video',
    filters: [
      { name: 'Archivos de Video', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const originalPath = result.filePaths[0];
    
    try {
      // Crear carpeta de videos
      const videosFolder = ensureVideosFolder();
      
      // Obtener nombre del archivo original
      const originalFileName = path.basename(originalPath);
      const fileName = path.parse(originalFileName).name;
      const fileExt = path.parse(originalFileName).ext;
      
      // Crear nombre único para evitar conflictos
      let newFileName = originalFileName;
      let counter = 1;
      while (fs.existsSync(path.join(videosFolder, newFileName))) {
        newFileName = `${fileName}_${counter}${fileExt}`;
        counter++;
      }
      
      const newPath = path.join(videosFolder, newFileName);
      
      // Copiar archivo
      fs.copyFileSync(originalPath, newPath);
      
      // // console.log('Video copiado:', originalPath, '->', newPath);
      
      return {
        success: true,
        filePath: newPath,
        originalPath: originalPath
      };
    } catch (error) {
      // console.error('Error copiando video:', error);
      return { 
        success: false, 
        error: `Error copiando video: ${error.message}` 
      };
    }
  }

  return { success: false, error: 'No se seleccionó ningún archivo' };
});

// IPC para seleccionar archivo de audio
ipcMain.handle('select-audio-file', async () => {
  // // console.log('IPC select-audio-file llamado');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar archivo de audio',
    filters: [
      { name: 'Archivos de Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  // // console.log('Resultado del diálogo:', result);

  if (!result.canceled && result.filePaths.length > 0) {
    const originalPath = result.filePaths[0];
    
    try {
      // Crear carpeta de audios
      const audiosFolder = ensureAudiosFolder();
      
      // Obtener nombre del archivo original
      const originalFileName = path.basename(originalPath);
      const fileName = path.parse(originalFileName).name;
      const fileExt = path.parse(originalFileName).ext;
      
      // Crear nombre único para evitar conflictos
      let newFileName = originalFileName;
      let counter = 1;
      while (fs.existsSync(path.join(audiosFolder, newFileName))) {
        newFileName = `${fileName}_${counter}${fileExt}`;
        counter++;
      }
      
      const newPath = path.join(audiosFolder, newFileName);
      
      // Copiar archivo
      fs.copyFileSync(originalPath, newPath);
      
      // // console.log('Audio copiado:', originalPath, '->', newPath);
      
      return {
        success: true,
        filePath: newPath,
        originalPath: originalPath
      };
    } catch (error) {
      // console.error('Error copiando audio:', error);
      return { 
        success: false, 
        error: `Error copiando audio: ${error.message}` 
      };
    }
  }

  return { success: false, error: 'No se seleccionó ningún archivo' };
});

// IPC para seleccionar archivo de música
ipcMain.handle('select-music-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar archivo de música',
    filters: [
      { name: 'Archivos de Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const originalPath = result.filePaths[0];
    
    try {
      // Crear carpeta de música
      const musicFolder = ensureMusicFolder();
      
      // Obtener nombre del archivo original
      const originalFileName = path.basename(originalPath);
      const fileName = path.parse(originalFileName).name;
      const fileExt = path.parse(originalFileName).ext;
      
      // Crear nombre único para evitar conflictos
      let newFileName = originalFileName;
      let counter = 1;
      while (fs.existsSync(path.join(musicFolder, newFileName))) {
        newFileName = `${fileName}_${counter}${fileExt}`;
        counter++;
      }
      
      const newPath = path.join(musicFolder, newFileName);
      
      // Copiar archivo
      fs.copyFileSync(originalPath, newPath);
      
      return {
        success: true,
        filePath: newPath,
        fileName: newFileName // Retornar el nombre del archivo para usarlo como nombre
      };
    } catch (error) {
      return { 
        success: false, 
        error: `Error copiando música: ${error.message}` 
      };
    }
  }

  return { success: false, error: 'No se seleccionó ningún archivo' };
});

// IPC para limpiar videos copiados (solo videos de seguridad, loop y placa de audio)
ipcMain.handle('clear-copied-videos', async (event, videoPaths) => {
  try {
    // videoPaths es un array con las rutas de los videos a eliminar
    // Solo se eliminan los videos de seguridad, loop y placa de audio
    // NO se eliminan los videos de programacion/videos
    
    if (!videoPaths || !Array.isArray(videoPaths) || videoPaths.length === 0) {
      console.log(`⚠️ [CLEAR-VIDEOS] No hay videos para eliminar`);
      return { success: true, deleted: 0, errors: 0 };
    }
    
    console.log(`🗑️ [CLEAR-VIDEOS] Limpiando ${videoPaths.length} video(s) de seguridad/loop/placa...`);
    
    let deletedCount = 0;
    let errorCount = 0;
    
    for (const videoPath of videoPaths) {
      if (!videoPath) continue;
      
      try {
        // Verificar que el archivo existe
        if (fs.existsSync(videoPath)) {
          // Verificar que es un archivo (no directorio)
          const stats = fs.statSync(videoPath);
          if (stats.isFile()) {
            // Verificar que NO está en programacion/videos (solo eliminar videos de la carpeta videos/)
            const normalizedPath = path.normalize(videoPath);
            const programacionVideosPath = path.normalize(FIXED_PATHS.videos);
            
            if (normalizedPath.includes(programacionVideosPath)) {
              console.log(`   ⏭️ [CLEAR-VIDEOS] Omitido (es video del proyecto): ${path.basename(videoPath)}`);
              continue; // No eliminar videos del proyecto
            }
            
            // Intentar eliminar el archivo
            try {
              fs.unlinkSync(videoPath);
              console.log(`   ✅ [CLEAR-VIDEOS] Eliminado: ${path.basename(videoPath)}`);
              deletedCount++;
            } catch (deleteError) {
              // Si el error es EBUSY (archivo en uso), esperar y reintentar
              if (deleteError.code === 'EBUSY' || deleteError.message.includes('EBUSY')) {
                console.log(`   ⏳ [CLEAR-VIDEOS] Archivo en uso, esperando 1 segundo... ${path.basename(videoPath)}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                try {
                  fs.unlinkSync(videoPath);
                  console.log(`   ✅ [CLEAR-VIDEOS] Eliminado (reintento): ${path.basename(videoPath)}`);
                  deletedCount++;
                } catch (retryError) {
                  console.error(`   ❌ [CLEAR-VIDEOS] Error en reintento ${path.basename(videoPath)}:`, retryError.message);
                  errorCount++;
                }
              } else {
                throw deleteError; // Re-lanzar si es otro tipo de error
              }
            }
          } else {
            console.log(`   ⏭️ [CLEAR-VIDEOS] Omitido (es directorio): ${path.basename(videoPath)}`);
          }
        } else {
          console.log(`   ⏭️ [CLEAR-VIDEOS] Archivo no existe: ${path.basename(videoPath)}`);
        }
      } catch (error) {
        console.error(`   ❌ [CLEAR-VIDEOS] Error eliminando ${path.basename(videoPath)}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`✅ [CLEAR-VIDEOS] Resumen: ${deletedCount} eliminados, ${errorCount} errores`);
    return { success: true, deleted: deletedCount, errors: errorCount };
  } catch (error) {
    console.error(`❌ [CLEAR-VIDEOS] Error limpiando videos:`, error.message);
    return { success: false, error: error.message };
  }
});

// IPC para limpiar audios copiados
ipcMain.handle('clear-copied-audios', async () => {
  try {
    const audiosFolder = ensureAudiosFolder();
    
    if (fs.existsSync(audiosFolder)) {
      const files = fs.readdirSync(audiosFolder);
      
      files.forEach(file => {
        const filePath = path.join(audiosFolder, file);
        try {
          fs.unlinkSync(filePath);
          // // console.log('Audio eliminado:', filePath);
        } catch (error) {
          // console.error('Error eliminando audio:', filePath, error);
        }
      });
      
      // // console.log('Audios copiados eliminados');
      return { success: true };
    } else {
      return { success: true, message: 'No hay carpeta de audios' };
    }
  } catch (error) {
    // console.error('Error limpiando audios:', error);
    return { success: false, error: error.message };
  }
});

// IPC para obtener lista de música
ipcMain.handle('get-music-list', async () => {
  try {
    // Enviar comando al reproductor principal para obtener la lista
    if (mainWindow && !mainWindow.isDestroyed()) {
      const result = await mainWindow.webContents.executeJavaScript(`
        if (window.playerManager && window.playerManager.loadedMusic) {
          window.playerManager.loadedMusic;
        } else {
          [];
        }
      `);
      return result || [];
    }
    return [];
  } catch (error) {
    // console.error('Error obteniendo lista de música:', error);
    return [];
  }
});

// IPC para obtener archivos de música del directorio
ipcMain.handle('get-music-files', async () => {
  try {
    const musicFolder = ensureMusicFolder();
    
    if (fs.existsSync(musicFolder)) {
      const files = fs.readdirSync(musicFolder);
      const musicFiles = files
        .filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext);
        })
        .map(file => path.join(musicFolder, file))
        .sort(); // Ordenar alfabéticamente
      
      return musicFiles;
    }
    return [];
  } catch (error) {
    // console.error('Error obteniendo archivos de música:', error);
    return [];
  }
});

// IPC para limpiar música copiada
ipcMain.handle('clear-copied-music', async () => {
  try {
    const musicFolder = ensureMusicFolder();
    
    if (fs.existsSync(musicFolder)) {
      const files = fs.readdirSync(musicFolder);
      
      for (const file of files) {
        const filePath = path.join(musicFolder, file);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          // console.error(`Error eliminando ${file}:`, error);
        }
      }
      return { success: true };
    } else {
      return { success: true, message: 'No hay carpeta de música' };
    }
  } catch (error) {
    // console.error('Error limpiando música:', error);
    return { success: false, error: error.message };
  }
});

// IPC para obtener audios existentes del directorio
ipcMain.handle('get-existing-audios', async () => {
  try {
    const audiosFolder = ensureAudiosFolder();
    
    if (fs.existsSync(audiosFolder)) {
      const files = fs.readdirSync(audiosFolder);
      const audioFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp3', '.wav', '.ogg', '.m4a', '.aac'].includes(ext);
      }).map(file => path.join(audiosFolder, file));
      
      // // console.log('Audios encontrados en directorio:', audioFiles);
      return { success: true, audios: audioFiles };
    } else {
      return { success: true, audios: [] };
    }
  } catch (error) {
    // console.error('Error obteniendo audios existentes:', error);
    return { success: false, error: error.message };
  }
});

// IPC para obtener lista de audios
ipcMain.handle('get-audio-list', async () => {
  try {
    // Enviar comando al reproductor principal para obtener la lista
    if (mainWindow && !mainWindow.isDestroyed()) {
      const result = await mainWindow.webContents.executeJavaScript(`
        if (window.playerManager && window.playerManager.loadedAudios) {
          window.playerManager.loadedAudios;
        } else {
          [];
        }
      `);
      return result || [];
    }
    return [];
  } catch (error) {
    // console.error('Error obteniendo lista de audios:', error);
    return [];
  }
});

// IPC para verificar si un archivo de video existe
ipcMain.handle('check-file-exists', async (event, filePath) => {
  try {
    const fullPath = path.resolve(filePath);
    return fs.existsSync(fullPath);
  } catch (error) {
    return false;
  }
});

// IPC para obtener información de un archivo
ipcMain.handle('get-file-info', async (event, filePath) => {
  try {
    const fullPath = path.resolve(filePath);
    const stats = fs.statSync(fullPath);
    return {
      exists: true,
      size: stats.size,
      modified: stats.mtime
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
});

// IPC para abrir segunda ventana
ipcMain.handle('open-second-window', async () => {
  createSecondWindow();
  return { success: true };
});

// IPC para enfocar panel de control
ipcMain.handle('focus-control-panel', async () => {
  if (secondWindow) {
    secondWindow.focus();
    return { success: true };
  }
  return { success: false, error: 'Panel de control no está abierto' };
});

// IPC para actualizar control panel después de eliminar videos
ipcMain.on('update-control-panel-after-video-deletion', () => {
  console.log('📢 [MAIN] Recibido mensaje para actualizar control panel después de eliminar videos');
  if (secondWindow && secondWindow.webContents) {
    console.log('📢 [MAIN] Enviando mensaje videos-deleted al control panel');
    console.log('📢 [MAIN] secondWindow existe:', !!secondWindow);
    console.log('📢 [MAIN] secondWindow.webContents existe:', !!secondWindow.webContents);
    console.log('📢 [MAIN] secondWindow.isDestroyed():', secondWindow.isDestroyed());
    try {
      secondWindow.webContents.send('videos-deleted');
      console.log('📢 [MAIN] Mensaje videos-deleted enviado exitosamente');
    } catch (error) {
      console.error('❌ [MAIN] Error enviando mensaje:', error.message);
    }
  } else {
    console.error('❌ [MAIN] secondWindow no está disponible');
    console.error('   - secondWindow:', !!secondWindow);
    console.error('   - secondWindow.webContents:', secondWindow ? !!secondWindow.webContents : 'N/A');
  }
});

// IPC para cerrar segunda ventana
ipcMain.handle('close-second-window', async () => {
  if (secondWindow) {
    secondWindow.close();
    return { success: true };
  }
  return { success: false, error: 'Segunda ventana no está abierta' };
});

// IPC para verificar si la ventana está maximizada
ipcMain.handle('is-window-maximized', async () => {
  if (secondWindow && !secondWindow.isDestroyed()) {
    return secondWindow.isMaximized();
  }
  return false;
});


// IPC para salir de pantalla completa
ipcMain.handle('exit-fullscreen', async () => {
  if (mainWindow) {
    mainWindow.setFullScreen(false);
    mainWindow.setKiosk(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setSkipTaskbar(false);
    return { success: true };
  }
  return { success: false, error: 'Ventana principal no disponible' };
});

// IPC para entrar en modo kiosco
ipcMain.handle('enter-kiosk', async () => {
  if (mainWindow) {
    const displays = screen.getAllDisplays();
    if (displays.length > 1) {
      const targetDisplay = displays[1];
      mainWindow.setBounds({
        x: targetDisplay.bounds.x,
        y: targetDisplay.bounds.y,
        width: targetDisplay.bounds.width,
        height: targetDisplay.bounds.height
      });
      mainWindow.setFullScreen(true);
      mainWindow.setKiosk(true);
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setSkipTaskbar(true);
      return { success: true };
    }
    return { success: false, error: 'No hay pantalla secundaria disponible' };
  }
  return { success: false, error: 'Ventana principal no disponible' };
});

// IPC para comandos del panel de control
ipcMain.handle('control-command', async (event, { command, data }) => {
  try {
    // // console.log(`Comando recibido del panel de control: ${command}`, data);
    
    // Manejar comandos de cámara IP directamente en main.js
    if (command === 'testCamera') {
      return await testCameraConnection(data.url);
    } else if (command === 'saveCameraUrl') {
      return await saveCameraUrl(data.url);
    } else if (command === 'getCameraUrl') {
      return await getCameraUrl();
    } else if (command === 'saveCameraConfig') {
      return await saveCameraConfig(data);
    }
    
    // Enviar otros comandos al reproductor principal
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('control-command', { command, data });
      return { success: true };
    } else {
      return { success: false, error: 'Reproductor principal no disponible' };
    }
  } catch (error) {
    // console.error('Error procesando comando:', error);
    return { success: false, error: error.message };
  }
});

// IPC para obtener estado del reproductor
ipcMain.handle('get-player-status', async () => {
  try {
    if (mainWindow && mainWindow.webContents) {
      // Solicitar estado al reproductor principal
      const status = await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Timeout' });
        }, 1000);
        
        mainWindow.webContents.send('get-status-request');
        
        ipcMain.once('status-response', (event, data) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });
      
      return status;
    } else {
      return { success: false, error: 'Reproductor principal no disponible' };
    }
  } catch (error) {
    // console.error('Error obteniendo estado:', error);
    return { success: false, error: error.message };
  }
});

// Funciones para manejar cámara IP
async function testCameraConnection(url) {
  try {
    // Validar URL
    if (!url || !url.startsWith('http')) {
      return { success: false, error: 'URL inválida' };
    }

    // Intentar hacer una petición HEAD para verificar conectividad
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    return new Promise((resolve) => {
      const req = client.request({
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'HEAD',
        timeout: 5000
      }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: `HTTP ${res.statusCode}` });
        }
      });
      
      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Timeout - No se pudo conectar' });
      });
      
      req.end();
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function saveCameraUrl(url) {
  try {
    // Guardar en localStorage del reproductor principal
    if (mainWindow && mainWindow.webContents) {
      await mainWindow.webContents.executeJavaScript(`
        localStorage.setItem('cameraUrl', '${url}');
      `);
      return { success: true };
    }
    return { success: false, error: 'Reproductor principal no disponible' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getCameraUrl() {
  try {
    // Obtener desde localStorage del reproductor principal
    if (mainWindow && mainWindow.webContents) {
      const url = await mainWindow.webContents.executeJavaScript(`
        localStorage.getItem('cameraUrl') || '';
      `);
      return { success: true, url: url };
    }
    return { success: false, error: 'Reproductor principal no disponible' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function saveCameraConfig(data) {
  try {
    // Guardar configuración de cámara en localStorage del reproductor principal
    if (mainWindow && mainWindow.webContents) {
      await mainWindow.webContents.executeJavaScript(`
        localStorage.setItem('cameraConfig', JSON.stringify({
          url: '${data.url}',
          quality: '${data.quality}',
          resolution: '${data.resolution}',
          timestamp: ${data.timestamp}
        }));
      `);
      return { success: true };
    }
    return { success: false, error: 'Reproductor principal no disponible' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Variables del Manager (simplificado)
let managerConfig = {
  hostname: null, // DynAlias o IP directa
  terminalId: null // ID del terminal (configurado manualmente)
};

// Puerto fijo del Manager
const MANAGER_PORT = 9001;

// Sistema de polling
let pollingInterval = null;
let isPolling = false;
let isDownloading = false; // Bandera para indicar si hay una descarga en progreso

// ===== SISTEMA DE POLLING =====

// Iniciar polling
function startPolling() {
  if (isPolling) {
    return; // Ya está ejecutándose
  }
  
  if (!managerConfig.hostname || !managerConfig.terminalId) {
    // console.log('Polling no iniciado: falta configuración del Manager');
    return;
  }
  
  isPolling = true;
  
  // Verificar updates inmediatamente
  checkForUpdates();
  
  // Polling cada 30 segundos
  pollingInterval = setInterval(() => {
    checkForUpdates();
  }, 30000); // 30 segundos
  
  // console.log('Polling iniciado cada 30 segundos');
}

// Detener polling
function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isPolling = false;
  // console.log('Polling detenido');
}

// Verificar updates desde el Manager
async function checkForUpdates() {
  try {
    // Si ya hay una descarga en progreso, NO hacer ninguna solicitud
    if (isDownloading) {
      // console.log('Descarga en progreso, no se hacen solicitudes de polling');
      return;
    }
    
    if (!managerConfig.hostname || !managerConfig.terminalId) {
      return; // No hay configuración
    }
    
    // Verificar si hay proyectos reales (archivos JSON) en programacion
    const { programacionPath } = ensureProgramacionFolder();
    let hasRealProject = false;
    try {
      const files = fs.readdirSync(programacionPath);
      const jsonFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('project_'));
      // Solo considerar proyectos reales si hay archivos JSON (excluyendo archivos project_*.json que son temporales)
      hasRealProject = jsonFiles.length > 0;
    } catch (error) {
      // Si hay error leyendo el directorio, asumir que no hay proyecto
      hasRealProject = false;
    }
    
    // Obtener última versión descargada desde localStorage SOLO si hay un proyecto real
    let lastVersion = '';
    if (hasRealProject) {
      if (mainWindow && mainWindow.webContents) {
        lastVersion = await mainWindow.webContents.executeJavaScript(`
          localStorage.getItem('lastDownloadVersion') || '';
        `);
      }
    } else {
      // Si no hay proyecto real, limpiar localStorage y usar versión vacía
      if (mainWindow && mainWindow.webContents) {
        await mainWindow.webContents.executeJavaScript(`
          localStorage.removeItem('lastDownloadVersion');
        `);
      }
      lastVersion = ''; // Forzar a que siempre busque actualizaciones si no hay proyecto
    }
    
    // Construir URL del Manager (DynAlias o IP)
    const managerUrl = `http://${managerConfig.hostname}:${MANAGER_PORT}`;
    const checkUrl = `${managerUrl}/check-updates?terminalId=${encodeURIComponent(managerConfig.terminalId)}&lastVersion=${encodeURIComponent(lastVersion)}`;
    
    // console.log('Verificando updates:', checkUrl);
    
    // Usar fetch nativo (Node.js 18+ tiene fetch)
    const https = require('https');
    const http = require('http');
    const url = require('url');
    
    const parsedUrl = new URL(checkUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const response = await new Promise((resolve, reject) => {
      const req = client.get(parsedUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode === 200,
            status: res.statusCode,
            json: async () => JSON.parse(data)
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
    
    if (!response.ok) {
      // console.error('Error verificando updates:', response.status);
      return;
    }
    
    const data = await response.json();
    
    if (data.hasUpdate && data.configData) {
      // console.log('Update disponible, descargando...');
      
      // Detener polling para que NO haga más solicitudes durante la descarga
      stopPolling();
      
      // Marcar que hay una descarga en progreso
      isDownloading = true;
      
      // Iniciar heartbeat durante la descarga (solo para mantener comunicación, no busca updates)
      startDownloadHeartbeat();
      
      // Procesar archivos del Manager
      await processManagerFiles(data.configData, data.configFileName);
      
      // Actualizar última versión después de descarga exitosa
      if (mainWindow && mainWindow.webContents) {
        const newVersion = new Date().toISOString();
        await mainWindow.webContents.executeJavaScript(`
          localStorage.setItem('lastDownloadVersion', '${newVersion}');
        `);
      }
      
      // Marcar que la descarga terminó y detener heartbeat
      isDownloading = false;
      stopDownloadHeartbeat();
      
      // Reiniciar polling para volver a buscar actualizaciones
      startPolling();
    }
    
  } catch (error) {
    // console.error('Error verificando updates:', error);
    // Continuar con el polling aunque haya error
  }
}

// Cargar proyecto desde directorio fijo
ipcMain.handle('load-project-from-programacion', async () => {
  return loadProjectFromProgramacion();
});

// Registrar video reproducido en log
ipcMain.handle('log-video-played', async (event, videoName, duration) => {
  logVideoPlayed(videoName, duration);
  return { success: true };
});

// Rutas fijas (basadas en Documentos del usuario)
const FIXED_PATHS = {
  get base() {
    return getBaseDataPath();
  },
  get programacion() {
    return path.join(getBaseDataPath(), 'programacion');
  },
  get videos() {
    return path.join(getBaseDataPath(), 'programacion', 'videos');
  },
  get temp() {
    return path.join(getBaseDataPath(), 'programacion', 'temp');
  },
  get tempVideos() {
    return path.join(getBaseDataPath(), 'programacion', 'temp', 'videos');
  }
};

// Cargar configuración del Manager al iniciar
async function loadManagerConfigOnStart() {
  try {
    const result = await getManagerConfig();
    if (result.success && result.config.isConfigured) {
      // console.log('Configuración del Manager cargada:', result.config);
    } else {
      // console.log('Manager no configurado');
    }
  } catch (error) {
    // console.error('Error cargando configuración del Manager:', error);
  }
}

// ===== IPC HANDLERS DEL MANAGER =====

// Guardar configuración del Manager (simplificada)
async function saveManagerConfig(config) {
  try {
    managerConfig.hostname = config.hostname; // DynAlias o IP
    managerConfig.terminalId = config.terminalId;
    
    // Guardar en localStorage del renderer
    if (mainWindow && mainWindow.webContents) {
      await mainWindow.webContents.executeJavaScript(`
        localStorage.setItem('managerConfig', JSON.stringify({
          hostname: '${config.hostname}',
          terminalId: '${config.terminalId}'
        }));
      `);
    }
    
    // Reiniciar polling con nueva configuración
    stopPolling();
    startPolling();
    
    return { success: true, message: 'Configuración del Manager guardada' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Obtener configuración del Manager (simplificada)
async function getManagerConfig() {
  try {
    // Cargar desde localStorage del renderer
    if (mainWindow && mainWindow.webContents) {
      const savedConfig = await mainWindow.webContents.executeJavaScript(`
        JSON.parse(localStorage.getItem('managerConfig') || '{}');
      `);
      
      if (savedConfig.hostname && savedConfig.terminalId) {
        managerConfig.hostname = savedConfig.hostname;
        managerConfig.terminalId = savedConfig.terminalId;
      }
    }
    
    return {
      success: true,
      config: {
        hostname: managerConfig.hostname,
        terminalId: managerConfig.terminalId,
        isConfigured: !!(managerConfig.hostname && managerConfig.terminalId)
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Probar conexión al Manager
async function testManagerConnection(config) {
  try {
    const startTime = Date.now();
    const hostname = config.hostname || managerConfig.hostname;
    
    if (!hostname) {
      return { success: false, error: 'Hostname no configurado' };
    }
    
    const url = `http://${hostname}:${MANAGER_PORT}/status`;
    
    const http = require('http');
    const parsedUrl = new URL(url);
    
    const response = await new Promise((resolve, reject) => {
      const req = http.get(parsedUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode === 200,
            status: res.statusCode,
            json: async () => JSON.parse(data)
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
    
    const responseTime = Date.now() - startTime;
    
    if (response.ok) {
      return { success: true, responseTime: responseTime };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// IPC handlers para Manager (simplificados)
ipcMain.handle('save-manager-config', async (event, config) => {
  return await saveManagerConfig(config);
});

ipcMain.handle('get-manager-config', async () => {
  return await getManagerConfig();
});

ipcMain.handle('test-manager-connection', async (event, config) => {
  return await testManagerConnection(config);
});

// ===== SISTEMA DE PROGRESO DE DESCARGA =====

// Enviar progreso al Manager
async function sendProgressToManager(terminalId, progress, downloadedBytes, totalBytes) {
  try {
    if (!managerConfig.hostname) {
      // console.log('⚠️ Manager no configurado, saltando envío de progreso');
      return;
    }
    
    const managerUrl = `http://${managerConfig.hostname}:${MANAGER_PORT}`;
    const progressUrl = `${managerUrl}/progress-update`;
    
    const payload = {
      terminalId: terminalId,
      progress: progress,
      downloadedBytes: downloadedBytes,
      totalBytes: totalBytes,
      timestamp: new Date().toISOString()
    };
    
    // console.log(`📤 Enviando progreso al Manager: ${progress}% para terminal ${terminalId}`);
    
    const response = await fetch(progressUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      // console.log(`✅ Progreso enviado exitosamente: ${progress}%`);
    } else {
      console.error(`❌ [PROGRESS] Error enviando progreso: HTTP ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => 'No se pudo leer el cuerpo de la respuesta');
      console.error(`❌ [PROGRESS] Detalles: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ [PROGRESS] Error enviando progreso al Manager:', error.message);
    console.error('❌ [PROGRESS] Stack:', error.stack);
    // No interrumpir el proceso por errores de progreso
  }
}

// Notificar al Manager sobre un reintento de archivo corrupto
async function notifyFileRetry(terminalId, fileName, attempt, maxAttempts, error) {
  try {
    if (!managerConfig.hostname) {
      return;
    }
    
    const managerUrl = `http://${managerConfig.hostname}:${MANAGER_PORT}`;
    const retryUrl = `${managerUrl}/file-retry`;
    
    const payload = {
      terminalId: terminalId,
      fileName: fileName,
      attempt: attempt,
      maxAttempts: maxAttempts,
      error: error || 'Error desconocido'
    };
    
    console.log(`📤 [RETRY-NOTIFY] Notificando reintento al Manager: ${fileName} (intento ${attempt}/${maxAttempts})`);
    
    const response = await fetch(retryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log(`✅ [RETRY-NOTIFY] Reintento notificado exitosamente al Manager`);
    } else {
      console.error(`❌ [RETRY-NOTIFY] Error notificando reintento: HTTP ${response.status} ${response.statusText}`);
    }
    
  } catch (error) {
    console.error('❌ [RETRY-NOTIFY] Error notificando reintento al Manager:', error.message);
    // No interrumpir el proceso por errores de notificación
  }
}

// Notificar al Manager que la descarga se completó exitosamente
async function notifyDownloadCompleted(terminalId, configFileName, failedFiles = []) {
  try {
    if (!managerConfig.hostname) {
      // console.log('⚠️ Manager no configurado, saltando notificación de descarga completada');
      return;
    }
    
    const managerUrl = `http://${managerConfig.hostname}:${MANAGER_PORT}`;
    const completedUrl = `${managerUrl}/download-completed`;
    
    const payload = {
      terminalId: terminalId,
      configFileName: configFileName,
      failedFiles: failedFiles.map(f => ({
        name: f.name,
        error: f.error
      }))
    };
    
    // console.log(`📤 Notificando descarga completada al Manager: ${configFileName}`);
    if (failedFiles.length > 0) {
      console.log(`⚠️ [DOWNLOAD-COMPLETED] Enviando notificación con ${failedFiles.length} archivo(s) fallido(s)`);
    }
    
    const response = await fetch(completedUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (response.ok) {
      console.log(`✅ [DOWNLOAD-COMPLETED] Notificación de descarga completada enviada exitosamente`);
    } else {
      console.error(`❌ [DOWNLOAD-COMPLETED] Error notificando descarga completada: HTTP ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => 'No se pudo leer el cuerpo de la respuesta');
      console.error(`❌ [DOWNLOAD-COMPLETED] Detalles: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ [DOWNLOAD-COMPLETED] Error notificando descarga completada al Manager:', error.message);
    console.error('❌ [DOWNLOAD-COMPLETED] Stack:', error.stack);
    console.error('❌ [DOWNLOAD-COMPLETED] TerminalId:', terminalId, 'ConfigFileName:', configFileName);
  }
}

// Listener para cuando el player se reinicia
ipcMain.on('player-restarted', (event, data) => {
  // console.log('🔄 Player reiniciado, notificando al panel de control:', data);
  
  // Notificar al panel de control que se reinició
  if (secondWindow && secondWindow.webContents) {
    // console.log('📤 Enviando notificación de reinicio al panel...');
    secondWindow.webContents.send('download-completed', {
      timestamp: new Date().toISOString(),
      message: 'Player reiniciado con contenido nuevo'
    });
  }
});

// ===== ACTUALIZACIÓN DEL CONTENIDO DEL PLAYER =====

// Detener reproducción del player
function stopPlayerPlayback() {
  try {
    // console.log('⏹️ Deteniendo reproducción del player...');
    
    // Notificar al reproductor principal para que se detenga
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('stop-playback', {
        reason: 'content-update',
        timestamp: new Date().toISOString()
      });
    }
    
    // console.log('✅ Reproducción detenida');
  } catch (error) {
    // console.error('❌ Error deteniendo reproducción:', error);
  }
}

// Copiar archivos de temp/videos/ a programacion/videos/
function copyVideosToMainDirectory(tempVideosPath, mainVideosPath) {
  try {
    console.log(`📁 [COPY-VIDEOS] Copiando videos de ${tempVideosPath} a ${mainVideosPath}...`);
    
    if (!fs.existsSync(tempVideosPath)) {
      console.log(`⚠️ [COPY-VIDEOS] No existe el directorio temp: ${tempVideosPath}`);
      return;
    }
    
    if (!fs.existsSync(mainVideosPath)) {
      console.log(`📁 [COPY-VIDEOS] Creando directorio principal: ${mainVideosPath}`);
      fs.mkdirSync(mainVideosPath, { recursive: true });
    }
    
    const files = fs.readdirSync(tempVideosPath);
    console.log(`📋 [COPY-VIDEOS] Archivos encontrados en temp: ${files.length}`);
    
    if (files.length === 0) {
      console.log(`⚠️ [COPY-VIDEOS] No hay videos en temp para copiar`);
      return;
    }
    
    const tempFiles = fs.readdirSync(tempVideosPath);
    console.log(`📋 [COPY-VIDEOS] Archivos en temp: ${tempFiles.join(', ')}`);
    let copiedCount = 0;
    let skippedCount = 0;
    
    for (const fileName of tempFiles) {
      const tempFilePath = path.join(tempVideosPath, fileName);
      const mainFilePath = path.join(mainVideosPath, fileName);
      
      // Verificar si es un archivo (no directorio)
      const stats = fs.statSync(tempFilePath);
      if (stats.isFile()) {
        const fileSize = stats.size;
        console.log(`   📄 [COPY-VIDEOS] Copiando: ${fileName} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
        fs.copyFileSync(tempFilePath, mainFilePath);
        console.log(`   ✅ [COPY-VIDEOS] Copiado exitosamente: ${mainFilePath}`);
        copiedCount++;
      } else {
        console.log(`   ⏭️ [COPY-VIDEOS] Omitido (es directorio): ${fileName}`);
        skippedCount++;
      }
    }
    
    console.log(`✅ [COPY-VIDEOS] Resumen: ${copiedCount} videos copiados, ${skippedCount} omitidos`);
    
  } catch (error) {
    console.error(`❌ [COPY-VIDEOS] Error copiando videos:`, error.message);
    console.error(`   Stack:`, error.stack);
  }
}

// Leer archivos listados en el JSON de temp
function getFilesFromTempJson(tempPath) {
  try {
    // console.log('📄 Leyendo archivos listados en JSON de temp...');
    
    // Buscar archivo JSON en temp
    const tempFiles = fs.readdirSync(tempPath);
    const jsonFile = tempFiles.find(file => file.endsWith('.json'));
    
    if (!jsonFile) {
      // console.log('⚠️ No se encontró archivo JSON en temp');
      return [];
    }
    
    const jsonPath = path.join(tempPath, jsonFile);
    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const projectData = JSON.parse(jsonContent);
    
    // Extraer nombres de archivos de video del JSON
    const videoFiles = [];
    if (projectData.blocks && Array.isArray(projectData.blocks)) {
      for (const block of projectData.blocks) {
        if (block.items && Array.isArray(block.items)) {
          for (const item of block.items) {
            if (item.type === 'video' && item.file) {
              videoFiles.push(item.file);
            }
          }
        }
      }
    }
    
    // console.log(`📄 Archivos listados en JSON: ${videoFiles.length} videos`);
    return videoFiles;
    
  } catch (error) {
    // console.error('❌ Error leyendo JSON de temp:', error);
    return [];
  }
}

// Eliminar archivos residuales
function removeResidualFiles(mainVideosPath, validFiles) {
  try {
    // console.log('🧹 Eliminando archivos residuales...');
    
    if (!fs.existsSync(mainVideosPath)) {
      // console.log('⚠️ Directorio de videos no existe');
      return;
    }
    
    const existingFiles = fs.readdirSync(mainVideosPath);
    let removedCount = 0;
    
    for (const fileName of existingFiles) {
      if (!validFiles.includes(fileName)) {
        const filePath = path.join(mainVideosPath, fileName);
        fs.unlinkSync(filePath);
        // console.log(`🗑️ Eliminado archivo residual: ${fileName}`);
        removedCount++;
      }
    }
    
    // console.log(`✅ ${removedCount} archivos residuales eliminados`);
    
  } catch (error) {
    // console.error('❌ Error eliminando archivos residuales:', error);
  }
}

// Actualizar JSON del proyecto
function updateProjectJson(tempPath, mainPath) {
  try {
    // console.log('📄 Actualizando JSON del proyecto...');
    
    // Buscar archivo JSON en temp
    const tempFiles = fs.readdirSync(tempPath);
    const jsonFile = tempFiles.find(file => file.endsWith('.json'));
    
    if (!jsonFile) {
      // console.log('⚠️ No se encontró archivo JSON en temp');
      return;
    }
    
    const tempJsonPath = path.join(tempPath, jsonFile);
    const mainJsonPath = path.join(mainPath, jsonFile);
    
    // Eliminar JSON anterior si existe
    const oldJsonFiles = fs.readdirSync(mainPath).filter(file => file.endsWith('.json'));
    for (const oldFile of oldJsonFiles) {
      const oldPath = path.join(mainPath, oldFile);
      fs.unlinkSync(oldPath);
      // console.log(`🗑️ JSON anterior eliminado: ${oldFile}`);
    }
    
    // Copiar nuevo JSON
    fs.copyFileSync(tempJsonPath, mainJsonPath);
    // console.log(`📄 Nuevo JSON copiado: ${jsonFile}`);
    
  } catch (error) {
    // console.error('❌ Error actualizando JSON:', error);
  }
}

// Limpiar directorio temp
function cleanupTempDirectory(tempPath) {
  try {
    // console.log('🧹 Limpiando directorio temp...');
    
    if (fs.existsSync(tempPath)) {
      fs.rmSync(tempPath, { recursive: true, force: true });
      // console.log('✅ Directorio temp eliminado');
    }
    
  } catch (error) {
    // console.error('❌ Error limpiando temp:', error);
  }
}

// Eliminar archivo config local (ya no necesario con polling, pero se mantiene por compatibilidad)
function removeConfigFile() {
  // Ya no se eliminan archivos config localmente porque el polling los detecta directamente
  // Esta función se mantiene por compatibilidad pero no hace nada
  return null;
}

// Eliminar archivo config en PC remota (Manager)
async function removeConfigFileFromManager(configFileName) {
  try {
    // console.log('🗑️ Eliminando archivo config en PC remota...');
    
    if (!managerConfig.ip || !managerConfig.port) {
      // console.log('⚠️ Manager no configurado, saltando eliminación remota');
      return;
    }
    
    if (!configFileName) {
      // console.log('⚠️ No se especificó nombre de archivo config, saltando eliminación remota');
      return;
    }
    
    const managerUrl = `http://${managerConfig.ip}:${managerConfig.port}`;
    const deleteUrl = `${managerUrl}/delete-config`;
    const requestData = {
      action: 'delete-config',
      fileName: configFileName,
      timestamp: new Date().toISOString()
    };
    
    // console.log(`🌐 Conectando al Manager: ${managerUrl}`);
    // console.log(`📄 Archivo a eliminar: ${configFileName}`);
    // console.log(`🔗 URL completa: ${deleteUrl}`);
    // console.log(`📤 Datos enviados:`, JSON.stringify(requestData, null, 2));
    
    // Configurar timeout para la conexión
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
    
    // Enviar solicitud para eliminar archivo config específico
    const response = await fetch(deleteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    // console.log(`📥 Respuesta recibida: HTTP ${response.status} - ${response.statusText}`);
    // console.log(`📥 Headers de respuesta:`, Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const result = await response.json();
      // console.log('✅ Archivo config eliminado en PC remota:', result);
    } else {
      console.error(`❌ [DELETE-CONFIG] Error eliminando config remoto: HTTP ${response.status} - ${response.statusText}`);
      console.error(`❌ [DELETE-CONFIG] ConfigFileName: ${configFileName}`);
      console.log('💡 Verificar que el Manager esté ejecutándose y tenga el endpoint /delete-config');
      
      // Intentar leer el cuerpo de la respuesta para más detalles
      try {
        const errorText = await response.text();
        console.error('❌ [DELETE-CONFIG] Cuerpo de respuesta de error:', errorText);
      } catch (e) {
        console.error('❌ [DELETE-CONFIG] No se pudo leer el cuerpo de la respuesta:', e.message);
      }
    }
    
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ [DELETE-CONFIG] Timeout conectando al Manager (10 segundos)');
      console.error('❌ [DELETE-CONFIG] ConfigFileName:', configFileName);
      console.log('💡 Verificar que el Manager esté ejecutándose en la IP y puerto correctos');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ [DELETE-CONFIG] Conexión rechazada por el Manager');
      console.error('❌ [DELETE-CONFIG] ConfigFileName:', configFileName);
      console.log('💡 Posibles causas:');
      console.log('   - Manager no está ejecutándose');
      console.log('   - Puerto incorrecto o bloqueado por firewall');
      console.log('   - IP incorrecta');
    } else if (error.code === 'ENOTFOUND') {
      console.error('❌ [DELETE-CONFIG] No se puede resolver la IP del Manager');
      console.error('❌ [DELETE-CONFIG] ConfigFileName:', configFileName);
      console.log('💡 Verificar que la IP sea correcta y esté accesible');
    } else {
      console.error('❌ [DELETE-CONFIG] Error eliminando archivo config en PC remota:', error.message);
      console.error('❌ [DELETE-CONFIG] Stack:', error.stack);
      console.error('❌ [DELETE-CONFIG] ConfigFileName:', configFileName);
    }
    
    // console.log('⚠️ Continuando con el proceso local (eliminación remota falló)');
  }
}

// Reiniciar player
function restartPlayer() {
  try {
    // console.log('🔄 Reiniciando player...');
    
    // Notificar al reproductor principal para que reinicie
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('restart-player', {
        reason: 'content-updated',
        timestamp: new Date().toISOString()
      });
    }
    
    // console.log('✅ Player reiniciado con contenido nuevo');
    
  } catch (error) {
    // console.error('❌ Error reiniciando player:', error);
  }
}

// Proceso completo de actualización
async function updatePlayerContent(tempPath, tempVideosPath) {
  try {
    console.log('🚀 [UPDATE-CONTENT] Iniciando actualización del contenido del player...');
    
    // 1. Detener reproducción
    console.log('⏹️ [UPDATE-CONTENT] Deteniendo reproducción...');
    stopPlayerPlayback();
    
    // 2. Copiar videos de temp a directorio principal (ruta fija)
    const mainVideosPath = FIXED_PATHS.videos;
    console.log(`📁 [UPDATE-CONTENT] Copiando videos de ${tempVideosPath} a ${mainVideosPath}...`);
    copyVideosToMainDirectory(tempVideosPath, mainVideosPath);
    
    // 3. Leer archivos válidos del JSON de temp
    console.log(`📄 [UPDATE-CONTENT] Leyendo archivos válidos del JSON en ${tempPath}...`);
    const validFiles = getFilesFromTempJson(tempPath);
    console.log(`📋 [UPDATE-CONTENT] Archivos válidos encontrados: ${validFiles.length}`);
    validFiles.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    
    // 4. Eliminar archivos residuales
    console.log(`🗑️ [UPDATE-CONTENT] Eliminando archivos residuales de ${mainVideosPath}...`);
    removeResidualFiles(mainVideosPath, validFiles);
    
    // 5. Actualizar JSON del proyecto (ruta fija)
    const mainPath = FIXED_PATHS.programacion;
    console.log(`📄 [UPDATE-CONTENT] Actualizando JSON del proyecto en ${mainPath}...`);
    updateProjectJson(tempPath, mainPath);
    
    // 6. Limpiar directorio temp
    console.log(`🧹 [UPDATE-CONTENT] Limpiando directorio temp ${tempPath}...`);
    cleanupTempDirectory(tempPath);
    
    // 7. Eliminar archivo config local
    console.log(`🗑️ [UPDATE-CONTENT] Eliminando archivo config local...`);
    const deletedConfigFile = removeConfigFile();
    
    // 8. Eliminar archivo config en PC remota
    if (deletedConfigFile) {
      console.log(`🗑️ [UPDATE-CONTENT] Eliminando archivo config remoto: ${deletedConfigFile}`);
      await removeConfigFileFromManager(deletedConfigFile);
    } else {
      console.log('⚠️ [UPDATE-CONTENT] No hay archivo config local para eliminar remotamente');
    }
    
    console.log('🎉 [UPDATE-CONTENT] Actualización del contenido completada exitosamente');
    
    // Notificar al panel de control que terminó la descarga ANTES de reiniciar
    // console.log('📤 Intentando notificar al panel de control...');
    // console.log('📤 secondWindow existe:', !!secondWindow);
    // console.log('📤 secondWindow.webContents existe:', !!(secondWindow && secondWindow.webContents));
    
    if (secondWindow && secondWindow.webContents) {
      // console.log('📤 Enviando notificación download-completed...');
      secondWindow.webContents.send('download-completed', {
        timestamp: new Date().toISOString(),
        message: 'Contenido actualizado exitosamente'
      });
      // console.log('📤 Notificación enviada exitosamente');
    } else {
      // console.error('❌ No se puede notificar al panel de control - secondWindow no disponible');
    }
    
    // Esperar un momento para que el panel procese la notificación
    setTimeout(() => {
      // 9. Reiniciar player
      restartPlayer();
    }, 1000);
    
  } catch (error) {
    // console.error('❌ Error en actualización del contenido:', error);
    
    // Notificar error al panel de control
    if (secondWindow && secondWindow.webContents) {
      secondWindow.webContents.send('download-error', {
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }
}

// ===== PROCESAMIENTO DE ARCHIVOS DEL MANAGER =====

// Crear directorio temp/videos (usando rutas fijas)
function ensureTempDirectories() {
  if (!fs.existsSync(FIXED_PATHS.temp)) {
    fs.mkdirSync(FIXED_PATHS.temp, { recursive: true });
    // console.log('Directorio temp creado:', FIXED_PATHS.temp);
  }
  
  if (!fs.existsSync(FIXED_PATHS.tempVideos)) {
    fs.mkdirSync(FIXED_PATHS.tempVideos, { recursive: true });
    // console.log('Directorio temp/videos creado:', FIXED_PATHS.tempVideos);
  }
  
  return { tempPath: FIXED_PATHS.temp, tempVideosPath: FIXED_PATHS.tempVideos };
}

// Verificar integridad de archivo descargado
// Función helper para encontrar FFmpeg
function getFFmpegPath() {
  const { app } = require('electron');
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // En desarrollo, buscar en PATH o en carpeta local
    return 'ffmpeg';
  } else {
    // En producción, buscar en recursos de la app
    const ffmpegPath = path.join(process.resourcesPath, 'ffmpeg', 'ffmpeg.exe');
    if (fs.existsSync(ffmpegPath)) {
      return ffmpegPath;
    }
    // Fallback a PATH
    return 'ffmpeg';
  }
}

async function verifyFileIntegrity(downloadedFilePath, expectedHash, expectedSize) {
  try {
    // 1. Verificar que el archivo existe
    if (!fs.existsSync(downloadedFilePath)) {
      throw new Error('Archivo no existe');
    }

    // 2. Verificar tamaño del archivo
    const stats = fs.statSync(downloadedFilePath);
    if (stats.size !== expectedSize) {
      throw new Error(`Tamaño incorrecto: esperado ${expectedSize}, obtenido ${stats.size}`);
    }

    // 3. Verificar con FFmpeg (reemplaza validación de hash)
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const ffmpegPath = getFFmpegPath();
    const command = `"${ffmpegPath}" -v error -i "${downloadedFilePath}" -f null - 2>&1`;
    
    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 60000 }); // 60 segundos timeout
      
      // IMPORTANTE: Con 2>&1, los errores de FFmpeg van a stdout, no a stderr
      // Combinar ambas salidas para capturar todos los errores
      const combinedOutput = (stdout || '') + (stderr || '');
      
      // Con -v error, cualquier salida es un error crítico
      // FFmpeg solo muestra errores cuando se usa -v error, no warnings
      if (combinedOutput && combinedOutput.trim().length > 0) {
        // Cualquier línea en la salida con -v error es un error crítico
        const errorLines = combinedOutput
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        if (errorLines.length > 0) {
          // Mostrar los primeros 5 errores para el log
          const errorPreview = errorLines.slice(0, 5).join('; ');
          const errorCount = errorLines.length > 5 ? ` (y ${errorLines.length - 5} más)` : '';
          console.error(`   ❌ [VERIFY-FFMPEG] Errores detectados: ${errorPreview}${errorCount}`);
          throw new Error(`Video dañado: ${errorPreview}${errorCount}`);
        }
      }
      
      console.log(`   ✅ [VERIFY-FFMPEG] Video verificado correctamente con FFmpeg`);
      return true;
    } catch (ffmpegError) {
      if (ffmpegError.code === 'ENOENT') {
        console.warn(`   ⚠️ [VERIFY-FFMPEG] FFmpeg no encontrado, usando validación de tamaño solamente`);
        // Si FFmpeg no está disponible, solo validar tamaño
        return true;
      }
      // Si FFmpeg detecta corrupción, lanzar error
      throw ffmpegError;
    }
  } catch (error) {
    console.error(`   ❌ [VERIFY] Error verificando integridad:`, error.message);
    throw error; // Lanzar error para que downloadWithRetry lo maneje
  }
}

// Verificación opcional con FFmpeg para detectar corrupción que el hash no detecta
async function verifyVideoWithFFmpeg(videoPath) {
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    // Ejecutar FFmpeg para verificar el video
    const command = `ffmpeg -v error -i "${videoPath}" -f null - 2>&1`;
    const { stdout, stderr } = await execAsync(command);
    
    // Si hay errores en stderr, el video está corrupto
    if (stderr && stderr.trim().length > 0) {
      // Filtrar solo errores críticos (no warnings)
      const criticalErrors = stderr
        .split('\n')
        .filter(line => 
          line.toLowerCase().includes('error') ||
          line.toLowerCase().includes('corrupt') ||
          line.toLowerCase().includes('invalid')
        );
      
      if (criticalErrors.length > 0) {
        throw new Error(`Video dañado: ${criticalErrors.join('; ')}`);
      }
    }
    
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`   ⚠️ [FFMPEG] FFmpeg no encontrado, omitiendo verificación adicional`);
      return true; // No fallar si FFmpeg no está disponible
    }
    throw error;
  }
}

// Mapa para rastrear descargas en progreso y evitar duplicados
const activeDownloads = new Map();

// Descargar archivo desde el Manager con progreso
async function downloadFileFromManager(filePath, managerUrl, terminalId, onProgress) {
  try {
    // Agregar timestamp único a la URL para forzar descarga fresca (evitar caché)
    const timestamp = Date.now();
    const downloadUrl = `${managerUrl}/download?file=${encodeURIComponent(filePath)}&_t=${timestamp}`;
    console.log(`   🌐 [DOWNLOAD] URL: ${downloadUrl}`);
    console.log(`   🕐 [DOWNLOAD] Timestamp único: ${timestamp} (para evitar caché)`);
    
    // Enviar la ruta completa del archivo como parámetro con timeout
    // Timeout de 5 minutos para archivos grandes (300000ms)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutos
    
    let response;
    try {
      // Deshabilitar caché HTTP para asegurar que siempre se descargue el archivo
      response = await fetch(downloadUrl, { 
        signal: controller.signal,
        cache: 'no-store', // Deshabilitar caché HTTP
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error(`   ❌ [DOWNLOAD] Timeout descargando archivo: ${filePath}`);
        throw new Error('DOWNLOAD_TIMEOUT');
      }
      throw fetchError;
    }
    
    // Detectar HTTP 409 (Conflict - archivo en transferencia)
    if (response.status === 409) {
      console.log(`   ⚠️ [DOWNLOAD] HTTP 409 - Archivo en transferencia, esperando...`);
      throw new Error('HTTP_409_CONFLICT');
    }
    
    if (!response.ok) {
      console.error(`   ❌ [DOWNLOAD] Error HTTP ${response.status}: ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    console.log(`   ✅ [DOWNLOAD] Respuesta OK, iniciando descarga...`);
    
    // Obtener el tamaño total del archivo
    const contentLength = response.headers.get('content-length');
    const totalSize = contentLength ? parseInt(contentLength) : 0;
    console.log(`   📊 [DOWNLOAD] Tamaño esperado: ${totalSize} bytes (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
    
    if (totalSize === 0) {
      // Si no hay content-length, descargar normalmente
      const buffer = await response.arrayBuffer();
      const result = Buffer.from(buffer);
      console.log(`   📊 [DOWNLOAD] Archivo descargado sin content-length: ${result.length} bytes`);
      return result;
    }
    
    // Descargar con progreso
    const reader = response.body.getReader();
    const chunks = [];
    let downloadedSize = 0;
    let lastReportedProgress = -1; // Para rastrear el último progreso reportado
    let chunkCount = 0; // Contador de chunks recibidos
    
    console.log(`   📥 [DOWNLOAD] Iniciando lectura del stream...`);
    const startTime = Date.now();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          const elapsedTime = Date.now() - startTime;
          console.log(`   📊 [DOWNLOAD] Stream completado. Descargado: ${downloadedSize} bytes de ${totalSize} esperados en ${elapsedTime}ms`);
          console.log(`   📊 [DOWNLOAD] Total de chunks recibidos: ${chunkCount}`);
          
          // Asegurar que se reporte el progreso final antes de terminar
          if (onProgress && downloadedSize > 0) {
            const fileProgress = Math.floor((downloadedSize / totalSize) * 100);
            // Solo reportar si no se reportó antes o si es 100%
            if (fileProgress !== lastReportedProgress || fileProgress === 100) {
              try {
                console.log(`   📊 [DOWNLOAD] Reportando progreso final: ${fileProgress}%`);
                await onProgress(downloadedSize, totalSize, fileProgress);
                lastReportedProgress = fileProgress;
              } catch (err) {
                console.warn(`   ⚠️ [DOWNLOAD] Error en callback de progreso final:`, err.message);
              }
            }
          }
          break;
        }
        
        if (!value || value.length === 0) {
          console.warn(`   ⚠️ [DOWNLOAD] Chunk vacío recibido`);
          continue;
        }
        
        chunkCount++;
        chunks.push(value);
        downloadedSize += value.length;
        
        // Log cada 10 chunks o si es el primer chunk
        if (chunkCount === 1 || chunkCount % 10 === 0) {
          console.log(`   📦 [DOWNLOAD] Chunk ${chunkCount}: ${value.length} bytes (Total: ${downloadedSize}/${totalSize} bytes)`);
        }
        
        // Calcular progreso del archivo actual
        const fileProgress = Math.floor((downloadedSize / totalSize) * 100);
        
        // Llamar callback de progreso si se proporciona
        // Solo llamar cada 1% de progreso para evitar spam y problemas de concurrencia
        if (onProgress && fileProgress !== lastReportedProgress) {
          try {
            // Ejecutar callback de forma síncrona con await para asegurar que se complete
            // antes de procesar el siguiente chunk
            await onProgress(downloadedSize, totalSize, fileProgress);
            lastReportedProgress = fileProgress;
          } catch (err) {
            console.warn(`   ⚠️ [DOWNLOAD] Error en callback de progreso:`, err.message);
          }
        }
      }
    } catch (streamError) {
      console.error(`   ❌ [DOWNLOAD] Error leyendo stream:`, streamError.message);
      reader.releaseLock();
      throw streamError;
    } finally {
      reader.releaseLock();
    }
    
    // Verificar que el tamaño descargado coincida con el esperado
    if (downloadedSize !== totalSize) {
      console.error(`   ❌ [DOWNLOAD] Tamaño incorrecto: esperado ${totalSize}, descargado ${downloadedSize} (diferencia: ${totalSize - downloadedSize} bytes)`);
      throw new Error(`Tamaño incorrecto: esperado ${totalSize}, descargado ${downloadedSize}`);
    }
    
    // Combinar todos los chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    
    if (totalLength !== downloadedSize) {
      console.error(`   ❌ [DOWNLOAD] Inconsistencia en chunks: totalLength=${totalLength}, downloadedSize=${downloadedSize}`);
      throw new Error(`Inconsistencia en chunks: totalLength=${totalLength}, downloadedSize=${downloadedSize}`);
    }
    
    const buffer = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    console.log(`   ✅ [DOWNLOAD] Archivo descargado completamente: ${totalLength} bytes`);
    
    // Asegurar que se reporte el progreso final (100%) si no se reportó antes
    if (onProgress && downloadedSize === totalSize) {
      try {
        await onProgress(downloadedSize, totalSize, 100);
      } catch (err) {
        console.warn(`   ⚠️ [DOWNLOAD] Error en callback de progreso final:`, err.message);
      }
    }
    
    // Calcular hash del buffer en memoria para diagnosticar problemas
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    const calculatedHash = hash.digest('hex');
    console.log(`   🔍 [DOWNLOAD] Hash SHA-256 del buffer en memoria: sha256:${calculatedHash}`);
    
    return Buffer.from(buffer);
  } catch (error) {
    // Detectar error "terminated" - es recuperable
    if (error.message === 'terminated' || error.message.includes('terminated')) {
      console.error(`   ⚠️ [DOWNLOAD-FILE] Conexión terminada (recuperable): ${filePath}`);
      throw new Error('CONNECTION_TERMINATED');
    }
    
    // Detectar HTTP 409
    if (error.message === 'HTTP_409_CONFLICT') {
      throw error; // Re-lanzar para que downloadWithRetry lo maneje
    }
    
    console.error(`❌ [DOWNLOAD-FILE] Error descargando ${filePath}:`, error.message);
    console.error(`❌ [DOWNLOAD-FILE] Stack:`, error.stack);
    throw error;
  }
}

// Descargar archivo con reintentos y verificación de integridad
async function downloadWithRetry(file, managerUrl, terminalId, destinationPath, onProgress, maxRetries = 3) {
  const { absolutePath, hash, size, name } = file;
  const fileKey = `${managerUrl}:${absolutePath}`;
  
  // Verificar si ya hay una descarga en progreso para este archivo
  if (activeDownloads.has(fileKey)) {
    console.log(`   ⏸️ [RETRY] Esperando que termine la descarga en progreso de: ${name}`);
    // Esperar a que termine la descarga existente
    while (activeDownloads.has(fileKey)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    // Verificar si el archivo ya fue descargado
    if (fs.existsSync(destinationPath)) {
      try {
        await verifyFileIntegrity(destinationPath, hash, size);
        console.log(`   ✅ [RETRY] Archivo ya descargado y verificado: ${name}`);
        return fs.readFileSync(destinationPath);
      } catch (verifyError) {
        console.log(`   ⚠️ [RETRY] Archivo existente no válido, reintentando descarga: ${name}`);
      }
    }
  }
  
  // Marcar descarga como activa
  activeDownloads.set(fileKey, true);
  
  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`   🔄 [RETRY] Intento ${attempt}/${maxRetries} de descarga: ${name}`);
        
        // Si es un reintento (attempt > 1), resetear lastSentPercent y notificar al Manager
        if (attempt > 1) {
          // Resetear lastSentPercent antes de empezar
          if (onProgress) {
            try {
              await onProgress(0, 0, -1); // Flag especial para resetear lastSentPercent
            } catch (err) {
              console.warn(`   ⚠️ [RETRY] Error reseteando lastSentPercent:`, err.message);
            }
          }
          
          // Notificar al Manager que se está reintentando
          await notifyFileRetry(terminalId, name, attempt, maxRetries, 'Reintentando descarga...');
        }
        
        // Función de callback para progreso durante la descarga
        const progressCallback = async (fileDownloadedSize, fileTotalSize, fileProgress) => {
          if (onProgress) {
            try {
              await onProgress(fileDownloadedSize, fileTotalSize, fileProgress);
            } catch (err) {
              console.warn(`   ⚠️ [RETRY] Error en callback onProgress:`, err.message);
            }
          }
        };
        
        // Descargar archivo
        const fileBuffer = await downloadFileFromManager(absolutePath, managerUrl, terminalId, progressCallback);
        console.log(`   ✅ [RETRY] Archivo descargado: ${name} - ${fileBuffer.length} bytes`);
        
        // Escritura atómica: escribir primero a archivo temporal, luego renombrar
        const tempPath = destinationPath + '.tmp';
        
        // Limpiar archivo temporal previo si existe (de un intento anterior fallido)
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
            console.log(`   🗑️ [RETRY] Archivo temporal previo eliminado: ${tempPath}`);
          } catch (unlinkError) {
            console.warn(`   ⚠️ [RETRY] No se pudo eliminar archivo temporal previo: ${unlinkError.message}`);
          }
        }
        
        // Escribir a archivo temporal
        console.log(`   💾 [RETRY] Escribiendo a archivo temporal: ${tempPath}`);
        fs.writeFileSync(tempPath, fileBuffer);
        
        // Verificar que el archivo temporal esté completo
        const tempStats = fs.statSync(tempPath);
        if (tempStats.size !== fileBuffer.length) {
          console.error(`   ❌ [RETRY] Archivo temporal incompleto: esperado ${fileBuffer.length} bytes, escrito ${tempStats.size} bytes`);
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
          throw new Error(`Archivo temporal incompleto: esperado ${fileBuffer.length} bytes, escrito ${tempStats.size} bytes`);
        }
        
        console.log(`   ✅ [RETRY] Archivo temporal completo: ${tempStats.size} bytes`);
        
        // Verificar integridad del archivo temporal antes de renombrar
        try {
          await verifyFileIntegrity(tempPath, hash, size);
          console.log(`   ✅ [VERIFY] Archivo temporal verificado correctamente: ${name}`);
          
          // Renombrar archivo temporal al nombre final (operación atómica)
          // Si el archivo final ya existe, eliminarlo primero (puede ser de un intento anterior)
          if (fs.existsSync(destinationPath)) {
            try {
              fs.unlinkSync(destinationPath);
              console.log(`   🗑️ [RETRY] Archivo final previo eliminado antes de renombrar: ${destinationPath}`);
            } catch (unlinkError) {
              console.warn(`   ⚠️ [RETRY] No se pudo eliminar archivo final previo: ${unlinkError.message}`);
            }
          }
          
          fs.renameSync(tempPath, destinationPath);
          console.log(`   ✅ [RETRY] Archivo renombrado exitosamente: ${destinationPath}`);
          console.log(`   💾 [RETRY] Archivo guardado atómicamente: ${destinationPath}`);
          
          return fileBuffer; // Retornar buffer si todo está bien
          
        } catch (verifyError) {
          console.error(`   ❌ [VERIFY] Error en verificación:`, verifyError.message);
          
          // Notificar al Manager sobre el reintento
          await notifyFileRetry(terminalId, name, attempt, maxRetries, verifyError.message);
          
          // Eliminar archivo temporal corrupto
          if (fs.existsSync(tempPath)) {
            try {
              fs.unlinkSync(tempPath);
              console.log(`   🗑️ [RETRY] Archivo temporal corrupto eliminado: ${tempPath}`);
            } catch (unlinkError) {
              console.warn(`   ⚠️ [RETRY] No se pudo eliminar archivo temporal corrupto: ${unlinkError.message}`);
            }
          }
          
          // También eliminar archivo final si existe (por si acaso)
          if (fs.existsSync(destinationPath)) {
            try {
              fs.unlinkSync(destinationPath);
              console.log(`   🗑️ [RETRY] Archivo final eliminado (por seguridad): ${destinationPath}`);
            } catch (unlinkError) {
              // Ignorar errores al eliminar
            }
          }
          
          if (attempt < maxRetries) {
            // Esperar antes de reintentar (backoff exponencial mejorado)
            const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000); // 5s, 10s, 20s (máx 30s)
            console.log(`   ⏳ [RETRY] Esperando ${waitTime}ms antes de reintentar...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          } else {
            throw new Error(`No se pudo descargar y verificar el archivo después de ${maxRetries} intentos: ${verifyError.message}`);
          }
        }
        
      } catch (error) {
        console.error(`   ❌ [RETRY] Error en intento ${attempt}:`, error.message);
        
        // Limpiar archivos temporales y finales si existen
        const tempPath = destinationPath + '.tmp';
        
        // Eliminar archivo temporal si existe
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
            console.log(`   🗑️ [RETRY] Archivo temporal eliminado después de error: ${tempPath}`);
          } catch (unlinkError) {
            // Ignorar errores al eliminar
          }
        }
        
        // Eliminar archivo final si existe (puede ser de un intento anterior)
        if (fs.existsSync(destinationPath)) {
          try {
            fs.unlinkSync(destinationPath);
            console.log(`   🗑️ [RETRY] Archivo final eliminado después de error: ${destinationPath}`);
          } catch (unlinkError) {
            // Ignorar errores al eliminar
          }
        }
        
        // Detectar errores recuperables
        const isRecoverableError = error.message === 'HTTP_409_CONFLICT' || 
                                   error.message === 'CONNECTION_TERMINATED' ||
                                   error.message === 'DOWNLOAD_TIMEOUT' ||
                                   error.message.includes('terminated');
        
        if (attempt < maxRetries) {
          // Calcular tiempo de espera según el tipo de error
          let waitTime;
          if (error.message === 'HTTP_409_CONFLICT') {
            // Para 409, esperar más tiempo (el archivo está en transferencia)
            waitTime = Math.min(10000 * attempt, 30000); // 10s, 20s, 30s
            console.log(`   ⏳ [RETRY] HTTP 409 - Esperando ${waitTime}ms antes de reintentar...`);
          } else if (error.message === 'DOWNLOAD_TIMEOUT') {
            waitTime = Math.min(10000 * attempt, 30000); // 10s, 20s, 30s
            console.log(`   ⏳ [RETRY] Timeout en descarga - Esperando ${waitTime}ms antes de reintentar...`);
          } else if (error.message.includes('Tamaño incorrecto') || error.message.includes('Inconsistencia')) {
            waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000); // 5s, 10s, 20s (máx 30s)
            console.log(`   ⏳ [RETRY] Error de tamaño/integridad - Esperando ${waitTime}ms antes de reintentar...`);
          } else if (isRecoverableError) {
            // Para errores recuperables, backoff exponencial mejorado
            waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000); // 5s, 10s, 20s (máx 30s)
            console.log(`   ⏳ [RETRY] Error recuperable - Esperando ${waitTime}ms antes de reintentar...`);
          } else {
            // Para otros errores, backoff exponencial estándar
            waitTime = Math.min(3000 * Math.pow(2, attempt - 1), 20000); // 3s, 6s, 12s (máx 20s)
            console.log(`   ⏳ [RETRY] Esperando ${waitTime}ms antes de reintentar...`);
          }
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          throw new Error(`No se pudo descargar el archivo después de ${maxRetries} intentos: ${error.message}`);
        }
      }
    }
    
    throw new Error(`No se pudo descargar el archivo después de ${maxRetries} intentos`);
  } finally {
    // Liberar el bloqueo de descarga
    activeDownloads.delete(fileKey);
  }
}

// Verificar si un archivo necesita ser descargado
function shouldDownloadFile(file, videosPath) {
  const localFilePath = path.join(videosPath, file.name);
  
  // Verificar si el archivo existe
  if (!fs.existsSync(localFilePath)) {
    // console.log(`Archivo no existe localmente: ${file.name}`);
    return true;
  }
  
  // Verificar hash si está disponible
  if (file.hash) {
    try {
      const crypto = require('crypto');
      const fileBuffer = fs.readFileSync(localFilePath);
      const localHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      const expectedHash = file.hash.replace('sha256:', '');
      
      if (localHash !== expectedHash) {
        // console.log(`Hash diferente para ${file.name}:`);
        // console.log(`  Local: ${localHash}`);
        // console.log(`  Esperado: ${expectedHash}`);
        return true;
      } else {
        // console.log(`Archivo ${file.name} ya existe y hash coincide - saltando descarga`);
        return false;
      }
    } catch (error) {
      // console.error(`Error verificando hash de ${file.name}:`, error);
      return true; // Descargar si hay error verificando hash
    }
  }
  
  // Si no hay hash, asumir que necesita descarga
  // console.log(`No hay hash disponible para ${file.name} - descargando`);
  return true;
}

// Función para enviar heartbeat al manager durante descargas (solo para mantener comunicación, NO busca updates)
async function sendHeartbeatToManager() {
  try {
    if (!managerConfig.hostname || !managerConfig.terminalId) {
      return;
    }
    
    // Usar un endpoint diferente o el mismo pero con un parámetro que indique que es solo heartbeat
    // Para mantener comunicación sin buscar actualizaciones
    const managerUrl = `http://${managerConfig.hostname}:${MANAGER_PORT}`;
    const heartbeatUrl = `${managerUrl}/check-updates?terminalId=${encodeURIComponent(managerConfig.terminalId)}&lastVersion=heartbeat&heartbeat=true`;
    
    const https = require('https');
    const http = require('http');
    const url = require('url');
    
    const parsedUrl = new URL(heartbeatUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const response = await new Promise((resolve, reject) => {
      const req = client.get(parsedUrl, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode === 200,
            status: res.statusCode
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
    
    // No importa la respuesta, solo mantener comunicación activa
    return response.ok;
  } catch (error) {
    // Ignorar errores de heartbeat, no interrumpir descarga
    return false;
  }
}

// Iniciar heartbeat durante descargas
let heartbeatInterval = null;
function startDownloadHeartbeat() {
  // Enviar heartbeat cada 20 segundos durante descargas
  if (heartbeatInterval) {
    return; // Ya está activo
  }
  
  heartbeatInterval = setInterval(() => {
    if (isDownloading) {
      sendHeartbeatToManager();
    } else {
      // Si no hay descarga, detener heartbeat
      stopDownloadHeartbeat();
    }
  }, 20000); // Cada 20 segundos
}

function stopDownloadHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Procesar archivos del Manager
async function processManagerFiles(configData, configFileName) {
  try {
    console.log('🚀 [PROCESS-MANAGER-FILES] Iniciando procesamiento de archivos del Manager...');
    console.log(`📋 [PROCESS-MANAGER-FILES] ConfigFileName: ${configFileName}`);
    console.log(`📋 [PROCESS-MANAGER-FILES] Terminal ID: ${configData.terminal?.connId || configData.terminal?.id}`);
    console.log(`📋 [PROCESS-MANAGER-FILES] Proyecto: ${configData.projectName || 'N/A'}`);
    
    // Crear directorios temp
    const { tempPath, tempVideosPath } = ensureTempDirectories();
    console.log(`📁 [PROCESS-MANAGER-FILES] TempPath: ${tempPath}`);
    console.log(`📁 [PROCESS-MANAGER-FILES] TempVideosPath: ${tempVideosPath}`);
    
    // Directorio de videos actuales (ruta fija)
    const currentVideosPath = FIXED_PATHS.videos;
    console.log(`📁 [PROCESS-MANAGER-FILES] CurrentVideosPath: ${currentVideosPath}`);
    
    // URL base del Manager (usando hostname y puerto fijo)
    const managerUrl = `http://${managerConfig.hostname}:${MANAGER_PORT}`;
    console.log(`🌐 [PROCESS-MANAGER-FILES] Manager URL: ${managerUrl}`);
    
    // Calcular tamaño total para progreso
    const totalSize = configData.files ? configData.files.reduce((total, file) => total + file.size, 0) : 0;
    const bytesPerPercent = totalSize > 0 ? Math.floor(totalSize / 100) : 1;
    console.log(`📦 [PROCESS-MANAGER-FILES] Tamaño total a descargar: ${totalSize} bytes (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
    console.log(`📊 [PROCESS-MANAGER-FILES] 1% = ${bytesPerPercent} bytes`);
    
    // Variables para tracking de progreso
    let downloadedSize = 0;
    let lastSentPercent = 0;
    
    // Variables para tracking de errores (inicializadas antes de procesar archivos)
    let filesError = 0;
    const failedFiles = []; // Array para rastrear archivos que fallaron (con toda su info)
    let filesToDownload = 0; // Inicializar fuera del bloque if
    let filesSkipped = 0; // Inicializar fuera del bloque if
    
    // Procesar archivos de video
    if (configData.files && Array.isArray(configData.files)) {
      console.log(`📋 [PROCESS-MANAGER-FILES] Total de archivos en config: ${configData.files.length}`);
      
      for (let i = 0; i < configData.files.length; i++) {
        const file = configData.files[i];
        console.log(`\n📄 [PROCESS-MANAGER-FILES] Archivo ${i + 1}/${configData.files.length}:`);
        console.log(`   - Nombre: ${file.name}`);
        console.log(`   - Tipo: ${file.type}`);
        console.log(`   - Tamaño: ${file.size} bytes (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        console.log(`   - Ruta absoluta: ${file.absolutePath || 'N/A'}`);
        console.log(`   - Hash: ${file.hash || 'N/A'}`);
        
        if (file.type === 'video' && file.absolutePath) {
          const localFilePath = path.join(tempVideosPath, file.name);
          try {
            // Verificar si el archivo necesita ser descargado
            const shouldDownload = shouldDownloadFile(file, currentVideosPath);
            console.log(`   - ¿Necesita descarga?: ${shouldDownload ? 'SÍ' : 'NO'}`);
            
            if (shouldDownload) {
              console.log(`   ⬇️ [DESCARGANDO] Iniciando descarga de: ${file.name}`);
              
              // Obtener terminalId (usar connId si existe, sino usar id)
              const terminalId = configData.terminal?.connId || configData.terminal?.id;
              
              // Función de callback para progreso durante la descarga
              const onProgress = async (fileDownloadedSize, fileTotalSize, fileProgress) => {
                // Flag especial: si fileProgress es -1, resetear lastSentPercent (para reintentos)
                if (fileProgress === -1) {
                  lastSentPercent = 0;
                  console.log(`   🔄 [PROGRESO] Reset de lastSentPercent para reintento`);
                  return;
                }
                
                // Calcular progreso total incluyendo archivos anteriores
                const totalDownloadedSize = downloadedSize + fileDownloadedSize;
                const currentPercent = Math.floor(totalDownloadedSize / bytesPerPercent);
                
                // Solo enviar si el porcentaje cambió
                if (currentPercent > lastSentPercent && terminalId) {
                  console.log(`   📥 [PROGRESO] ${currentPercent}% total (${totalDownloadedSize}/${totalSize} bytes) - Archivo: ${fileProgress}%`);
                  await sendProgressToManager(terminalId, currentPercent, totalDownloadedSize, totalSize);
                  lastSentPercent = currentPercent;
                }
              };
              
              // Descargar con reintentos y verificación de integridad (ahora usa FFmpeg en lugar de hash)
              const fileBuffer = await downloadWithRetry(file, managerUrl, terminalId, localFilePath, onProgress, 3);
              console.log(`   ✅ [DESCARGADO] ${file.name} - ${fileBuffer.length} bytes recibidos y verificados con FFmpeg`);
              
              // El archivo ya está guardado y verificado en downloadWithRetry
              // Solo actualizar el progreso final
              downloadedSize += fileBuffer.length;
              const currentPercent = Math.floor(downloadedSize / bytesPerPercent);
              
              // Enviar progreso final si cambió
              if (currentPercent > lastSentPercent && terminalId) {
                console.log(`   📥 [PROGRESO FINAL] ${currentPercent}% (${downloadedSize}/${totalSize} bytes)`);
                await sendProgressToManager(terminalId, currentPercent, downloadedSize, totalSize);
                lastSentPercent = currentPercent;
              }
              
              console.log(`   💾 [GUARDADO] ${localFilePath} (verificado)`);
              filesToDownload++;
            } else {
              console.log(`   ⏭️ [OMITIDO] El archivo ya existe o no necesita descarga`);
              filesSkipped++;
            }
            
          } catch (error) {
            console.error(`   ❌ [ERROR] Error procesando video ${file.name}:`, error.message);
            filesError++;
            // Guardar toda la información del archivo para reintentarlo
            failedFiles.push({ 
              file: file, // Guardar el objeto completo del archivo
              localFilePath: localFilePath,
              name: file.name, 
              error: error.message,
              attempts: 1 // Contador de intentos
            });
            
            // Eliminar solo este archivo específico si existe (no todos los archivos)
            if (fs.existsSync(localFilePath)) {
              try {
                fs.unlinkSync(localFilePath);
                console.log(`   🗑️ [LIMPIEZA] Archivo fallido eliminado: ${file.name}`);
              } catch (unlinkError) {
                console.warn(`   ⚠️ [LIMPIEZA] No se pudo eliminar archivo fallido ${file.name}:`, unlinkError.message);
              }
            }
          }
        } else {
          console.log(`   ⚠️ [OMITIDO] No es video o no tiene ruta absoluta (type: ${file.type}, absolutePath: ${file.absolutePath ? 'Sí' : 'No'})`);
        }
      }
      
      console.log(`\n📊 [PROCESS-MANAGER-FILES] Resumen inicial de videos:`);
      console.log(`   - Descargados: ${filesToDownload}`);
      console.log(`   - Omitidos: ${filesSkipped}`);
      console.log(`   - Errores iniciales: ${filesError}`);
    } else {
      console.log(`⚠️ [PROCESS-MANAGER-FILES] No hay archivos en configData.files o no es un array`);
    }
    
    // Procesar archivo JSON del proyecto (siempre descargar sin verificación)
    let jsonError = false;
    if (configData.projectJson && configData.projectJson.absolutePath) {
      try {
        console.log(`\n📄 [PROCESS-MANAGER-FILES] Descargando archivo JSON del proyecto...`);
        console.log(`   - Ruta: ${configData.projectJson.absolutePath}`);
        const jsonBuffer = await downloadFileFromManager(configData.projectJson.absolutePath, managerUrl);
        console.log(`   ✅ [DESCARGADO] JSON - ${jsonBuffer.length} bytes recibidos`);
        
        // Guardar JSON en temp/
        const jsonFileName = path.basename(configData.projectJson.absolutePath);
        const jsonPath = path.join(tempPath, jsonFileName);
        fs.writeFileSync(jsonPath, jsonBuffer);
        console.log(`   💾 [GUARDADO] ${jsonPath}`);
        
      } catch (error) {
        console.error(`   ❌ [ERROR] Error descargando JSON del proyecto:`, error.message);
        jsonError = true;
      }
    } else {
      console.log(`⚠️ [PROCESS-MANAGER-FILES] No hay projectJson o no tiene absolutePath`);
    }
    
    // Verificar estado final
    const hasErrors = failedFiles.length > 0 || jsonError;
    const hasSuccessfulDownloads = filesToDownload > 0;
    
    console.log(`\n📊 [PROCESS-MANAGER-FILES] Resumen final:`);
    console.log(`   - Descargados exitosamente: ${filesToDownload}`);
    console.log(`   - Omitidos: ${filesSkipped}`);
    console.log(`   - Fallaron definitivamente: ${failedFiles.length}`);
    
    // Si el JSON falló, es crítico - no podemos continuar sin el JSON del proyecto
    if (jsonError) {
      console.log(`\n❌ [PROCESS-MANAGER-FILES] Error crítico: No se pudo descargar el JSON del proyecto`);
      console.log(`   - Sin el JSON no se puede actualizar el contenido`);
      
      // Limpiar solo los archivos temporales (videos descargados no sirven sin JSON)
      console.log(`\n🧹 [PROCESS-MANAGER-FILES] Limpiando archivos temporales (sin JSON no se puede continuar)...`);
      try {
        if (fs.existsSync(tempPath)) {
          fs.rmSync(tempPath, { recursive: true, force: true });
          console.log(`   ✅ [LIMPIEZA] Directorio temp eliminado: ${tempPath}`);
        }
        if (fs.existsSync(tempVideosPath)) {
          fs.rmSync(tempVideosPath, { recursive: true, force: true });
          console.log(`   ✅ [LIMPIEZA] Directorio temp/videos eliminado: ${tempVideosPath}`);
        }
      } catch (cleanupError) {
        console.error(`   ❌ [LIMPIEZA] Error limpiando archivos temporales:`, cleanupError.message);
      }
      
      // Notificar al Manager solo si no hay archivos descargados exitosamente
      const terminalId = configData.terminal?.connId || configData.terminal?.id;
      if (terminalId && managerUrl && !hasSuccessfulDownloads) {
        try {
          console.log(`\n📤 [PROCESS-MANAGER-FILES] Notificando al Manager sobre el fallo crítico...`);
          const resetUrl = `${managerUrl}/reset-export`;
          const response = await fetch(resetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              terminalId: terminalId,
              reason: 'Error crítico: No se pudo descargar el JSON del proyecto'
            }),
            signal: AbortSignal.timeout(10000)
          });
          
          if (response.ok) {
            console.log(`   ✅ [RESET-EXPORT] Notificación enviada al Manager`);
          }
        } catch (resetError) {
          console.error(`   ❌ [RESET-EXPORT] Error notificando al Manager:`, resetError.message);
        }
      }
      
      // Notificar al panel de control sobre el error
      if (secondWindow && secondWindow.webContents) {
        secondWindow.webContents.send('download-error', {
          timestamp: new Date().toISOString(),
          error: `Error crítico: No se pudo descargar el JSON del proyecto`
        });
      }
      
      return; // Salir sin actualizar el contenido
    }
    
    // Si hay archivos que fallaron después de los 3 intentos, marcarlos como definitivamente fallidos
    if (failedFiles.length > 0) {
      console.log(`\n❌ [PROCESS-MANAGER-FILES] ${failedFiles.length} archivo(s) fallaron después de 3 intentos:`);
      failedFiles.forEach(f => {
        console.log(`   • ${f.name}: ${f.error}`);
      });
      
      // Si TODOS los archivos fallaron definitivamente, limpiar y reiniciar
      if (filesToDownload === 0) {
        console.log(`\n❌ [PROCESS-MANAGER-FILES] Todos los archivos fallaron definitivamente, limpiando y reiniciando...`);
        
        const terminalId = configData.terminal?.connId || configData.terminal?.id;
        if (terminalId && managerUrl) {
          try {
            console.log(`\n📤 [PROCESS-MANAGER-FILES] Notificando al Manager sobre el fallo completo...`);
            const resetUrl = `${managerUrl}/reset-export`;
            const response = await fetch(resetUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                terminalId: terminalId,
                reason: 'Todos los archivos fallaron después de 3 intentos'
              }),
              signal: AbortSignal.timeout(10000)
            });
            
            if (response.ok) {
              console.log(`   ✅ [RESET-EXPORT] Notificación enviada al Manager`);
            }
          } catch (resetError) {
            console.error(`   ❌ [RESET-EXPORT] Error notificando al Manager:`, resetError.message);
          }
        }
        
        // Limpiar solo si TODOS fallaron
        try {
          if (fs.existsSync(tempVideosPath)) {
            fs.rmSync(tempVideosPath, { recursive: true, force: true });
            console.log(`   ✅ [LIMPIEZA] Directorio temp/videos eliminado: ${tempVideosPath}`);
          }
        } catch (cleanupError) {
          console.error(`   ❌ [LIMPIEZA] Error limpiando archivos temporales:`, cleanupError.message);
        }
        
        // Notificar al panel de control sobre el error
        if (secondWindow && secondWindow.webContents) {
          secondWindow.webContents.send('download-error', {
            timestamp: new Date().toISOString(),
            error: `Todos los archivos fallaron después de 3 intentos: ${failedFiles.length} errores`
          });
        }
        
        return; // Salir sin actualizar el contenido
      } else {
        // Si algunos archivos se descargaron pero otros fallaron definitivamente
        console.log(`\n⚠️ [PROCESS-MANAGER-FILES] Algunos archivos fallaron definitivamente, pero continuando con los descargados correctamente (${filesToDownload} videos)`);
        console.log(`   - Los archivos que fallaron definitivamente no se incluirán en la actualización`);
      }
    }
    
    // Si no hay errores o hay archivos descargados correctamente, continuar
    if (!hasErrors || hasSuccessfulDownloads) {
      if (!hasErrors) {
        console.log(`\n✅ [PROCESS-MANAGER-FILES] Procesamiento de archivos del Manager completado sin errores`);
      } else {
        console.log(`\n✅ [PROCESS-MANAGER-FILES] Procesamiento completado con algunos errores, pero continuando con archivos válidos`);
      }
      console.log(`📁 [PROCESS-MANAGER-FILES] Archivos descargados en: ${tempVideosPath}`);
      console.log(`📄 [PROCESS-MANAGER-FILES] JSON del proyecto en: ${tempPath}`);
      
      // Iniciar proceso de actualización del contenido
      console.log(`\n🔄 [PROCESS-MANAGER-FILES] Iniciando actualización del contenido del player...`);
      await updatePlayerContent(tempPath, tempVideosPath);
      
      // Notificar al Manager que la descarga se completó exitosamente
      // Usar connId si existe, sino usar id (compatibilidad)
      const terminalId = configData.terminal?.connId || configData.terminal?.id;
      if (terminalId && configFileName) {
        console.log(`\n📤 [PROCESS-MANAGER-FILES] Notificando al Manager descarga completada...`);
        // Pasar los archivos que fallaron definitivamente (si los hay)
        await notifyDownloadCompleted(terminalId, configFileName, failedFiles);
        console.log(`✅ [PROCESS-MANAGER-FILES] Notificación enviada`);
        if (failedFiles.length > 0) {
          console.log(`⚠️ [PROCESS-MANAGER-FILES] Se notificaron ${failedFiles.length} archivo(s) que fallaron definitivamente`);
        }
      } else {
        console.log(`⚠️ [PROCESS-MANAGER-FILES] No se puede notificar: terminalId=${terminalId}, configFileName=${configFileName}`);
      }
    }
    
  } catch (error) {
    console.error(`❌ [PROCESS-MANAGER-FILES] Error procesando archivos del Manager:`, error.message);
    console.error(`   Stack:`, error.stack);
  } finally {
    // Asegurar que la bandera se resetee incluso si hay error
    isDownloading = false;
    stopDownloadHeartbeat();
  }
}
