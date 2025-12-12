const { ipcRenderer } = require('electron');

class PlayerManager {
    constructor() {
        this.currentPlaylist = null;
        this.currentIndex = 0;
        this.filteredItems = [];
        this.projectPath = '';
        this.isPlaying = false;
        this.player1 = null;
        this.player2 = null;
        this.activePlayer = 1; // 1 o 2
        this.currentItem = null;
        this.nextItemData = null;
        this.isPreloaded = false;
        this.isAutoTransition = false;
        this.isTransitioning = false; // Flag para prevenir múltiples transiciones simultáneas
        this.isStartingPlayback = false; // Flag para prevenir múltiples llamadas a startPlayback
        
        // Videos independientes
        this.securityVideoPath = null;
        this.loopVideoPath = null;
        this.loopEmbarqueVideoPath = null;
        this.currentMode = 'project'; // 'project', 'security', 'loop', 'loopEmbarque'
        this.isSecurityPlayed = false;
        
        // Sistema de audios
        this.loadedAudios = []; // Array de audios cargados
        this.loadedMusic = []; // Array de música cargada
        this.musicEnabled = false; // Si la música está activada para reproducir con placa de embarque
        this.currentMusicIndex = 0; // Índice de la música actual en reproducción
        this.currentMusic = null; // Audio de música actualmente reproduciéndose
        this.isPlayingMusic = false; // Bandera para evitar llamadas múltiples simultáneas
        this.currentAudio = null; // Audio actualmente reproduciéndose
        this.audioOverlay = null; // Elemento de overlay para placa de video
        this.originalProject = null; // Proyecto original guardado cuando se reproduce certificación
        this.originalProjectPath = null; // Path del proyecto original guardado cuando se reproduce certificación
        this.isCertificacionMode = false; // Flag para indicar si estamos en modo certificación
        this.audioVideoPath = null; // Ruta del video placa para audios
        this.originalVolume = 1; // Volumen original antes del audio
        
        // Configuración de cámara IP
        this.cameraConfig = null;
        
        // Intervalos y timeouts de webcam (para poder limpiarlos)
        this.webcamConnectionCheckInterval = null;
        this.webcamDurationTimeout = null;
        this.webcamImageElement = null;
        
        // Flag para evitar cargar proyecto múltiples veces
        this.projectLoadedOnInit = false;
        
        // Flag para saber cuando cargar el proyecto
        this.playersReady = { player1: false, player2: false };
        
        this.initializePlayer();
        this.setupEventListeners();
        this.setupControlPanelListeners();
        this.loadSavedVideos();
        this.loadSavedAudios();
        this.loadSavedMusic();
        this.loadCameraConfig();
        this.setupMainProcessListeners();
    }

    initializePlayer() {
        // Inicializar Video.js reproductor 1
        this.player1 = videojs('video-player', {
            controls: false,
            preload: 'auto',
            fluid: true,
            responsive: true,
            playbackRates: [0.5, 1, 1.25, 1.5, 2],
            html5: {
                vhs: {
                    overrideNative: true
                }
            }
        });

        // Inicializar Video.js reproductor 2
        this.player2 = videojs('video-player-2', {
            controls: false,
            preload: 'auto',
            fluid: true,
            responsive: true,
            playbackRates: [0.5, 1, 1.25, 1.5, 2],
            html5: {
                vhs: {
                    overrideNative: true
                }
            }
        });

        // Configurar eventos del reproductor 1
        this.player1.ready(() => {
            console.log('✅ Reproductor 1 listo');
            this.playersReady.player1 = true;
            this.checkPlayersReadyAndLoadProject();
        });

        this.player1.on('ended', () => {
            // No llamar a nextItem() si estamos en modo loop o loopEmbarque
            // Estos modos manejan sus propios loops
            // Security NO está aquí porque se reproduce una vez y luego pasa a programación
            if (this.currentMode !== 'loop' && this.currentMode !== 'loopEmbarque') {
            this.nextItem();
            }
        });

        this.player1.on('error', (error) => {
            console.error('❌ Error en el reproductor 1:', error);
            // Saltar al siguiente elemento si estamos en modo project
            if (this.currentMode === 'project' && this.isPlaying) {
                console.log('⏭️ Saltando al siguiente elemento debido a error...');
                this.nextItem();
            } else {
                // Para otros modos, solo mostrar error
                this.showError('Error reproduciendo el video');
            }
        });

        // Configurar eventos del reproductor 2
        this.player2.ready(() => {
            console.log('✅ Reproductor 2 listo');
            this.playersReady.player2 = true;
            this.checkPlayersReadyAndLoadProject();
        });

        this.player2.on('ended', () => {
            // No llamar a nextItem() si estamos en modo loop o loopEmbarque
            // Estos modos manejan sus propios loops
            // Security NO está aquí porque se reproduce una vez y luego pasa a programación
            if (this.currentMode !== 'loop' && this.currentMode !== 'loopEmbarque') {
                this.nextItem();
            }
        });

        this.player2.on('error', (error) => {
            console.error('❌ Error en el reproductor 2:', error);
            // Saltar al siguiente elemento si estamos en modo project
            if (this.currentMode === 'project' && this.isPlaying) {
                console.log('⏭️ Saltando al siguiente elemento debido a error...');
                this.nextItem();
            } else {
                // Para otros modos, solo mostrar error
                this.showError('Error reproduciendo el video');
            }
        });

        // Eventos de carga (solo para el reproductor activo)
        this.setupPlayerEvents();
        
        // Fallback: si después de 2 segundos no están listos, cargar de todos modos
        setTimeout(() => {
            if (!this.playersReady.player1 || !this.playersReady.player2) {
                console.warn('⚠️ Timeout esperando reproductores, cargando proyecto de todos modos...');
                this.playersReady.player1 = true;
                this.playersReady.player2 = true;
                this.checkPlayersReadyAndLoadProject();
            }
        }, 2000);
    }
    
    checkPlayersReadyAndLoadProject() {
        if (this.playersReady.player1 && this.playersReady.player2) {
            console.log('✅ Ambos reproductores listos, cargando proyecto...');
            // Solo cargar una vez
            if (!this.projectLoadedOnInit) {
                this.projectLoadedOnInit = true;
                this.loadLastProject();
            }
        }
    }

    setupPlayerEvents() {
        const activePlayer = this.getActivePlayer();
        
        // Sin animaciones de carga
    }

    getActivePlayer() {
        return this.activePlayer === 1 ? this.player1 : this.player2;
    }

    getInactivePlayer() {
        return this.activePlayer === 1 ? this.player2 : this.player1;
    }

    switchActivePlayer() {
        this.activePlayer = this.activePlayer === 1 ? 2 : 1;
        this.setupPlayerEvents();
    }

    setupEventListeners() {
        // No hay event listeners necesarios en el player principal
    }

    setupControlPanelListeners() {
        // Escuchar comandos del panel de control
        ipcRenderer.on('control-command', (event, { command, data }) => {
            this.handleControlCommand(command, data);
        });

        // Escuchar solicitudes de estado
        ipcRenderer.on('get-status-request', () => {
            this.sendStatusToControlPanel();
        });
    }

    setupMainProcessListeners() {
        // Listener para detener reproducción
        ipcRenderer.on('stop-playback', (event, data) => {
            // console.log('⏹️ Recibida señal de detener reproducción:', data);
            this.stopPlayback();
        });

        // Listener para reiniciar player
        ipcRenderer.on('restart-player', (event, data) => {
            // console.log('🔄 Recibida señal de reiniciar player:', data);
            this.restartPlayer();
        });
    }

    handleControlCommand(command, data) {
        
        switch (command) {
            case 'play':
                this.playCurrentItem();
                break;
            case 'pause':
                this.pauseCurrentItem();
                break;
            case 'stop':
                this.stopCurrentItem();
                break;
            case 'next':
                this.nextItem();
                break;
            case 'setVolume':
                this.setVolume(data.volume);
                break;
            case 'toggleMute':
                this.toggleMute();
                break;
            case 'reload':
                this.reloadProject();
                break;
            case 'toggleFullscreen':
                this.toggleFullscreen();
                break;
            case 'getInfo':
                this.showInfo();
                break;
            case 'loadProject':
                this.loadProjectFromData(data);
                break;
            case 'loadSecurityVideo':
                this.loadSecurityVideo(data.filePath);
                break;
            case 'loadLoopVideo':
                this.loadLoopVideo(data.filePath);
                break;
            case 'loadLoopEmbarqueVideo':
                this.loadLoopEmbarqueVideo(data.filePath);
                break;
            case 'setMode':
                this.setMode(data.mode);
                break;
            case 'clearVideos':
                this.clearSavedVideos();
                break;
            case 'loadAudio':
                this.loadAudio(data.filePath, data.customName);
                break;
            case 'playAudio':
                this.playAudio(data);
                break;
            case 'clearAudios':
                this.clearAudios();
                break;
            case 'clearMusic':
                this.clearMusic();
                break;
            case 'deleteAudio':
                this.deleteAudio(data.audioId);
                break;
            case 'loadAudioVideo':
                this.loadAudioVideo(data.filePath);
                break;
            case 'getAudioList':
                return this.loadedAudios;
            case 'loadMusic':
                this.loadMusic(data.filePath, data.fileName);
                break;
            case 'deleteMusic':
                this.deleteMusic(data.musicId);
                break;
            case 'getMusicList':
                return this.loadedMusic;
            case 'setMusicEnabled':
                this.setMusicEnabled(data.enabled);
                break;
            case 'turnOff':
                this.turnOff();
                break;
            case 'playCertificacion':
                this.playCertificacion(data.projectData);
                break;
            default:
        }
    }

    async playCurrentItem() {
        try {
            const activePlayer = this.getActivePlayer();
            await activePlayer.play();
        } catch (error) {
            // console.error('Error reproduciendo:', error);
        }
    }

    async pauseCurrentItem() {
        try {
            const activePlayer = this.getActivePlayer();
            activePlayer.pause();
        } catch (error) {
            // console.error('Error pausando:', error);
        }
    }

    stopCurrentItem() {
        try {
            const activePlayer = this.getActivePlayer();
            activePlayer.pause();
            activePlayer.currentTime(0);
            this.isPlaying = false;
        } catch (error) {
            // console.error('Error deteniendo:', error);
        }
    }

    setVolume(volume) {
        try {
            const activePlayer = this.getActivePlayer();
            activePlayer.volume(volume / 100);
        } catch (error) {
            // console.error('Error estableciendo volumen:', error);
        }
    }

    toggleMute() {
        try {
            const activePlayer = this.getActivePlayer();
            activePlayer.muted(!activePlayer.muted());
        } catch (error) {
            // console.error('Error cambiando silencio:', error);
        }
    }

    reloadProject() {
        this.loadLastProject();
    }

    toggleFullscreen() {
        // Implementar lógica de pantalla completa si es necesario
    }

    showInfo() {
        // Implementar lógica de información si es necesario
    }

    sendStatusToControlPanel() {
        const status = {
            success: true,
            playerStatus: this.isPlaying ? 'playing' : 'stopped',
            project: this.currentPlaylist ? {
                name: this.currentPlaylist.name,
                data: this.currentPlaylist, // Incluir el proyecto completo
                activeItems: this.filteredItems.length,
                totalDuration: 'N/A',
                status: this.isPlaying ? 'Reproduciendo' : 'Detenido'
            } : null,
            videos: {
                securityVideoPath: this.securityVideoPath,
                loopVideoPath: this.loopVideoPath,
                loopEmbarqueVideoPath: this.loopEmbarqueVideoPath,
                audioVideoPath: this.audioVideoPath
            },
            musicEnabled: this.musicEnabled
        };
        
        ipcRenderer.send('status-response', status);
    }

    async loadLastProject() {
        console.log('📁 loadLastProject() llamado');
        try {
            // Cargar proyecto desde directorio fijo
            console.log('📂 Invocando load-project-from-programacion...');
            const result = await ipcRenderer.invoke('load-project-from-programacion');
            console.log('📦 Resultado de carga:', result);
            
            if (result.success) {
                console.log('✅ Proyecto cargado exitosamente');
                this.currentPlaylist = result.data;
                this.projectPath = result.projectPath;
                
                console.log('🔍 Obteniendo items activos...');
                this.filteredItems = this.getAllActiveItems();
                console.log(`📋 Items activos encontrados: ${this.filteredItems.length}`);
            } else {
                console.error('❌ Error cargando proyecto:', result.error);
            }
            
            // Verificar si hay video de loop cargado
            if (this.loopVideoPath) {
                console.log('▶️ Video de loop encontrado, iniciando reproducción de loop...');
                this.currentMode = 'loop';
                this.playLoopVideo();
            } else {
                console.log('ℹ️ No hay video de loop cargado, no se inicia reproducción automática');
                // No reproducir nada, solo mostrar pantalla negra
                this.stopPlayback();
            }
        } catch (error) {
            console.error('❌ Error en loadLastProject:', error);
        }
    }

    clearSavedProject() {
        localStorage.removeItem('lastProjectPath');
        localStorage.removeItem('lastProjectData');
    }

    async focusControlPanel() {
        try {
            const result = await ipcRenderer.invoke('focus-control-panel');
            if (result.success) {
            }
        } catch (error) {
            // console.error('Error enfocando panel de control:', error);
        }
    }

    async openSecondWindow() {
        try {
            const result = await ipcRenderer.invoke('open-second-window');
            if (result.success) {
            }
        } catch (error) {
            // console.error('Error abriendo segunda ventana:', error);
        }
    }

    async openProject() {
        try {
            // Limpiar proyecto guardado cuando se selecciona uno nuevo
            this.clearSavedProject();

            const result = await ipcRenderer.invoke('select-json-file');
            
            if (result.success) {
                this.currentPlaylist = result.data;
                this.projectPath = result.projectPath;
                this.filteredItems = this.getAllActiveItems();
                
                // Guardar la ruta del proyecto en localStorage
                localStorage.setItem('lastProjectPath', result.projectPath);
                localStorage.setItem('lastProjectData', JSON.stringify(result.data));
                
                
                if (this.filteredItems.length > 0) {
                    this.currentIndex = 0;
                    this.isPlaying = true;
                    this.startPlayback();
                } else {
                    this.showError('No hay items activos en este momento');
                }
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            // console.error('Error cargando proyecto:', error);
            this.showError('Error al cargar el proyecto');
        }
    }

    async loadProjectFromData(projectData, isCertificacion = false) {
        try {
            // Si es certificación, guardar el proyecto original
            if (isCertificacion) {
                if (!this.originalProject) {
                    this.originalProject = this.currentPlaylist;
                }
                this.isCertificacionMode = true;
                console.log('📋 Modo certificación activado');
            } else {
                // Si no es certificación y había un proyecto original, restaurarlo
                if (this.originalProject) {
                    this.originalProject = null;
                }
                this.isCertificacionMode = false;
                // Limpiar proyecto guardado cuando se selecciona uno nuevo
                this.clearSavedProject();
            }
            
            // El projectData ya es el objeto del proyecto completo
            this.currentPlaylist = projectData;
            this.projectPath = projectData.folderPath || '';
            
            // Obtener items activos (sin restricciones de tiempo/días si es certificación)
            this.filteredItems = this.getAllActiveItems(isCertificacion);
            
            // Guardar la ruta del proyecto en localStorage solo si no es certificación
            if (!isCertificacion) {
                localStorage.setItem('lastProjectPath', this.projectPath);
                localStorage.setItem('lastProjectData', JSON.stringify(projectData));
            }
            
            if (this.filteredItems.length > 0) {
                this.currentIndex = 0;
                this.isPlaying = true;
                this.currentMode = 'project'; // Asegurar que estamos en modo project
                this.startPlayback();
            } else {
                console.warn('⚠️ No hay items activos para reproducir');
                // Detener reproducción actual y mostrar pantalla negra
                console.log('🛑 Deteniendo reproducción actual porque no hay items activos...');
                this.stopPlayback();
            }
        } catch (error) {
            // console.error('Error cargando proyecto:', error);
            this.showError('Error al cargar el proyecto: ' + error.message);
        }
    }

    loadSavedVideos() {
        try {
            // Cargar video de seguridad guardado
            const savedSecurityVideo = localStorage.getItem('securityVideoPath');
            if (savedSecurityVideo) {
                this.securityVideoPath = savedSecurityVideo;
            }

            // Cargar video de loop guardado
            const savedLoopVideo = localStorage.getItem('loopVideoPath');
            if (savedLoopVideo) {
                this.loopVideoPath = savedLoopVideo;
            }

            // Cargar video de loop embarque guardado
            const savedLoopEmbarqueVideo = localStorage.getItem('loopEmbarqueVideoPath');
            if (savedLoopEmbarqueVideo) {
                this.loopEmbarqueVideoPath = savedLoopEmbarqueVideo;
            }

            // Cargar modo guardado
            const savedMode = localStorage.getItem('currentMode');
            if (savedMode && ['project', 'security', 'loop', 'loopEmbarque'].includes(savedMode)) {
                this.currentMode = savedMode;
            }
            
            // Cargar estado de música
            const savedMusicEnabled = localStorage.getItem('musicEnabled');
            if (savedMusicEnabled !== null) {
                this.musicEnabled = JSON.parse(savedMusicEnabled);
            }
        } catch (error) {
            // console.error('Error cargando videos guardados:', error);
        }
    }

    loadSavedAudios() {
        try {
            const savedAudios = localStorage.getItem('loadedAudios');
            if (savedAudios) {
                this.loadedAudios = JSON.parse(savedAudios);
            } else {
                // Intentar cargar audios existentes del directorio
                this.loadExistingAudios();
            }
            
            // Cargar video placa guardado
            const savedAudioVideo = localStorage.getItem('audioVideoPath');
            if (savedAudioVideo) {
                this.audioVideoPath = savedAudioVideo;
            }
        } catch (error) {
            // console.error('Error cargando audios guardados:', error);
        }
    }

    loadSavedMusic() {
        try {
            const savedMusic = localStorage.getItem('loadedMusic');
            if (savedMusic) {
                this.loadedMusic = JSON.parse(savedMusic);
                // Ordenar alfabéticamente por nombre
                this.loadedMusic.sort((a, b) => a.name.localeCompare(b.name));
            } else {
                // Intentar cargar música existente del directorio
                this.loadExistingMusic();
            }
        } catch (error) {
            // console.error('Error cargando música guardada:', error);
        }
    }

    async loadExistingMusic() {
        try {
            // Obtener lista de archivos de música desde main.js
            const musicFiles = await ipcRenderer.invoke('get-music-files');
            if (musicFiles && musicFiles.length > 0) {
                this.loadedMusic = musicFiles.map((filePath, index) => {
                    // Extraer nombre del archivo de la ruta
                    const fileName = filePath.split(/[/\\]/).pop();
                    return {
                        id: `music_${Date.now()}_${index}`,
                        filePath: filePath,
                        name: fileName,
                        loadedAt: new Date().toISOString()
                    };
                });
                // Ordenar alfabéticamente por nombre
                this.loadedMusic.sort((a, b) => a.name.localeCompare(b.name));
                // Guardar en localStorage
                localStorage.setItem('loadedMusic', JSON.stringify(this.loadedMusic));
            }
        } catch (error) {
            // console.error('Error cargando música existente:', error);
        }
    }

    async loadExistingAudios() {
        try {
            const result = await ipcRenderer.invoke('get-existing-audios');
            if (result.success && result.audios.length > 0) {
                // Cargar audios existentes con nombres por defecto
                result.audios.forEach((audioPath, index) => {
                    const fileName = audioPath.split('\\').pop().split('/').pop();
                    const audioId = Date.now().toString() + index;
                    const audioData = {
                        id: audioId,
                        filePath: audioPath,
                        customName: fileName.replace(/\.[^/.]+$/, ""), // Quitar extensión
                        loadedAt: new Date().toISOString()
                    };
                    this.loadedAudios.push(audioData);
                });
                
                // Guardar en localStorage
                localStorage.setItem('loadedAudios', JSON.stringify(this.loadedAudios));
            }
        } catch (error) {
            // console.error('Error cargando audios existentes:', error);
        }
    }

    loadSecurityVideo(filePath) {
        try {
            this.securityVideoPath = filePath;
            
            // Guardar en localStorage
            localStorage.setItem('securityVideoPath', filePath);
            
        } catch (error) {
            // console.error('Error cargando video de seguridad:', error);
            this.showError('Error al cargar video de seguridad');
        }
    }

    loadLoopVideo(filePath) {
        try {
            this.loopVideoPath = filePath;
            
            // Guardar en localStorage
            localStorage.setItem('loopVideoPath', filePath);
            
        } catch (error) {
            // console.error('Error cargando video de loop:', error);
            this.showError('Error al cargar video de loop');
        }
    }

    loadLoopEmbarqueVideo(filePath) {
        try {
            this.loopEmbarqueVideoPath = filePath;
            
            // Guardar en localStorage
            localStorage.setItem('loopEmbarqueVideoPath', filePath);
            
        } catch (error) {
            // console.error('Error cargando video de loop embarque:', error);
            this.showError('Error al cargar video de loop embarque');
        }
    }

    setMode(mode) {
        console.log('🔄 setMode() llamado con modo:', mode);
        
        // Si estamos en modo certificación y cambiamos de modo, restaurar proyecto original
        if (this.isCertificacionMode && this.originalProject) {
            console.log('📋 Restaurando proyecto original después de certificación');
            this.currentPlaylist = this.originalProject;
            this.projectPath = this.originalProjectPath || ''; // Restaurar también el path
            // Recalcular items filtrados con el proyecto original
            this.filteredItems = this.getAllActiveItems(false);
            console.log(`📋 Items filtrados recalculados: ${this.filteredItems.length} items`);
            this.originalProject = null;
            this.originalProjectPath = null;
            this.isCertificacionMode = false;
        }
        
        // Detener webcam si está activa antes de cambiar de modo
        this.stopWebcam();
        
        // Detener completamente la reproducción actual
        this.isPlaying = false;
        
        // Detener reproductores de video
        if (this.player1) {
            this.player1.pause();
            this.player1.currentTime(0);
        }
        if (this.player2) {
            this.player2.pause();
            this.player2.currentTime(0);
        }
        
        // Detener audio si está reproduciéndose
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
            this.hideAudioOverlay();
            this.restoreOriginalVolume();
        }
        
        // Detener música si está reproduciéndose
        this.stopCurrentMusic();
        
        // Ocultar reproductores de video
        document.getElementById('video-player').style.display = 'none';
        document.getElementById('video-player-2').style.display = 'none';
        document.getElementById('webcam-state').style.display = 'none';
        document.getElementById('audio-state').style.display = 'none';
        
        this.currentMode = mode;
        
        // Guardar modo en localStorage
        localStorage.setItem('currentMode', mode);
        
        // Pequeño delay para asegurar que todo se detuvo
        setTimeout(() => {
            switch (mode) {
                case 'project':
                    this.playProject();
                    break;
                case 'security':
                    this.playSecurityVideo();
                    break;
                case 'loop':
                    this.playLoopVideo();
                    break;
                case 'loopEmbarque':
                    this.playLoopEmbarqueVideo();
                    break;
            }
        }, 100);
    }

    playProject() {
        if (this.currentPlaylist && this.filteredItems.length > 0) {
            // Resetear índice para siempre empezar desde el principio
            this.currentIndex = 0;
            this.isPlaying = true;
            this.startPlayback();
        } else {
            this.showError('No hay proyecto cargado o no hay items activos');
        }
    }

    playSecurityVideo() {
        if (this.securityVideoPath) {
            this.isPlaying = true;
            this.isSecurityPlayed = false;
            // Video de seguridad siempre con sonido (muted = false)
            this.playVideoFile(this.securityVideoPath, () => {
                // Callback cuando termina el video de seguridad
                this.isSecurityPlayed = true;
                this.playProject();
            }, false); // false = con sonido
        } else { 
            this.showError('No hay video de seguridad cargado');
        }
    }

    playLoopVideo() {
        if (this.loopVideoPath) {
            this.isPlaying = true;
            // Loop sin sonido (muted = true)
            this.playVideoFile(this.loopVideoPath, () => {
                // Callback cuando termina el video de loop - reiniciar
                if (this.currentMode === 'loop') {
                    this.playLoopVideo();
                }
            }, true); // true = sin sonido
        } else {  
            this.showError('No hay video de loop cargado');
        }
    }

    setMusicEnabled(enabled) {
        console.log(`🎵 Música ${enabled ? 'activada' : 'desactivada'}`);
        this.musicEnabled = enabled;
        // Guardar en localStorage
        localStorage.setItem('musicEnabled', JSON.stringify(enabled));
        
        // Si se desactiva, detener la música actual
        if (!enabled && this.currentMusic) {
            console.log('🛑 Deteniendo música actual...');
            this.stopCurrentMusic();
        }
        // Si se activa y estamos en modo loopEmbarque, iniciar música
        else if (enabled && this.currentMode === 'loopEmbarque' && this.loadedMusic.length > 0) {
            console.log(`▶️ Iniciando reproducción de música (${this.loadedMusic.length} temas cargados)`);
            this.startMusicPlayback();
        }
    }

    playLoopEmbarqueVideo() {
        if (this.loopEmbarqueVideoPath) {
            this.isPlaying = true;
            // Loop embarque sin sonido (muted = true) - la música se reproduce por separado
            this.playVideoFile(this.loopEmbarqueVideoPath, () => {
                // Callback cuando termina el video de loop embarque - reiniciar
                if (this.currentMode === 'loopEmbarque') {
                    this.playLoopEmbarqueVideo();
                }
            }, true); // true = sin sonido
            
            // Solo iniciar música si no está ya reproduciéndose
            // Esto evita reiniciar la música cada vez que el video se reinicia
            if (this.musicEnabled && this.loadedMusic.length > 0 && !this.currentMusic) {
                console.log('🎵 Iniciando música con loop embarque...');
                this.startMusicPlayback();
            } else if (this.musicEnabled && this.loadedMusic.length > 0 && this.currentMusic) {
                console.log('ℹ️ Música ya está reproduciéndose, no reiniciando');
            } else {
                console.log('ℹ️ Música no iniciada:', {
                    enabled: this.musicEnabled,
                    hasMusic: this.loadedMusic.length > 0,
                    isPlaying: !!this.currentMusic
                });
            }
        } else {  
            this.showError('No hay video de loop embarque cargado');
        }
    }

    startMusicPlayback() {
        // Solo reproducir música si estamos en modo loopEmbarque y hay música cargada
        if (this.currentMode !== 'loopEmbarque' || this.loadedMusic.length === 0 || !this.musicEnabled) {
            console.log('⚠️ No se puede iniciar música:', {
                mode: this.currentMode,
                hasMusic: this.loadedMusic.length > 0,
                enabled: this.musicEnabled
            });
            return;
        }
        
        // Reiniciar índice si es necesario
        if (this.currentMusicIndex >= this.loadedMusic.length) {
            this.currentMusicIndex = 0;
        }
        
        console.log(`🎵 Iniciando reproducción de música (índice: ${this.currentMusicIndex}/${this.loadedMusic.length - 1})`);
        this.playNextMusic();
    }

    playNextMusic() {
        // Evitar llamadas múltiples simultáneas
        if (this.isPlayingMusic) {
            console.log('⚠️ Ya hay una reproducción de música en progreso, ignorando llamada duplicada');
            return;
        }
        
        // Verificar que todavía estamos en modo loopEmbarque y la música está activada
        if (this.currentMode !== 'loopEmbarque' || !this.musicEnabled || this.loadedMusic.length === 0) {
            this.stopCurrentMusic();
            return;
        }
        
        // Obtener la música actual
        const music = this.loadedMusic[this.currentMusicIndex];
        
        if (!music) {
            console.error('❌ No hay música en el índice actual:', this.currentMusicIndex);
            this.currentMusicIndex = 0;
            if (this.loadedMusic.length > 0) {
                this.playNextMusic();
            }
            return;
        }
        
        // Verificar que el archivo existe
        ipcRenderer.invoke('check-file-exists', music.filePath).then(fileExists => {
            if (!fileExists) {
                console.error('❌ Archivo de música no existe:', music.filePath);
                // Pasar a la siguiente
                this.currentMusicIndex = (this.currentMusicIndex + 1) % this.loadedMusic.length;
                this.isPlayingMusic = false; // Liberar bandera
                setTimeout(() => this.playNextMusic(), 100); // Pequeño delay para evitar bucle
                return;
            }
            
            // Detener música anterior si existe (con un pequeño delay para evitar interrupción)
            if (this.currentMusic) {
                try {
                    this.currentMusic.pause();
                    this.currentMusic.src = '';
                } catch (e) {
                    // Ignorar errores al detener música anterior
                }
            }
            
            // Marcar que estamos reproduciendo
            this.isPlayingMusic = true;
            
            // Crear nuevo elemento de audio
            const audio = new Audio();
            audio.src = music.filePath;
            audio.volume = 1.0; // Volumen completo para música
            
            console.log(`🎵 Reproduciendo música: "${music.name}" (${this.currentMusicIndex + 1}/${this.loadedMusic.length})`);
            
            // Cuando termine, reproducir la siguiente
            audio.addEventListener('ended', () => {
                console.log(`✅ Música "${music.name}" finalizada, pasando a la siguiente...`);
                this.isPlayingMusic = false; // Liberar bandera
                this.currentMusic = null;
                this.currentMusicIndex = (this.currentMusicIndex + 1) % this.loadedMusic.length;
                setTimeout(() => this.playNextMusic(), 100); // Pequeño delay
            });
            
            // Manejar errores
            audio.addEventListener('error', (e) => {
                console.error('❌ Error reproduciendo música:', music.name, e);
                this.isPlayingMusic = false; // Liberar bandera
                this.currentMusic = null;
                // Pasar a la siguiente
                this.currentMusicIndex = (this.currentMusicIndex + 1) % this.loadedMusic.length;
                setTimeout(() => this.playNextMusic(), 500); // Delay más largo para errores
            });
            
            // Reproducir
            this.currentMusic = audio;
            audio.play().then(() => {
                console.log(`▶️ Música "${music.name}" iniciada correctamente`);
            }).catch(error => {
                // Ignorar errores de interrupción (son normales cuando se detiene manualmente)
                if (error.name === 'NotAllowedError' || error.name === 'AbortError') {
                    console.log(`ℹ️ Reproducción de "${music.name}" interrumpida (normal si se detuvo manualmente)`);
                } else {
                    console.error('❌ Error al iniciar reproducción de música:', error);
                }
                this.isPlayingMusic = false; // Liberar bandera
                this.currentMusic = null;
                // Pasar a la siguiente solo si no es un error de interrupción
                if (error.name !== 'AbortError') {
                    this.currentMusicIndex = (this.currentMusicIndex + 1) % this.loadedMusic.length;
                    setTimeout(() => this.playNextMusic(), 500); // Delay para evitar bucle
                }
            });
        }).catch(error => {
            console.error('❌ Error verificando archivo de música:', error);
            this.isPlayingMusic = false; // Liberar bandera
            this.currentMusicIndex = (this.currentMusicIndex + 1) % this.loadedMusic.length;
            setTimeout(() => this.playNextMusic(), 500);
        });
    }

    stopCurrentMusic() {
        if (this.currentMusic) {
            try {
                console.log('🛑 Deteniendo música actual...');
                this.currentMusic.pause();
                this.currentMusic.src = '';
                this.currentMusic = null;
                this.isPlayingMusic = false; // Liberar bandera
            } catch (error) {
                console.error('Error deteniendo música:', error);
                this.isPlayingMusic = false; // Asegurar que la bandera se libere
            }
        } else {
            this.isPlayingMusic = false; // Asegurar que la bandera se libere incluso si no hay música
        }
    }

    playVideoFile(filePath, onEnded, muted = false) {
        const activePlayer = this.getActivePlayer();
        
        // Detectar si es un stream de cámara IP
        if (filePath.includes('webcam') || filePath.includes('camera') || filePath.includes('192.168')) {
            this.playCameraStream(filePath, onEnded);
        } else {
            // Video normal
            // Mostrar reproductor de video
            this.showVideoPlayer();
            
            activePlayer.pause();
            
            activePlayer.src({
                src: filePath,
                type: 'video/mp4'
            });
            
            // Configurar audio según el parámetro muted
            activePlayer.ready(() => {
                const videoElement = activePlayer.el().querySelector('video');
                if (videoElement) {
                    // Configurar audio: si muted es true, silenciar; si es false, reproducir con sonido
                    videoElement.muted = muted;
                    activePlayer.muted(muted);
                    
                    const checkVideoOrientation = () => {
                        const videoWidth = videoElement.videoWidth;
                        const videoHeight = videoElement.videoHeight;
                        
                        if (videoWidth > 0 && videoHeight > 0) {
                            // Video es vertical si altura > ancho
                            const isVertical = videoHeight > videoWidth;
                            
                            // Agregar o remover clase según orientación
                            if (isVertical) {
                                activePlayer.el().classList.add('vertical-video');
                            } else {
                                activePlayer.el().classList.remove('vertical-video');
                            }
                        }
                    };
                    
                    // Verificar cuando los metadatos estén cargados
                    videoElement.addEventListener('loadedmetadata', checkVideoOrientation);
                    // También verificar después de que el video pueda reproducirse
                    videoElement.addEventListener('canplay', checkVideoOrientation);
                }
            });
            
            activePlayer.one('ended', () => {
                if (onEnded) {
                    onEnded();
                }
            });
            
            activePlayer.play();
        }
    }

    playCameraStream(streamPath, onEnded) {
        const activePlayer = this.getActivePlayer();
        
        // Construir URL con parámetros de calidad si hay configuración
        let streamUrl = streamPath;
        if (this.cameraConfig) {
            const qualityMap = {
                'low': '25',
                'medium': '50',
                'high': '75',
                'max': '100'
            };
            
            const [width, height] = this.cameraConfig.resolution.split('x');
            streamUrl = `${streamPath}?quality=${qualityMap[this.cameraConfig.quality]}&width=${width}&height=${height}`;
        }
        
        // Para streams MJPEG, usar el elemento img en lugar de video
        if (streamUrl.includes('/video') || streamUrl.includes('mjpeg')) {
            this.playMjpegStream(streamUrl, onEnded);
        } else {
            // Stream de video normal
            activePlayer.pause();
            
            activePlayer.src({
                src: streamUrl,
                type: 'video/mp4'
            });
            
            activePlayer.one('ended', () => {
                if (onEnded) {
                    onEnded();
                }
            });
            
            activePlayer.play();
        }
    }

    playMjpegStream(streamUrl, onEnded) {
        // Crear elemento img para stream MJPEG
        const img = document.createElement('img');
        img.src = streamUrl;
        img.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: 10;
        `;
        
        // Agregar al contenedor del player
        const playerContainer = document.querySelector('.player-container');
        playerContainer.appendChild(img);
        
        // Configurar callback para limpiar
        if (onEnded) {
            const originalOnEnded = onEnded;
            onEnded = () => {
                img.remove();
                originalOnEnded();
            };
        }
    }

    async playWebcamItem(filePath) {
        try {
            // // console.log('playWebcamItem llamado con filePath:', filePath);
            // // console.log('cameraConfig:', this.cameraConfig);
            
            // Verificar si hay configuración de cámara guardada
            if (!this.cameraConfig || !this.cameraConfig.url) {
                // // console.log('No hay configuración de cámara guardada');
                this.showError('No hay configuración de cámara IP guardada. Configura la cámara en el panel de control.');
                this.nextItem();
                return;
            }
            
            // Mostrar estado de webcam
            this.showWebcamState();
            
            // Ocultar reproductores de video
            document.getElementById('video-player').style.display = 'none';
            document.getElementById('video-player-2').style.display = 'none';
            
            // Limpiar streams anteriores
            this.clearWebcamStream();
            
            // Crear elemento img para stream MJPEG con transición suave
            const img = document.createElement('img');
            const streamUrl = this.buildWebcamUrl(filePath);
            img.src = streamUrl;
            img.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                object-fit: cover;
                z-index: 10;
                opacity: 0;
                transition: opacity 0.1s ease-in-out;
            `;
            
            // Agregar al contenedor del player
            const playerContainer = document.querySelector('.player-container');
            playerContainer.appendChild(img);
            
            // Configurar manejo de errores de conexión
            let connectionLost = false;
            let retryCount = 0;
            const maxRetries = 3;
            const retryDelay = 2000; // 2 segundos
            
            const handleConnectionError = () => {
                if (connectionLost) return;
                connectionLost = true;
                
                console.log('❌ Conexión perdida con la cámara IP');
                this.showError('Conexión perdida con la cámara IP. Continuando con el siguiente item...');
                
                // Limpiar intervalos y timeouts
                if (this.webcamConnectionCheckInterval) {
                    clearInterval(this.webcamConnectionCheckInterval);
                    this.webcamConnectionCheckInterval = null;
                }
                if (this.webcamDurationTimeout) {
                    clearTimeout(this.webcamDurationTimeout);
                    this.webcamDurationTimeout = null;
                }
                
                // Limpiar imagen
                if (img && img.parentNode) {
                    img.remove();
                }
                this.webcamImageElement = null;
                
                // Verificar que realmente estamos en un item de webcam antes de llamar a nextItem
                if (this.currentItem && this.currentItem.type === 'webcam') {
                    // Continuar con el siguiente item después de un breve delay
                    setTimeout(() => {
                        console.log('⏭️ Pasando al siguiente item después de error de webcam');
                        this.nextItem();
                    }, 1000);
                } else {
                    console.log('⚠️ No estamos en un item de webcam, no llamando a nextItem()');
                }
            };
            
            const retryConnection = () => {
                if (retryCount >= maxRetries) {
                    handleConnectionError();
                    return;
                }
                
                retryCount++;
                // // console.log(`Reintentando conexión a cámara IP (intento ${retryCount}/${maxRetries})`);
                
                // Actualizar estado
                const webcamInfo = document.getElementById('webcam-info');
                if (webcamInfo) {
                    webcamInfo.textContent = `Reintentando conexión... (${retryCount}/${maxRetries})`;
                }
                
                // Reintentar después del delay
                setTimeout(() => {
                    img.src = streamUrl + '?t=' + Date.now(); // Cache busting
                }, retryDelay);
            };
            
            // Eventos de la imagen
            img.onload = () => {
                if (connectionLost) return;
                
                // Mostrar con transición suave
                setTimeout(() => {
                    img.style.opacity = '1';
                }, 10);
                
                // Resetear contador de reintentos en carga exitosa
                retryCount = 0;
                
                // Actualizar estado
                const webcamInfo = document.getElementById('webcam-info');
                if (webcamInfo) {
                    webcamInfo.textContent = `Conectado a: ${streamUrl}`;
                }
            };
            
            img.onerror = () => {
                if (connectionLost) return;
                // console.error('Error cargando stream de cámara IP');
                retryConnection();
            };
            
            // Guardar referencia a la imagen para poder limpiarla
            this.webcamImageElement = img;
            
            // Detectar pérdida de conexión (imagen se detiene)
            let lastImageTime = Date.now();
            this.webcamConnectionCheckInterval = setInterval(() => {
                if (connectionLost) {
                    if (this.webcamConnectionCheckInterval) {
                        clearInterval(this.webcamConnectionCheckInterval);
                        this.webcamConnectionCheckInterval = null;
                    }
                    return;
                }
                
                const currentTime = Date.now();
                if (currentTime - lastImageTime > 10000) { // 10 segundos sin actualización
                    // console.error('Stream de cámara IP se detuvo');
                    retryConnection();
                }
            }, 5000); // Verificar cada 5 segundos
            
            // Actualizar timestamp cuando la imagen se carga
            const originalOnload = img.onload;
            img.onload = () => {
                lastImageTime = Date.now();
                if (originalOnload) originalOnload();
            };
            
            // Configurar timeout basado en la duración del item
            if (this.currentItem.duration) {
                const durationMs = this.currentItem.duration * 1000;
                this.webcamDurationTimeout = setTimeout(() => {
                    if (connectionLost) return;
                    
                    // Limpiar intervalo de verificación
                    if (this.webcamConnectionCheckInterval) {
                        clearInterval(this.webcamConnectionCheckInterval);
                        this.webcamConnectionCheckInterval = null;
                    }
                    
                    // Transición suave de salida
                    img.style.opacity = '0';
                    setTimeout(() => {
                        img.remove();
                        this.webcamImageElement = null;
                        this.nextItem();
                    }, 100);
                }, durationMs);
            }
            
        } catch (error) {
            // console.error('Error reproduciendo webcam:', error);
            this.nextItem();
        }
    }

    showWebcamState() {
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('audio-state').style.display = 'none';
        document.getElementById('webcam-state').style.display = 'block';
    }


    buildWebcamUrl(filePath) {
        // Construir URL con parámetros de calidad si hay configuración
        let streamUrl = filePath;
        if (this.cameraConfig) {
            const qualityMap = {
                'low': '25',
                'medium': '50',
                'high': '75',
                'max': '100'
            };
            
            const [width, height] = this.cameraConfig.resolution.split('x');
            streamUrl = `${filePath}?quality=${qualityMap[this.cameraConfig.quality]}&width=${width}&height=${height}`;
        }
        return streamUrl;
    }

    clearWebcamStream() {
        // Limpiar elementos de stream MJPEG existentes
        const existingImgs = document.querySelectorAll('.player-container img[src*="192.168"]');
        existingImgs.forEach(img => img.remove());
    }

    stopWebcam() {
        // Limpiar intervalos y timeouts de webcam
        if (this.webcamConnectionCheckInterval) {
            clearInterval(this.webcamConnectionCheckInterval);
            this.webcamConnectionCheckInterval = null;
        }
        
        if (this.webcamDurationTimeout) {
            clearTimeout(this.webcamDurationTimeout);
            this.webcamDurationTimeout = null;
        }
        
        // Limpiar imagen de webcam
        if (this.webcamImageElement) {
            this.webcamImageElement.src = '';
            this.webcamImageElement.remove();
            this.webcamImageElement = null;
        }
        
        // Limpiar cualquier otra imagen de webcam que pueda quedar
        this.clearWebcamStream();
        
        // Ocultar estado de webcam
        const webcamState = document.getElementById('webcam-state');
        if (webcamState) {
            webcamState.style.display = 'none';
        }
    }

    async clearSavedVideos() {
        try {
            console.log('🗑️ [CLEAR-SAVED-VIDEOS] Iniciando limpieza de videos...');
            
            // Detener la reproducción actual antes de eliminar
            console.log('   ⏹️ [CLEAR-SAVED-VIDEOS] Deteniendo reproducción...');
            this.stopPlayback();
            
            // Esperar un momento para que los reproductores se detengan completamente
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Obtener las rutas de los videos antes de limpiar localStorage
            const securityVideoPath = localStorage.getItem('securityVideoPath');
            const loopVideoPath = localStorage.getItem('loopVideoPath');
            const loopEmbarqueVideoPath = localStorage.getItem('loopEmbarqueVideoPath');
            const audioVideoPath = localStorage.getItem('audioVideoPath');
            
            // Construir array de rutas de videos a eliminar (solo los que existen)
            const videoPathsToDelete = [];
            if (securityVideoPath) {
                videoPathsToDelete.push(securityVideoPath);
                console.log(`   📋 [CLEAR-SAVED-VIDEOS] Video de seguridad: ${securityVideoPath}`);
            }
            if (loopVideoPath) {
                videoPathsToDelete.push(loopVideoPath);
                console.log(`   📋 [CLEAR-SAVED-VIDEOS] Video de loop: ${loopVideoPath}`);
            }
            if (loopEmbarqueVideoPath) {
                videoPathsToDelete.push(loopEmbarqueVideoPath);
                console.log(`   📋 [CLEAR-SAVED-VIDEOS] Video de loop embarque: ${loopEmbarqueVideoPath}`);
            }
            if (audioVideoPath) {
                videoPathsToDelete.push(audioVideoPath);
                console.log(`   📋 [CLEAR-SAVED-VIDEOS] Video de placa audio: ${audioVideoPath}`);
            }
            
            // Limpiar localStorage
            localStorage.removeItem('securityVideoPath');
            localStorage.removeItem('loopVideoPath');
            localStorage.removeItem('loopEmbarqueVideoPath');
            localStorage.removeItem('audioVideoPath');
            localStorage.removeItem('currentMode');
            console.log('   ✅ [CLEAR-SAVED-VIDEOS] localStorage limpiado');
            
            // Limpiar variables
            this.securityVideoPath = null;
            this.loopVideoPath = null;
            this.loopEmbarqueVideoPath = null;
            this.audioVideoPath = null;
            this.currentMode = 'project';
            console.log('   ✅ [CLEAR-SAVED-VIDEOS] Variables limpiadas');
            
            // Limpiar videos físicamente (solo videos de seguridad, loop y placa de audio)
            if (videoPathsToDelete.length > 0) {
                const result = await ipcRenderer.invoke('clear-copied-videos', videoPathsToDelete);
                if (result.success) {
                    const deletedCount = result.deleted || 0;
                    const errorCount = result.errors || 0;
                    console.log(`   ✅ [CLEAR-SAVED-VIDEOS] Videos eliminados: ${deletedCount}`);
                    
                    if (errorCount > 0) {
                        console.log(`   ⚠️ [CLEAR-SAVED-VIDEOS] Errores: ${errorCount}`);
                    }
                    
                    // Actualizar UI del control panel (texto de botones / modos)
                    this.updateControlPanelAfterVideoDeletion();
                    // NO mostrar alert en la pantalla del player; la notificación
                    // visual se hace solo en el panel de control mediante toast.
                } else {
                    console.error(`   ❌ [CLEAR-SAVED-VIDEOS] Error eliminando videos copiados:`, result.error);
                }
            } else {
                console.log('   ℹ️ [CLEAR-SAVED-VIDEOS] No hay videos guardados para eliminar');
                // Actualizar UI aunque no haya videos para eliminar
                this.updateControlPanelAfterVideoDeletion();
            }
        } catch (error) {
            console.error(`❌ [CLEAR-SAVED-VIDEOS] Error eliminando videos guardados:`, error.message);
            alert('Error al eliminar los videos: ' + error.message);
        }
    }
    
    // Actualizar el control panel después de eliminar videos
    updateControlPanelAfterVideoDeletion() {
        try {
            console.log('🔄 [CLEAR-SAVED-VIDEOS] Notificando al control panel para actualizar UI...');
            
            // Enviar mensaje al main process para que notifique al control panel
            ipcRenderer.send('update-control-panel-after-video-deletion');
        } catch (error) {
            console.error(`   ❌ [CLEAR-SAVED-VIDEOS] Error notificando al control panel:`, error.message);
        }
    }

    loadAudio(filePath, customName) {
        try {

            const audioId = Date.now().toString(); // ID único para el audio
            
            const audioData = {
                id: audioId,
                filePath: filePath,
                customName: customName,
                loadedAt: new Date().toISOString()
            };
            
            this.loadedAudios.push(audioData);
            
            // Guardar en localStorage
            localStorage.setItem('loadedAudios', JSON.stringify(this.loadedAudios));
            
        } catch (error) {
            this.showError('Error al cargar audio');
        }
    }

    async playAudio(audioData) {
        
        try {
            // Usar los datos directamente sin buscar en loadedAudios
            const audio = {
                id: audioData.audioId,
                filePath: audioData.filePath,
                customName: audioData.customName,
                loadedAt: audioData.loadedAt
            };
            
            // Interrumpir audio actual si existe
            if (this.currentAudio) {
                this.stopCurrentAudio();
            }

            // Guardar volumen original
            const activePlayer = this.getActivePlayer();
            this.originalVolume = activePlayer.volume();
            
            // Bajar volumen del contenido actual
            activePlayer.volume(0.1);
            
            // Verificar que el archivo existe usando IPC
            try {
                const fileExists = await ipcRenderer.invoke('check-file-exists', audio.filePath);
                
                if (!fileExists) {
                    this.showError('El archivo de audio no existe');
                    return;
                }
            } catch (error) {
            }
            
            // Crear elemento de audio
            this.currentAudio = new Audio(audio.filePath);
            
            // Configurar eventos
            this.currentAudio.onended = () => {
                this.onAudioEnded();
            };
            
            this.currentAudio.onerror = (error) => {
                // console.error('Error reproduciendo audio:', error);
                this.onAudioEnded();
            };
            
            // Mostrar placa de video
            this.showAudioOverlay();
            
            // Reproducir audio
            this.currentAudio.play();
            
        } catch (error) {
            // console.error('Error reproduciendo audio:', error);
            this.onAudioEnded();
        }
    }

    stopCurrentAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }
        this.hideAudioOverlay();
        this.restoreOriginalVolume();
    }

    onAudioEnded() {
        this.currentAudio = null;
        this.hideAudioOverlay();
        this.restoreOriginalVolume();
    }

    showAudioOverlay() {
        // Ocultar empty-state cuando se muestra el audio overlay
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.style.display = 'none';
            emptyState.style.visibility = 'hidden';
            emptyState.style.zIndex = '1';
        }
        
        // Crear overlay si no existe
        if (!this.audioOverlay) {
            this.audioOverlay = document.createElement('div');
            this.audioOverlay.id = 'audio-overlay';
            this.audioOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            document.body.appendChild(this.audioOverlay);
        }
        
        // Limpiar contenido anterior
        this.audioOverlay.innerHTML = '';
        
        if (this.audioVideoPath) {
            // Mostrar video placa
            const video = document.createElement('video');
            video.src = this.audioVideoPath;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: cover;
            `;
            this.audioOverlay.appendChild(video);
        } else {
            // Mostrar texto por defecto si no hay video placa
            const textDiv = document.createElement('div');
            textDiv.style.cssText = `
                color: white;
                font-size: 24px;
                font-weight: bold;
                text-align: center;
            `;
            textDiv.textContent = 'AVISO DE SEGURIDAD';
            this.audioOverlay.appendChild(textDiv);
        }
        
        this.audioOverlay.style.display = 'flex';
    }

    hideAudioOverlay() {
        if (this.audioOverlay) {
            this.audioOverlay.style.display = 'none';
        }
    }

    restoreOriginalVolume() {
        const activePlayer = this.getActivePlayer();
        activePlayer.volume(this.originalVolume);
    }

    deleteAudio(audioId) {
        try {
            
            // Encontrar y eliminar el audio de la lista
            const audioIndex = this.loadedAudios.findIndex(a => a.id === audioId);
            if (audioIndex !== -1) {
                const audio = this.loadedAudios[audioIndex];   
                
                // Si es el audio que está reproduciéndose, detenerlo
                if (this.currentAudio && this.currentAudio.src && this.currentAudio.src.includes(audio.filePath)) {
                    this.stopCurrentAudio();
                }
                
                // Eliminar de la lista
                this.loadedAudios.splice(audioIndex, 1);
                
                // Actualizar localStorage
                localStorage.setItem('loadedAudios', JSON.stringify(this.loadedAudios));

            } else {
            }
        } catch (error) {
        }
    }

    clearAudios() {
        try {
            // Limpiar localStorage
            localStorage.removeItem('loadedAudios');
            localStorage.removeItem('audioVideoPath');
            
            // Limpiar variables
            this.loadedAudios = [];
            this.audioVideoPath = null;
            this.stopCurrentAudio();
            
            // Limpiar audios copiados físicamente
            ipcRenderer.invoke('clear-copied-audios').then(result => {
                if (result.success) {
                } else {
                    // console.error('Error eliminando audios copiados:', result.error);
                }
            });

        } catch (error) {
            // console.error('Error eliminando audios:', error);
        }
    }

    loadMusic(filePath, fileName) {
        try {
            const musicId = Date.now().toString(); // ID único para la música
            
            const musicData = {
                id: musicId,
                filePath: filePath,
                name: fileName, // Usar el nombre del archivo como nombre
                loadedAt: new Date().toISOString()
            };
            
            // Guardar el tema actual que se está reproduciendo (si hay) para recalcular índice después de ordenar
            let currentMusicPath = null;
            if (this.currentMusic && this.currentMusic.src) {
                currentMusicPath = this.currentMusic.src;
            }
            
            this.loadedMusic.push(musicData);
            
            // Ordenar alfabéticamente por nombre
            this.loadedMusic.sort((a, b) => a.name.localeCompare(b.name));
            
            console.log(`🎵 Música cargada: "${fileName}" (Total: ${this.loadedMusic.length} temas)`);
            
            // Si había música reproduciéndose, recalcular el índice basado en el archivo actual
            if (currentMusicPath) {
                const newIndex = this.loadedMusic.findIndex(m => {
                    // Comparar rutas normalizadas
                    const normalizedCurrent = currentMusicPath.replace(/^file:\/\//, '').replace(/\\/g, '/');
                    const normalizedMusic = m.filePath.replace(/\\/g, '/');
                    return normalizedCurrent.includes(normalizedMusic) || normalizedMusic.includes(normalizedCurrent);
                });
                
                if (newIndex !== -1) {
                    this.currentMusicIndex = newIndex;
                    console.log(`🔄 Índice de música actualizado a: ${this.currentMusicIndex} (después de ordenar)`);
                }
            }
            
            // Guardar en localStorage
            localStorage.setItem('loadedMusic', JSON.stringify(this.loadedMusic));
            
            // Si estamos en modo loopEmbarque y la música está activada, la nueva lista ya está disponible
            // La reproducción continuará automáticamente con la lista actualizada cuando termine el tema actual
            
        } catch (error) {
            console.error('❌ Error al cargar música:', error);
            this.showError('Error al cargar música');
        }
    }

    deleteMusic(musicId) {
        try {
            // Encontrar y eliminar la música de la lista
            const musicIndex = this.loadedMusic.findIndex(m => m.id === musicId);
            if (musicIndex !== -1) {
                const music = this.loadedMusic[musicIndex];   
                
                console.log(`🗑️ Eliminando música: "${music.name}"`);
                
                // Si es la música que está reproduciéndose, detenerla
                if (this.currentMusic && this.currentMusic.src && this.currentMusic.src.includes(music.filePath)) {
                    console.log('🛑 Deteniendo música que se está reproduciendo...');
                    this.stopCurrentMusic();
                    // Reiniciar reproducción si estamos en modo loopEmbarque
                    if (this.currentMode === 'loopEmbarque' && this.musicEnabled && this.loadedMusic.length > 1) {
                        // Ajustar índice si es necesario
                        if (this.currentMusicIndex >= musicIndex) {
                            this.currentMusicIndex = Math.max(0, this.currentMusicIndex - 1);
                        }
                    }
                }
                
                // Eliminar de la lista
                this.loadedMusic.splice(musicIndex, 1);
                
                console.log(`✅ Música eliminada. Total restante: ${this.loadedMusic.length} temas`);
                
                // Actualizar localStorage
                localStorage.setItem('loadedMusic', JSON.stringify(this.loadedMusic));
                
                // Si estamos en modo loopEmbarque y hay música restante, continuar reproducción
                if (this.currentMode === 'loopEmbarque' && this.musicEnabled && this.loadedMusic.length > 0) {
                    if (this.currentMusicIndex >= this.loadedMusic.length) {
                        this.currentMusicIndex = 0;
                    }
                    this.startMusicPlayback();
                }
            }
        } catch (error) {
            console.error('❌ Error eliminando música:', error);
        }
    }

    clearMusic() {
        try {
            console.log('🗑️ Limpiando toda la música...');
            
            // Detener música actual si está reproduciéndose
            this.stopCurrentMusic();
            
            // Limpiar localStorage
            localStorage.removeItem('loadedMusic');
            
            // Limpiar variables
            const count = this.loadedMusic.length;
            this.loadedMusic = [];
            this.currentMusicIndex = 0;
            
            console.log(`✅ ${count} temas de música eliminados`);
            
            // Limpiar música copiada físicamente
            ipcRenderer.invoke('clear-copied-music').then(result => {
                if (result.success) {
                    console.log('✅ Archivos de música eliminados del disco');
                } else {
                    console.error('❌ Error eliminando archivos de música:', result.error);
                }
            });

        } catch (error) {
            console.error('❌ Error eliminando música:', error);
        }
    }

    loadAudioVideo(filePath) {
        try {
            this.audioVideoPath = filePath;
            
            // Guardar en localStorage
            localStorage.setItem('audioVideoPath', filePath);

        } catch (error) {
            this.showError('Error al cargar video placa');
        }
    }

    loadCameraConfig() {
        try {
            const savedConfig = localStorage.getItem('cameraConfig');
            // // console.log('Cargando configuración de cámara...');
            // // console.log('savedConfig:', savedConfig);
            
            if (savedConfig) {
                this.cameraConfig = JSON.parse(savedConfig);
                // // console.log('Configuración de cámara cargada:', this.cameraConfig);
            } else {
                // // console.log('No hay configuración de cámara guardada');
            }
        } catch (error) {
            // console.error('Error cargando configuración de cámara:', error);
        }
    }

    getAllActiveItems(isCertificacion = false) {
        const activeItems = [];

        if (isCertificacion) {
            // En modo certificación, incluir todos los items sin restricciones de tiempo/días
            console.log('📋 Modo certificación: incluyendo todos los items sin restricciones');
            this.currentPlaylist.blocks.forEach((block) => {
                if (block.items && Array.isArray(block.items)) {
                    block.items.forEach((item) => {
                        // Solo incluir videos en certificación
                        if (item.type === 'video') {
                            activeItems.push(item);
                        }
                    });
                }
            });
        } else {
            // Modo normal: aplicar restricciones de tiempo/días
        const now = new Date();
        const currentDay = now.getDay(); // 0 = Domingo, 1 = Lunes, etc.
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();
            const currentTime = currentHours * 60 + currentMinutes;

            console.log('🔍 Buscando items activos...');
            console.log(`📅 Día actual: ${currentDay} (${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][currentDay]})`);
            console.log(`⏰ Hora actual: ${String(currentHours).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')} (${currentTime} minutos desde medianoche)`);

            this.currentPlaylist.blocks.forEach((block, blockIndex) => {  
            if (this.isBlockActive(block, currentDay, currentTime)) {
                    block.items.forEach((item, itemIndex) => {
                    if (this.isItemActive(item, currentDay, currentTime)) {
                        activeItems.push(item);
                    }
                });
            }
        });
        }

        return activeItems;
    }

    isBlockActive(block, currentDay, currentTime) {
        console.log(`🔍 Evaluando bloque "${block.name}":`, {
            useTimeRange: block.useTimeRange,
            startTime: block.startTime,
            endTime: block.endTime,
            daysOfWeek: block.daysOfWeek
        });
        
        // Verificar días de la semana
        if (block.daysOfWeek && block.daysOfWeek.length > 0) {
            // Convertir letras a números si es necesario
            const daysAsNumbers = this.convertDaysToNumbers(block.daysOfWeek);
            console.log(`📋 Bloque "${block.name}": días configurados:`, block.daysOfWeek, '->', daysAsNumbers, '| día actual:', currentDay);
            if (!daysAsNumbers.includes(currentDay)) {
                console.log(`❌ Bloque "${block.name}": NO activo (día no coincide)`);
                return false;
            }
        }
        
        // Verificar rango de tiempo si existen startTime y endTime
        // Si existen startTime y endTime, siempre usar el rango horario (ignorar useTimeRange)
        if (block.startTime && block.endTime) {
            const startTime = this.timeToMinutes(block.startTime);
            const endTime = this.timeToMinutes(block.endTime);
            console.log(`⏰ Bloque "${block.name}": rango ${block.startTime}-${block.endTime} (${startTime}-${endTime} min) | hora actual: ${currentTime} min`);
            const isInRange = currentTime >= startTime && currentTime <= endTime;
            if (!isInRange) {
                console.log(`❌ Bloque "${block.name}": NO activo (fuera del rango horario)`);
                return false;
            }
            console.log(`✅ Bloque "${block.name}": activo (dentro del rango horario)`);
        } else {
            console.log(`⚠️ Bloque "${block.name}": sin restricción horaria - useTimeRange: ${block.useTimeRange}, startTime: ${block.startTime}, endTime: ${block.endTime}`);
            console.log(`✅ Bloque "${block.name}": activo (sin restricción horaria)`);
        }
        
        return true;
    }

    isItemActive(item, currentDay, currentTime) {
        const itemName = item.name || item.file || 'Sin nombre';
        
        // Verificar días de la semana
        if (item.daysOfWeek && item.daysOfWeek.length > 0) {
            // Convertir letras a números si es necesario
            const daysAsNumbers = this.convertDaysToNumbers(item.daysOfWeek);
            console.log(`📄 Item "${itemName}": días configurados:`, item.daysOfWeek, '->', daysAsNumbers, '| día actual:', currentDay);
            if (!daysAsNumbers.includes(currentDay)) {
                console.log(`❌ Item "${itemName}": NO activo (día no coincide)`);
                return false;
            }
        }
        
        // Verificar rango de tiempo si existen startTime y endTime
        // Si existen startTime y endTime, siempre usar el rango horario (ignorar useTimeRange)
        if (item.startTime && item.endTime) {
            const startTime = this.timeToMinutes(item.startTime);
            const endTime = this.timeToMinutes(item.endTime);
            console.log(`⏰ Item "${itemName}": rango ${item.startTime}-${item.endTime} (${startTime}-${endTime} min) | hora actual: ${currentTime} min`);
            const isInRange = currentTime >= startTime && currentTime <= endTime;
            if (!isInRange) {
                console.log(`❌ Item "${itemName}": NO activo (fuera del rango horario)`);
                return false;
            }
            console.log(`✅ Item "${itemName}": activo (dentro del rango horario)`);
        } else {
            console.log(`✅ Item "${itemName}": activo (sin restricción horaria)`);
        }
        
        return true;
    }

    timeToMinutes(timeString) {
        // Espera formato "HH:MM" (24 horas)
        // Ejemplos: "09:00", "18:30", "14:15"
        if (!timeString || typeof timeString !== 'string') {
            console.error('❌ timeToMinutes: timeString inválido:', timeString);
            return 0;
        }
        
        const parts = timeString.split(':');
        if (parts.length !== 2) {
            console.error('❌ timeToMinutes: formato inválido, esperado "HH:MM", recibido:', timeString);
            return 0;
        }
        
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        
        if (isNaN(hours) || isNaN(minutes)) {
            console.error('❌ timeToMinutes: horas o minutos no son números:', timeString);
            return 0;
        }
        
        const totalMinutes = hours * 60 + minutes;
        console.log(`⏰ timeToMinutes: "${timeString}" -> ${totalMinutes} minutos (${hours}:${String(minutes).padStart(2, '0')})`);
        return totalMinutes;
    }

    // Convertir días de la semana de letras a números
    // L = Lunes (1), M = Martes (2), X = Miércoles (3), J = Jueves (4), V = Viernes (5), S = Sábado (6), D = Domingo (0)
    convertDaysToNumbers(daysOfWeek) {
        if (!daysOfWeek || !Array.isArray(daysOfWeek)) {
            return [];
        }
        
        const dayMap = {
            'L': 1,  // Lunes
            'M': 2,  // Martes
            'X': 3,  // Miércoles
            'J': 4,  // Jueves
            'V': 5,  // Viernes
            'S': 6,  // Sábado
            'D': 0   // Domingo
        };
        
        return daysOfWeek.map(day => {
            // Si es una letra, convertirla a número
            if (typeof day === 'string') {
                const upperDay = day.toUpperCase();
                return dayMap[upperDay] !== undefined ? dayMap[upperDay] : day;
            }
            // Si ya es un número, devolverlo tal cual (retrocompatibilidad)
            return day;
        });
    }

    async startPlayback() {
        // Prevenir múltiples llamadas simultáneas
        if (this.isStartingPlayback) {
            console.log('⏸️ startPlayback() ya en progreso, ignorando llamada duplicada');
            return;
        }
        this.isStartingPlayback = true;
        
        try {
            console.log('▶️ startPlayback() llamado');
            console.log('📊 Estado:', {
                currentIndex: this.currentIndex,
                filteredItemsLength: this.filteredItems.length,
                isPlaying: this.isPlaying
            });
            
            // Detener item anterior si existe
            if (this.currentItem) {
                console.log('🛑 Deteniendo item anterior:', this.currentItem.type);
                
                // Detener webcam si está activa
                if (this.currentItem.type === 'webcam') {
                    this.stopWebcam();
                }
                
                // Detener reproductores de video
                if (this.player1) {
                    this.player1.pause();
                }
                if (this.player2) {
                    this.player2.pause();
                }
                
                // NO detener this.currentAudio aquí - solo se usa para audios manuales del panel de control
                // y no deben interrumpirse cuando el proyecto pasa al siguiente video
            }
            
        if (this.currentIndex >= this.filteredItems.length) {
                console.log('🔄 Reiniciando índice (llegó al final)');
            this.currentIndex = 0;
        }

        this.currentItem = this.filteredItems[this.currentIndex];
        
                // Verificar que el item actual existe
            if (!this.currentItem) {
                console.error('❌ Error: currentItem es undefined en startPlayback');
                // Liberar flag antes de continuar
                this.isStartingPlayback = false;
                // Incrementar índice y continuar
                this.currentIndex++;
                if (this.currentIndex >= this.filteredItems.length) {
                    this.currentIndex = 0;
                }
                // Llamar a startPlayback de nuevo con un pequeño delay
                setTimeout(() => {
                    this.startPlayback();
                }, 100);
                return;
            }
            
            console.log('📄 Item actual:', {
                type: this.currentItem.type,
                file: this.currentItem.file,
                name: this.currentItem.name
            });
            
        const filePath = this.getFilePath(this.currentItem);

            // Verificar que filePath se obtuvo correctamente
            if (!filePath) {
                console.error('❌ Error: filePath es null/undefined en startPlayback');
                // Liberar flag antes de continuar
                this.isStartingPlayback = false;
                // Incrementar índice y continuar
                this.currentIndex++;
                if (this.currentIndex >= this.filteredItems.length) {
                    this.currentIndex = 0;
                }
                // Llamar a startPlayback de nuevo con un pequeño delay
                setTimeout(() => {
                    this.startPlayback();
                }, 100);
                return;
            }
            
            console.log('📁 FilePath:', filePath);

            // Verificar si el archivo existe (solo para archivos locales, no URLs)
            if (this.currentItem.type !== 'webcam') {
        const fileExists = await ipcRenderer.invoke('check-file-exists', filePath);
                console.log('📁 Archivo existe:', fileExists);
        if (!fileExists) {
                    console.error('❌ Archivo no existe, pasando al siguiente');
                    // Liberar flag antes de continuar
                    this.isStartingPlayback = false;
                    // Incrementar índice y continuar
                    this.currentIndex++;
                    if (this.currentIndex >= this.filteredItems.length) {
                        this.currentIndex = 0;
                    }
                    // Llamar a startPlayback de nuevo con un pequeño delay para evitar conflictos
                    setTimeout(() => {
                        this.startPlayback();
                    }, 100);
            return;
                }
        }

        // Reproducir según el tipo
            console.log(`🎬 Reproduciendo ${this.currentItem.type}:`, filePath);
            
        switch (this.currentItem.type) {
            case 'video':
                await this.playVideo(filePath);
                break;
                case 'webcam':
                    await this.playWebcamItem(filePath);
                break;
            case 'audio':
                await this.playAudio(filePath);
                break;
            default:
                    console.error('❌ Tipo no soportado:', this.currentItem.type);
                    // Liberar flag antes de continuar
                    this.isStartingPlayback = false;
                    // Incrementar índice y continuar
                    this.currentIndex++;
                    if (this.currentIndex >= this.filteredItems.length) {
                        this.currentIndex = 0;
                    }
                    // Llamar a startPlayback de nuevo con un pequeño delay
                    setTimeout(() => {
                        this.startPlayback();
                    }, 100);
            }

            // Precargar el siguiente item después de iniciar la reproducción actual
            this.preloadNextItem();
        } catch (error) {
            console.error('❌ Error en startPlayback:', error);
            // Liberar flag antes de continuar
            this.isStartingPlayback = false;
            // Incrementar índice y continuar
            this.currentIndex++;
            if (this.currentIndex >= this.filteredItems.length) {
                this.currentIndex = 0;
            }
            // Llamar a startPlayback de nuevo con un pequeño delay
            setTimeout(() => {
                this.startPlayback();
            }, 100);
        } finally {
            // Liberar el flag de inicio de reproducción (solo si no se liberó antes)
            // El flag ya se libera en los casos de error, así que esto es solo para el caso exitoso
            if (this.isStartingPlayback) {
                this.isStartingPlayback = false;
            }
        }
    }

    async playVideo(filePath) {
        console.log('🎥 playVideo() llamado con:', filePath);
        console.log('📋 Item actual:', {
            type: this.currentItem?.type,
            name: this.currentItem?.name,
            hasAudio: this.currentItem?.hasAudio
        });
        try {
            const activePlayer = this.getActivePlayer();
            console.log('🎮 Reproductor activo:', activePlayer ? 'encontrado' : 'NO encontrado');
            
            if (!activePlayer) {
                console.error('❌ No se pudo obtener el reproductor activo');
                this.nextItem();
                return;
            }
            
            // Asegurar que el reproductor esté listo antes de mostrar
            if (activePlayer.readyState() === 0) {
                console.log('⏳ Esperando reproductor activo...');
                await new Promise(resolve => {
                    activePlayer.ready(() => {
                        console.log('✅ Reproductor activo listo en playVideo');
                        resolve();
                    });
                });
            }
            
            console.log('🖼️ Mostrando reproductor de video...');
            this.showVideoPlayer();
            
            // Pequeño delay para asegurar que el DOM se actualizó
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Registrar inicio de reproducción para logging
            await this.logVideoPlayed();

            console.log('📹 Configurando fuente del video...');
            activePlayer.src({
                src: filePath,
                type: 'video/mp4'
            });
            console.log('✅ Fuente configurada');
            
            // Obtener el elemento video directamente
            const videoElement = activePlayer.el().querySelector('video');
            if (!videoElement) {
                console.error('❌ No se encontró elemento video en el reproductor');
            this.nextItem();
                return;
            }
            
            // Verificar si el video debe reproducirse con o sin audio
            // hasAudio: true = con audio, false = sin audio (muted)
            // Si no existe hasAudio, por defecto reproducir con audio
            const hasAudio = this.currentItem.hasAudio !== false; // Por defecto true si no está definido
            if (!hasAudio) {
                console.log('🔇 Video configurado sin audio (hasAudio: false)');
                videoElement.muted = true;
                activePlayer.muted(true);
            } else {
                console.log('🔊 Video configurado con audio (hasAudio: true o no definido)');
                videoElement.muted = false;
                activePlayer.muted(false);
            }
            
            console.log('📹 Elemento video encontrado:', {
                src: videoElement.src,
                currentSrc: videoElement.currentSrc,
                readyState: videoElement.readyState,
                paused: videoElement.paused
            });
            
            // Event listeners para el elemento video
            videoElement.addEventListener('loadedmetadata', () => {
                console.log('📊 Metadatos del video cargados:', {
                    width: videoElement.videoWidth,
                    height: videoElement.videoHeight,
                    duration: videoElement.duration
                });
            });
            
            videoElement.addEventListener('canplay', () => {
                console.log('▶️ Video puede reproducirse (canplay)');
            });
            
            videoElement.addEventListener('canplaythrough', () => {
                console.log('▶️ Video puede reproducirse completamente (canplaythrough)');
            });
            
            videoElement.addEventListener('play', () => {
                console.log('▶️ Video comenzó a reproducirse (play event)');
            });
            
            videoElement.addEventListener('playing', () => {
                console.log('▶️ Video está reproduciéndose (playing event)');
            });
            
            videoElement.addEventListener('loadstart', () => {
                console.log('📥 Video comenzó a cargar (loadstart)');
            });
            
            videoElement.addEventListener('waiting', () => {
                console.log('⏳ Video esperando datos (waiting)');
            });
            
            videoElement.addEventListener('error', (e) => {
                console.error('❌ Error en elemento video:', {
                    error: e,
                    errorCode: videoElement.error,
                    errorMessage: videoElement.error ? videoElement.error.message : 'N/A'
                });
                // Saltar al siguiente elemento si estamos en modo project
                if (this.currentMode === 'project' && this.isPlaying) {
                    console.log('⏭️ Saltando al siguiente elemento debido a error en elemento video...');
                    this.nextItem();
                }
            });
            
            // Detectar si el video es vertical y aplicar clase CSS
            const checkVideoOrientation = () => {
                const videoWidth = videoElement.videoWidth;
                const videoHeight = videoElement.videoHeight;
                
                if (videoWidth > 0 && videoHeight > 0) {
                    console.log('📐 Orientación del video:', {
                        width: videoWidth,
                        height: videoHeight,
                        isVertical: videoHeight > videoWidth
                    });
                    // Video es vertical si altura > ancho
                    const isVertical = videoHeight > videoWidth;
                    
                    // Agregar o remover clase según orientación
                    if (isVertical) {
                        activePlayer.el().classList.add('vertical-video');
                        console.log('📐 Clase vertical-video agregada');
                    } else {
                        activePlayer.el().classList.remove('vertical-video');
                        console.log('📐 Clase vertical-video removida');
                    }
                }
            };
            
            // Verificar cuando los metadatos estén cargados
            videoElement.addEventListener('loadedmetadata', checkVideoOrientation);
            // También verificar después de que el video pueda reproducirse
            videoElement.addEventListener('canplay', checkVideoOrientation);
            
            // Esperar a que el video pueda reproducirse antes de llamar a play()
            const waitForCanPlay = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    console.warn('⚠️ Timeout esperando canplay, intentando reproducir de todos modos');
                    resolve();
                }, 5000);
                
                videoElement.addEventListener('canplay', () => {
                    clearTimeout(timeout);
                    console.log('✅ Video listo para reproducir');
                    resolve();
                }, { once: true });
                
                videoElement.addEventListener('error', (e) => {
                    clearTimeout(timeout);
                    console.error('❌ Error antes de reproducir:', e);
                    // Saltar al siguiente elemento si estamos en modo project
                    if (this.currentMode === 'project' && this.isPlaying) {
                        console.log('⏭️ Saltando al siguiente elemento debido a error antes de reproducir...');
                        this.nextItem();
                    }
                    reject(e);
                }, { once: true });
            });
            
            try {
                await waitForCanPlay;
                
                // Verificar que el video esté visible antes de reproducir
                const playerEl = activePlayer.el();
                const computedStyle = window.getComputedStyle(playerEl);
                
                console.log('🔍 Estado antes de reproducir:', {
                    display: computedStyle.display,
                    visibility: computedStyle.visibility,
                    opacity: computedStyle.opacity,
                    width: playerEl.offsetWidth,
                    height: playerEl.offsetHeight
                });
                
                // Si el reproductor no está visible, intentar forzar visibilidad
                if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden' || computedStyle.opacity === '0') {
                    console.warn('⚠️ Reproductor no visible, forzando visibilidad...');
                    this.showVideoPlayer();
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                console.log('▶️ Intentando reproducir video...');
                await activePlayer.play();
                
                // Verificar que realmente comenzó a reproducirse
                await new Promise(resolve => {
                    const checkPlaying = () => {
                        if (!videoElement.paused && videoElement.readyState >= 2) {
                            console.log('✅ Video confirmado reproduciéndose');
                            resolve();
                        } else {
                            setTimeout(checkPlaying, 100);
                        }
                    };
                    checkPlaying();
                });
                
                // Verificar estado visual después de reproducir
                const emptyStateEl = document.getElementById('empty-state');
                
                console.log('✅ Llamada a play() completada, estado:', {
                    paused: videoElement.paused,
                    readyState: videoElement.readyState,
                    currentTime: videoElement.currentTime,
                    playerDisplay: window.getComputedStyle(playerEl).display,
                    playerVisibility: window.getComputedStyle(playerEl).visibility,
                    playerOpacity: window.getComputedStyle(playerEl).opacity,
                    playerZIndex: window.getComputedStyle(playerEl).zIndex,
                    playerWidth: playerEl.offsetWidth,
                    playerHeight: playerEl.offsetHeight,
                    videoDisplay: window.getComputedStyle(videoElement).display,
                    videoVisibility: window.getComputedStyle(videoElement).visibility,
                    videoOpacity: window.getComputedStyle(videoElement).opacity,
                    videoWidth: videoElement.offsetWidth,
                    videoHeight: videoElement.offsetHeight,
                    emptyStateDisplay: emptyStateEl ? window.getComputedStyle(emptyStateEl).display : 'N/A',
                    emptyStateZIndex: emptyStateEl ? window.getComputedStyle(emptyStateEl).zIndex : 'N/A'
                });
            } catch (playError) {
                console.error('❌ Error al reproducir:', playError);
                // Intentar forzar reproducción
                videoElement.play().catch(err => {
                    console.error('❌ Error forzando reproducción:', err);
                    this.nextItem();
                });
            }
        } catch (error) {
            console.error('❌ Error en playVideo():', error);
            this.nextItem();
        }
    }


    async playWebcam() {
        this.showWebcamPlayer();
        
        setTimeout(() => {
            this.nextItem();
        }, this.currentItem.duration * 1000);
    }

    async preloadNextItem() {
        if (this.filteredItems.length <= 1) return; // No hay siguiente item

        const nextIndex = (this.currentIndex + 1) % this.filteredItems.length;
        this.nextItemData = this.filteredItems[nextIndex];
        const nextFilePath = this.getFilePath(this.nextItemData);

        try {
            // Verificar si el archivo existe antes de precargar
            const fileExists = await ipcRenderer.invoke('check-file-exists', nextFilePath);
            if (!fileExists) {
                this.isPreloaded = false;
                return;
            }

            // Solo precargar si es video o audio
            if (this.nextItemData.type === 'video' || this.nextItemData.type === 'audio') {
                this.isPreloaded = false;
                
                // Usar el reproductor inactivo para precargar
                const inactivePlayer = this.getInactivePlayer();
                
                inactivePlayer.src({
                src: nextFilePath,
                    type: this.nextItemData.type === 'video' ? 'video/mp4' : 'audio/mp3'
                });
                
                // Eventos de precarga (solo una vez)
                const canplayHandler = () => {
                    this.isPreloaded = true;
                    inactivePlayer.off('canplay', canplayHandler);
                };
                
                const errorHandler = (error) => {
                    this.isPreloaded = false;
                    inactivePlayer.off('error', errorHandler);
                };
                
                inactivePlayer.on('canplay', canplayHandler);
                inactivePlayer.on('error', errorHandler);
                
            } else {
                this.isPreloaded = true; // Para webcam no necesita precarga
            }
        } catch (error) {
            // console.error('Error precargando siguiente item:', error);
            this.isPreloaded = false;
        }
    }

    async nextItem() {
        if (!this.isPlaying) return;

        // Prevenir múltiples llamadas simultáneas
        if (this.isTransitioning) {
            console.log('⏸️ Transición en progreso, ignorando nextItem()');
            return;
        }
        this.isTransitioning = true;

        // Detener completamente el item actual antes de pasar al siguiente
        console.log('🛑 Deteniendo item actual antes de pasar al siguiente...');
        
        // Detener webcam si está activa
        this.stopWebcam();
        
        // Detener reproductores de video
        if (this.player1) {
            this.player1.pause();
        }
        if (this.player2) {
            this.player2.pause();
        }
        
        // NO detener this.currentAudio aquí - solo se usa para audios manuales del panel de control
        // y no deben interrumpirse cuando el proyecto pasa al siguiente video

        // Verificar que hay items disponibles
        if (!this.filteredItems || this.filteredItems.length === 0) {
            console.error('❌ Error: No hay items disponibles en nextItem');
            this.isTransitioning = false;
            return;
        }

        // Pequeño delay para asegurar que todo se detuvo
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            // Si tenemos el siguiente item precargado, hacer transición suave
            if (this.isPreloaded && this.nextItemData) {
                await this.switchToPreloadedItem();
            } else {
                // Si no está precargado, cargar normalmente
        this.currentIndex++;
                
                // Verificar que el índice es válido
                if (this.currentIndex >= this.filteredItems.length) {
                    this.currentIndex = 0;
                }
                
                await this.startPlayback();
            }
        } finally {
            // Liberar el flag de transición
            this.isTransitioning = false;
        }
    }

    async switchToPreloadedItem() {
        try {
            // Transición instantánea
            
            // Actualizar índices y items
            this.currentIndex = (this.currentIndex + 1) % this.filteredItems.length;
            this.currentItem = this.nextItemData;
            this.nextItemData = null;
            this.isPreloaded = false;
            
            // Cambiar reproductor activo (el inactivo ya tiene el video precargado)
            this.switchActivePlayer();
            
            // Mostrar el reproductor activo
            this.showVideoPlayer();
            
            // Registrar e iniciar reproducción del video ya precargado
            const activePlayer = this.getActivePlayer();
            // Registrar el inicio de reproducción (solo si es video)
            await this.logVideoPlayed();

            await activePlayer.play();
            
            // Transición completada
            
            // Precargar el siguiente item
            this.preloadNextItem();
            
        } catch (error) {
            // console.error('Error en transición suave:', error);
            // Fallback a método normal
        this.currentIndex++;
            await this.startPlayback();
        }
    }

    getFilePath(item) {
        // Verificar que el item existe y tiene las propiedades necesarias
        if (!item) {
            // console.error('❌ Error: item es undefined en getFilePath');
            return null;
        }
        
        if (!item.type) {
            // console.error('❌ Error: item.type es undefined en getFilePath:', item);
            return null;
        }
        
        // Para items de webcam, usar la URL guardada en la configuración
        if (item.type === 'webcam') {
            // // console.log('Item de webcam detectado');
            // // console.log('cameraConfig:', this.cameraConfig);
            // // console.log('item.url:', item.url);
            // // console.log('item.file:', item.file);
            
            if (this.cameraConfig && this.cameraConfig.url) {
                // // console.log('Usando URL de configuración:', this.cameraConfig.url);
                return this.cameraConfig.url;
            } else {
                // Fallback a la URL del JSON si no hay configuración guardada
                // // console.log('Usando URL del JSON:', item.url || item.file);
                return item.url || item.file;
            }
        }
        
        let filePath = item.relativePath || item.file;
        
        // Normalizar barras
        filePath = filePath.replace(/\\/g, '/');
        
        // Si no es ruta absoluta, construirla
        if (!filePath.startsWith('/') && !filePath.includes('://')) {
            if (filePath.startsWith('videos/')) {
                filePath = `${this.projectPath}/${filePath}`;
            } else {
                filePath = `${this.projectPath}/videos/${filePath}`;
            }
        }
        
        return filePath;
    }

    showVideoPlayer() {
        console.log('🖼️ showVideoPlayer() llamado, activePlayer:', this.activePlayer);
        
        // Ocultar empty-state primero
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.style.display = 'none';
            emptyState.style.visibility = 'hidden';
            emptyState.style.zIndex = '1';
        }
        
        document.getElementById('audio-state').style.display = 'none';
        document.getElementById('webcam-state').style.display = 'none';
        
        // Restablecer elementos de video que pudieron haber sido ocultados por showEmptyState()
        // Esto asegura que los videos de seguridad, loop y audio funcionen correctamente
        const allVideos = document.querySelectorAll('video');
        allVideos.forEach(video => {
            // Solo restablecer si el video está dentro de un reproductor activo
            const player = video.closest('#video-player, #video-player-2');
            if (player) {
                video.style.display = '';
                video.style.visibility = '';
                video.style.opacity = '';
                video.style.zIndex = '';
            }
        });
        
        // Restablecer elementos .vjs-tech
        const vjsTechElements = document.querySelectorAll('.vjs-tech');
        vjsTechElements.forEach(el => {
            const player = el.closest('#video-player, #video-player-2');
            if (player) {
                el.style.display = '';
                el.style.visibility = '';
                el.style.opacity = '';
                el.style.zIndex = '';
            }
        });
        
        // Mostrar solo el reproductor activo usando clases CSS
        if (this.activePlayer === 1) {
            console.log('📺 Mostrando video-player (player 1)');
            const player1 = document.getElementById('video-player');
            player1.classList.remove('hide');
            player1.style.display = 'block';
            player1.style.visibility = 'visible';
            player1.style.opacity = '1';
            player1.style.zIndex = '2';
            
            const player2 = document.getElementById('video-player-2');
            player2.classList.remove('show');
            player2.style.display = 'none';
            player2.style.visibility = 'hidden';
            
            // Forzar visibilidad del elemento HTML5 interno
            const video1 = document.querySelector('#video-player video');
            const vjsTech1 = document.querySelector('#video-player .vjs-tech');
            
            console.log('📹 video-player estado:', {
                display: window.getComputedStyle(player1).display,
                visibility: window.getComputedStyle(player1).visibility,
                opacity: window.getComputedStyle(player1).opacity,
                zIndex: window.getComputedStyle(player1).zIndex,
                width: player1.offsetWidth,
                height: player1.offsetHeight
            });
            
            console.log('📹 video1 elemento:', video1 ? 'encontrado' : 'NO encontrado');
            if (video1) {
                video1.style.display = 'block';
                video1.style.visibility = 'visible';
                video1.style.opacity = '1';
                video1.style.width = '100%';
                video1.style.height = '100%';
                console.log('📹 video1 estilos aplicados');
            }
            
            if (vjsTech1) {
                vjsTech1.style.display = 'block';
                vjsTech1.style.visibility = 'visible';
                vjsTech1.style.opacity = '1';
            }
            
            const video2 = document.querySelector('#video-player-2 video');
            if (video2) {
                video2.style.display = 'none';
                video2.style.visibility = 'hidden';
            }

        } else {
            console.log('📺 Mostrando video-player-2 (player 2)');
            const player1 = document.getElementById('video-player');
            player1.classList.add('hide');
            player1.style.display = 'none';
            player1.style.visibility = 'hidden';
            
            const player2 = document.getElementById('video-player-2');
            player2.classList.add('show');
            player2.style.display = 'block';
            player2.style.visibility = 'visible';
            player2.style.opacity = '1';
            player2.style.zIndex = '2';
            
            // Forzar visibilidad del elemento HTML5 interno
            const video1 = document.querySelector('#video-player video');
            if (video1) {
                video1.style.display = 'none';
                video1.style.visibility = 'hidden';
            }
            
            const video2 = document.querySelector('#video-player-2 video');
            const vjsTech2 = document.querySelector('#video-player-2 .vjs-tech');
            
            console.log('📹 video-player-2 estado:', {
                display: window.getComputedStyle(player2).display,
                visibility: window.getComputedStyle(player2).visibility,
                opacity: window.getComputedStyle(player2).opacity,
                zIndex: window.getComputedStyle(player2).zIndex,
                width: player2.offsetWidth,
                height: player2.offsetHeight
            });
            
            console.log('📹 video2 elemento:', video2 ? 'encontrado' : 'NO encontrado');
            if (video2) {
                video2.style.display = 'block';
                video2.style.visibility = 'visible';
                video2.style.opacity = '1';
                video2.style.width = '100%';
                video2.style.height = '100%';
                console.log('📹 video2 estilos aplicados');
            }
            
            if (vjsTech2) {
                vjsTech2.style.display = 'block';
                vjsTech2.style.visibility = 'visible';
                vjsTech2.style.opacity = '1';
            }
        }
    }

    showAudioPlayer() {
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('video-player').style.display = 'none';
        document.getElementById('webcam-state').style.display = 'none';
        document.getElementById('audio-state').style.display = 'block';
    }

    showWebcamPlayer() {
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('video-player').style.display = 'none';
        document.getElementById('audio-state').style.display = 'none';
        document.getElementById('webcam-state').style.display = 'flex';
        
        document.getElementById('webcam-info').textContent = 
            `Duración: ${this.currentItem.duration} segundos`;
    }


    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    // ===== MÉTODOS PARA ACTUALIZACIÓN DE CONTENIDO =====

    // Detener reproducción actual
    stopPlayback() {
        try {
            // console.log('⏹️ Deteniendo reproducción del player...');
            
            // Detener reproductores de video
            if (this.player1) {
                this.player1.pause();
            }
            if (this.player2) {
                this.player2.pause();
            }
            
            // Detener audio actual
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }
            
            // Detener webcam si está activa
            this.stopWebcam();
            
            // Resetear estado
            this.isPlaying = false;
            this.currentIndex = 0;
            this.currentItem = null;
            this.nextItemData = null;
            this.isPreloaded = false;
            
            // Mostrar estado vacío
            this.showEmptyState();
            
            // console.log('✅ Reproducción detenida');
            
        } catch (error) {
            // console.error('❌ Error deteniendo reproducción:', error);
        }
    }

    turnOff() {
        console.log('🔴 Apagando player...');
        // Detener cualquier modo activo
        this.currentMode = 'none';
        this.isPlaying = false;
        // Detener reproducción y mostrar pantalla negra
        this.stopPlayback();
    }

    playCertificacion(projectData) {
        console.log('📋 Iniciando reproducción de certificación...');
        console.log('📁 projectData recibido:', projectData);
        
        // Guardar el proyecto original y su path si existe
        if (!this.originalProject) {
            this.originalProject = this.currentPlaylist;
            this.originalProjectPath = this.projectPath; // Guardar también el path original
            console.log('💾 Proyecto original guardado, path:', this.originalProjectPath);
        }
        
        // Si el projectData no tiene folderPath, usar el original
        if (!projectData.folderPath && this.originalProjectPath) {
            projectData.folderPath = this.originalProjectPath;
            console.log('📁 Usando folderPath del proyecto original:', this.originalProjectPath);
        }
        
        // Cargar el proyecto temporal de certificación
        this.loadProjectFromData(projectData, true); // true indica que es certificación
    }

    showEmptyState() {
        console.log('🖼️ Mostrando estado vacío (pantalla negra)');
        
        // Pausar reproductores de video (NO limpiar fuentes para evitar errores)
        if (this.player1) {
            try {
                this.player1.pause();
                // NO limpiar src() aquí porque causa errores en video.js
                // this.player1.src('');
                // this.player1.load();
            } catch (e) {
                console.error('Error pausando player1:', e);
            }
        }
        if (this.player2) {
            try {
                this.player2.pause();
                // NO limpiar src() aquí porque causa errores en video.js
                // this.player2.src('');
                // this.player2.load();
            } catch (e) {
                console.error('Error pausando player2:', e);
            }
        }
        
        // Ocultar reproductores de video con múltiples propiedades para asegurar que estén ocultos
        const videoPlayer1 = document.getElementById('video-player');
        const videoPlayer2 = document.getElementById('video-player-2');
        
        // Ocultar todos los elementos de video en la página (pero NO limpiar fuentes de video.js)
        const allVideos = document.querySelectorAll('video');
        allVideos.forEach(video => {
            // Solo pausar, no limpiar fuentes para evitar errores en video.js
            try {
                video.pause();
            } catch (e) {
                // Ignorar errores al pausar
            }
            video.style.display = 'none';
            video.style.visibility = 'hidden';
            video.style.opacity = '0';
            video.style.zIndex = '-1';
            // NO limpiar src ni srcObject para evitar errores en video.js
            // video.js maneja sus propias fuentes y limpiarlas causa errores
        });
        
        if (videoPlayer1) {
            videoPlayer1.style.display = 'none';
            videoPlayer1.style.visibility = 'hidden';
            videoPlayer1.style.opacity = '0';
            videoPlayer1.style.zIndex = '-1';
        }
        if (videoPlayer2) {
            videoPlayer2.style.display = 'none';
            videoPlayer2.style.visibility = 'hidden';
            videoPlayer2.style.opacity = '0';
            videoPlayer2.style.zIndex = '-1';
        }
        
        // Ocultar también elementos de video.js
        const vjsTechElements = document.querySelectorAll('.vjs-tech');
        vjsTechElements.forEach(el => {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.opacity = '0';
            el.style.zIndex = '-1';
        });
        
        // Ocultar webcam
        this.stopWebcam();
        const webcamState = document.getElementById('webcam-state');
        if (webcamState) {
            webcamState.style.display = 'none';
            webcamState.style.visibility = 'hidden';
            webcamState.style.opacity = '0';
            webcamState.style.zIndex = '-1';
        }
        
        // Ocultar audio overlay
        this.hideAudioOverlay();
        const audioState = document.getElementById('audio-state');
        if (audioState) {
            audioState.style.display = 'none';
            audioState.style.visibility = 'hidden';
            audioState.style.opacity = '0';
            audioState.style.zIndex = '-1';
        }
        
        // Mostrar estado vacío con z-index alto
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.style.display = 'flex';
            emptyState.style.visibility = 'visible';
            emptyState.style.opacity = '1';
            emptyState.style.zIndex = '9999';
            
            // Si hay un proyecto cargado, ocultar el texto (solo mostrar pantalla negra)
            // Si no hay proyecto, mostrar el texto "Selecciona un proyecto JSON para comenzar"
            const hasProject = this.currentPlaylist && this.currentPlaylist.blocks && this.currentPlaylist.blocks.length > 0;
            const textElements = emptyState.querySelectorAll('p');
            textElements.forEach(p => {
                if (hasProject) {
                    // Ocultar texto cuando hay proyecto pero no items activos
                    p.style.display = 'none';
                } else {
                    // Mostrar texto cuando no hay proyecto
                    p.style.display = 'block';
                }
            });
            
            console.log('✅ Estado vacío mostrado', hasProject ? '(proyecto cargado, sin items activos)' : '(sin proyecto)');
        } else {
            console.error('❌ No se encontró el elemento empty-state');
        }
    }

    // Reiniciar player con contenido nuevo
    restartPlayer() {
        try {
            // console.log('🔄 Reiniciando player con contenido nuevo...');
            
            // Notificar al panel de control que se reinició (fallback)
            // console.log('🔄 Enviando señal de reinicio al panel de control...');
            ipcRenderer.send('player-restarted', {
                timestamp: new Date().toISOString(),
                message: 'Player reiniciado con contenido nuevo'
            });
            
            // Recargar proyecto desde programacion/
            this.loadLastProject();
            
            // console.log('✅ Player reiniciado');
            
        } catch (error) {
            // console.error('❌ Error reiniciando player:', error);
        }
    }

    // Registrar video reproducido en el log diario
    async logVideoPlayed() {
        try {
            if (!this.currentItem || this.currentItem.type !== 'video') {
                return; // Solo registrar videos, no audios o webcams
            }

            const videoName = this.currentItem.name || this.currentItem.file || 'video_desconocido';
            const duration = this.currentItem.duration || 0;

            // Llamar al proceso principal para registrar en el log
            await ipcRenderer.invoke('log-video-played', videoName, duration);
        } catch (error) {
            // // console.error('Error registrando video en log:', error);
        }
    }

}

// Inicializar el reproductor cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.playerManager = new PlayerManager();
});
