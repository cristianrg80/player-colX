const { ipcRenderer } = require('electron');

class ControlPanel {
    constructor() {
        this.audiosList = []; // Lista local de audios
        this._toastTimeout = null;
        this.initializePanel();
        this.setupEventListeners();
    }

    initializePanel() {
        // // console.log('Panel de control inicializado');
        
        // Detectar estado de maximización de la ventana
        this.checkMaximizedState();
        this.setupMaximizeListener();
        
        // Esperar un momento para que el reproductor principal esté listo
        setTimeout(() => {
            this.updateAudioList();
            this.updateMusicList();
            this.checkLoadedVideos();
            this.loadSavedCameraUrl();
            this.loadManagerConfig();
            this.checkInitialState();
        }, 1000);
    }

    checkMaximizedState() {
        // Verificar si la ventana está maximizada
        ipcRenderer.invoke('is-window-maximized').then(isMaximized => {
            if (isMaximized) {
                document.body.classList.add('maximized');
            } else {
                document.body.classList.remove('maximized');
            }
        }).catch(() => {
            // Si no hay IPC handler, verificar por tamaño de ventana
            const width = window.innerWidth;
            const height = window.innerHeight;
            const screenWidth = screen.width;
            const screenHeight = screen.height;
            
            // Considerar maximizada si ocupa más del 95% de la pantalla
            if (width >= screenWidth * 0.95 && height >= screenHeight * 0.95) {
                document.body.classList.add('maximized');
            } else {
                document.body.classList.remove('maximized');
            }
        });
    }

    setupMaximizeListener() {
        // Escuchar eventos de maximización desde el proceso principal
        ipcRenderer.on('window-maximized', () => {
            document.body.classList.add('maximized');
        });

        ipcRenderer.on('window-unmaximized', () => {
            document.body.classList.remove('maximized');
        });
        
        // Escuchar cambios en el tamaño de la ventana como respaldo
        window.addEventListener('resize', () => {
            this.checkMaximizedState();
        });
    }

    setupEventListeners() {
        console.log('🔧 Configurando event listeners...');
        // Botón de configuración - verificar si necesita contraseña
        document.getElementById('config-btn').addEventListener('click', () => {
            this.handleConfigButtonClick();
        });
        
        // Botones del modal de contraseña
        document.getElementById('confirm-password').addEventListener('click', () => {
            this.checkPassword();
        });

        document.getElementById('cancel-password').addEventListener('click', () => {
            this.hidePasswordModal();
        });
        

        // Botones para cargar videos
        document.getElementById('load-security-video-btn').addEventListener('click', () => {
            this.loadSecurityVideo();
        });

        document.getElementById('load-loop-video-btn').addEventListener('click', () => {
            this.loadLoopVideo();
        });

        document.getElementById('load-loop-embarque-video-btn').addEventListener('click', () => {
            this.loadLoopEmbarqueVideo();
        });

        // Botones de modo de reproducción
        document.getElementById('mode-project-btn').addEventListener('click', () => {
            this.setMode('project');
        });

        document.getElementById('mode-security-btn').addEventListener('click', () => {
            this.setMode('security');
        });

        document.getElementById('mode-loop-btn').addEventListener('click', () => {
            this.setMode('loop');
        });

        document.getElementById('mode-loop-embarque-btn').addEventListener('click', () => {
            this.setMode('loopEmbarque');
        });

        const certificacionBtn = document.getElementById('mode-certificacion-btn');
        console.log('🔍 Buscando botón mode-certificacion-btn:', certificacionBtn);
        if (certificacionBtn) {
            console.log('✅ Botón encontrado, registrando listener...');
            certificacionBtn.addEventListener('click', (e) => {
                console.log('🔘 Botón Certificación clickeado', e);
                e.preventDefault();
                e.stopPropagation();
                try {
                    this.openCertificacionModal();
                } catch (error) {
                    console.error('❌ Error en openCertificacionModal:', error);
                }
            });
            console.log('✅ Listener registrado correctamente');
        } else {
            console.error('❌ No se encontró el botón mode-certificacion-btn');
            console.error('🔍 Elementos disponibles:', document.querySelectorAll('button[id*="certificacion"]'));
        }

        document.getElementById('mode-off-btn').addEventListener('click', () => {
            this.turnOff();
        });

        // Event listeners para modal de certificación
        const closeCertModal = document.getElementById('close-certificacion-modal');
        if (closeCertModal) {
            closeCertModal.addEventListener('click', () => {
                this.closeCertificacionModal();
            });
        } else {
            console.error('❌ No se encontró el botón close-certificacion-modal');
        }

        const playCertBtn = document.getElementById('play-certificacion-btn');
        if (playCertBtn) {
            playCertBtn.addEventListener('click', () => {
                this.playCertificacion();
            });
        } else {
            console.error('❌ No se encontró el botón play-certificacion-btn');
        }

        // Botón para limpiar videos
        document.getElementById('clear-videos-btn').addEventListener('click', () => {
            this.clearVideos();
        });

        // Botones para audios
        document.getElementById('load-audio-btn').addEventListener('click', () => {
            this.showAudioNameModal();
        });

        document.getElementById('clear-audios-btn').addEventListener('click', () => {
            this.clearAudios();
        });

        document.getElementById('load-music-btn').addEventListener('click', () => {
            this.loadMusic();
        });

        document.getElementById('clear-music-btn').addEventListener('click', () => {
            this.clearMusic();
        });

        document.getElementById('enable-music-toggle').addEventListener('change', (e) => {
            this.toggleMusicEnabled(e.target.checked);
        });

        document.getElementById('load-audio-video-btn').addEventListener('click', () => {
            this.loadAudioVideo();
        });

        // Botones para cámara IP
        document.getElementById('test-camera-btn').addEventListener('click', () => {
            this.testCamera();
        });

        document.getElementById('save-camera-btn').addEventListener('click', () => {
            this.saveCameraUrl();
        });

        // Botones de servidor HTTP eliminados (ya no se usa)

        // Botones para configuración del Manager
        document.getElementById('save-manager-config-btn').addEventListener('click', () => {
            this.saveManagerConfig();
        });

        document.getElementById('test-manager-btn').addEventListener('click', () => {
            this.testManagerConnection();
        });

        // Botón para importar proyecto manualmente
        document.getElementById('import-project-btn').addEventListener('click', () => {
            this.importProjectManually();
        });

        // Botones de prueba rápida - eliminados (no existen en el HTML)

        // Modal de nombre de audio
        // Los listeners de audio-name se registran en showAudioNameModal() para evitar duplicados
        // No registrar aquí para evitar que se abra dos veces el diálogo

        // Modal de prueba de cámara
        document.getElementById('close-camera-test').addEventListener('click', () => {
            this.closeCameraTest();
        });

        document.getElementById('apply-quality-btn').addEventListener('click', () => {
            this.applyQualitySettings();
        });

        // El listener de Enter en audio-name-input se registra en showAudioNameModal() para evitar duplicados

        // Enter en el input de contraseña para confirmar
        document.getElementById('password-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.checkPassword();
            }
        });

        // Tecla Escape para cerrar modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAudioNameModal();
                this.closeCameraTest();
                this.hidePasswordModal();
            }
        });
    }

    // Manejar clic en el botón de configuración
    handleConfigButtonClick() {
        const configPanel = document.getElementById('config-panel');
        const isConfigVisible = configPanel.style.display === 'block';
        
        if (isConfigVisible) {
            // Si el panel está visible, simplemente cerrarlo sin pedir contraseña
            this.toggleConfigPanel();
        } else {
            // Si el panel está oculto, pedir contraseña antes de mostrarlo
            this.showPasswordModal();
        }
    }

    // Funciones para modal de contraseña
    showPasswordModal() {
        const modal = document.getElementById('password-modal');
        const input = document.getElementById('password-input');
        const errorMsg = document.getElementById('password-error');
        
        modal.style.display = 'flex';
        input.value = '';
        errorMsg.style.display = 'none';
        input.focus();
    }

    hidePasswordModal() {
        const modal = document.getElementById('password-modal');
        const input = document.getElementById('password-input');
        const errorMsg = document.getElementById('password-error');
        
        modal.style.display = 'none';
        input.value = '';
        errorMsg.style.display = 'none';
    }

    checkPassword() {
        const input = document.getElementById('password-input');
        const errorMsg = document.getElementById('password-error');
        const password = input.value.trim();
        
        const correctPassword = 'info1235';
        
        if (password === correctPassword) {
            // Contraseña correcta, ocultar modal y mostrar panel de configuración
            this.hidePasswordModal();
            this.toggleConfigPanel();
        } else {
            // Contraseña incorrecta, mostrar error
            errorMsg.style.display = 'block';
            input.value = '';
            input.focus();
        }
    }

    toggleConfigPanel() {
        const configPanel = document.getElementById('config-panel');
        const configBtn = document.getElementById('config-btn');
        const playbackModeSection = document.getElementById('playback-mode-section');
        const audioListSection = document.getElementById('audio-list-section');
        
        if (configPanel.style.display === 'none' || configPanel.style.display === '') {
            // Mostrar panel de configuración
            configPanel.style.display = 'block';
            
            // Ocultar secciones externas
            playbackModeSection.style.display = 'none';
            audioListSection.style.display = 'none';
        } else {
            // Ocultar panel de configuración
            configPanel.style.display = 'none';
            
            // Mostrar secciones externas
            playbackModeSection.style.display = 'block';
            audioListSection.style.display = 'block';
        }
    }


    async loadSecurityVideo() {
        try {
            // // console.log('Cargando video de seguridad desde panel de control');
            const result = await ipcRenderer.invoke('select-video-file');
            if (result.success) {
                // // console.log('Video de seguridad cargado:', result.filePath);
                await ipcRenderer.invoke('control-command', {
                    command: 'loadSecurityVideo',
                    data: { filePath: result.filePath }
                });
                // Actualizar texto del botón
                document.getElementById('load-security-video-btn').innerHTML = 'Cambiar Video Seguridad';
                // Actualizar botones de modo
                this.updatePlaybackModeButtons();
                // Toast (verde)
                this.showToast('Video de seguridad cargado correctamente', 'success');
            } else {
                // console.error('Error cargando video de seguridad:', result.error);
            }
        } catch (error) {
            // console.error('Error cargando video de seguridad:', error);
        }
    }

    async loadLoopVideo() {
        try {
            // // console.log('Cargando video de loop desde panel de control');
            const result = await ipcRenderer.invoke('select-video-file');
            if (result.success) {
                // // console.log('Video de loop cargado:', result.filePath);
                await ipcRenderer.invoke('control-command', {
                    command: 'loadLoopVideo',
                    data: { filePath: result.filePath }
                });
                // Actualizar texto del botón
                document.getElementById('load-loop-video-btn').innerHTML = 'Cambiar Video Loop';
                // Actualizar botones de modo
                this.updatePlaybackModeButtons();
                // Toast (verde)
                this.showToast('Video de loop cargado correctamente', 'success');
            } else {
                // console.error('Error cargando video de loop:', result.error);
            }
        } catch (error) {
            // console.error('Error cargando video de loop:', error);
        }
    }

    async loadLoopEmbarqueVideo() {
        try {
            const result = await ipcRenderer.invoke('select-video-file');
            if (result.success) {
                await ipcRenderer.invoke('control-command', {
                    command: 'loadLoopEmbarqueVideo',
                    data: { filePath: result.filePath }
                });
                // Actualizar texto del botón
                document.getElementById('load-loop-embarque-video-btn').innerHTML = 'Cambiar Video Loop Embarque';
                // Actualizar botones de modo
                this.updatePlaybackModeButtons();
                // Toast (verde)
                this.showToast('Video de loop embarque cargado correctamente', 'success');
            } else {
                // console.error('Error cargando video de loop embarque:', result.error);
            }
        } catch (error) {
            // console.error('Error cargando video de loop embarque:', error);
        }
    }

    async setMode(mode) {
        try {
            // // console.log(`Cambiando modo a: ${mode}`);
            await ipcRenderer.invoke('control-command', {
                command: 'setMode',
                data: { mode: mode }
            });
            this.updateModeDisplay(mode);
        } catch (error) {
            // console.error('Error cambiando modo:', error);
        }
    }

    async turnOff() {
        try {
            await ipcRenderer.invoke('control-command', {
                command: 'turnOff',
                data: {}
            });
            this.updateModeDisplay('none');
            this.showToast('Player apagado', 'info');
        } catch (error) {
            console.error('Error apagando player:', error);
        }
    }

    updateModeDisplay(mode) {
        const modeNames = {
            'project': 'Reproduciendo: Programación',
            'security': 'Reproduciendo: Video de Seguridad',
            'loop': 'Reproduciendo: Loop',
            'loopEmbarque': 'Reproduciendo: Loop Embarque',
            'none': '' // No mostrar texto cuando no hay contenido
        };
        const label = modeNames[mode] || (mode ? `Modo: ${mode}` : '');
        const el = document.getElementById('current-mode');
        if (el) {
            el.textContent = label;
        }
    }

    async clearVideos() {
        try {
            // Pedir al reproductor principal que limpie los videos guardados
            const result = await ipcRenderer.invoke('control-command', {
                command: 'clearVideos'
            });

            // Actualizar inmediatamente la UI del panel de control,
            // SIN depender de mensajes extra entre ventanas.

            // 1) Forzar que los botones de configuración vuelvan a "Cargar ..."
            const securityBtn = document.getElementById('load-security-video-btn');
            const loopBtn = document.getElementById('load-loop-video-btn');
            const loopEmbarqueBtn = document.getElementById('load-loop-embarque-video-btn');
            const audioVideoBtn = document.getElementById('load-audio-video-btn');

            if (securityBtn) {
                securityBtn.innerHTML = 'Cargar Video Seguridad';
            }
            if (loopBtn) {
                loopBtn.innerHTML = 'Cargar Video Loop';
            }
            if (loopEmbarqueBtn) {
                loopEmbarqueBtn.innerHTML = 'Cargar Video Loop Embarque';
            }
            if (audioVideoBtn) {
                audioVideoBtn.innerHTML = 'Cargar Placa Audio';
            }

            // 1.b) Ocultar directamente los botones de modo Seguridad/Loop/Loop Embarque,
            //      sin esperar al estado del player.
            const modeSecurityBtn = document.getElementById('mode-security-btn');
            const modeLoopBtn = document.getElementById('mode-loop-btn');
            const loopEmbarqueContainer = document.getElementById('loop-embarque-container');

            if (modeSecurityBtn) {
                modeSecurityBtn.style.display = 'none';
            }
            if (modeLoopBtn) {
                modeLoopBtn.style.display = 'none';
            }
            if (loopEmbarqueContainer) {
                loopEmbarqueContainer.style.display = 'none';
            }

            // 2) Limpiar el texto central (no mostrar nada)
            this.updateModeDisplay('none');

            // 3) Toast de confirmación (rojo)
            this.showToast('Se eliminaron todos los videos de seguridad / loop / placa.', 'error');
        } catch (error) {
            console.error('Error limpiando videos:', error);
            this.showToast('Error al borrar los videos (ver consola).', 'error');
        }
    }

    // Toast simple reutilizable
    // type: 'success' | 'error' | undefined
    showToast(message, type) {
        try {
            const toast = document.getElementById('toast');
            if (!toast) return;

            toast.textContent = message || '';

            // Limpiar clases de tipo
            toast.classList.remove('toast-success', 'toast-error');
            if (type === 'success') {
                toast.classList.add('toast-success');
            } else if (type === 'error') {
                toast.classList.add('toast-error');
            }

            toast.classList.add('show');

            if (this._toastTimeout) {
                clearTimeout(this._toastTimeout);
            }

            this._toastTimeout = setTimeout(() => {
                toast.classList.remove('show');
            }, 2500);
        } catch (error) {
            // Silencioso: el toast no es crítico
        }
    }

    showAudioNameModal() {
        const modal = document.getElementById('audio-name-modal');
        const input = document.getElementById('audio-name-input');
        
        if (!modal || !input) {
            console.error('❌ [AUDIO-NAME] No se encontró el modal o el input de nombre de audio');
            return;
        }

        // Asegurar que los listeners del popup estén siempre registrados,
        // aunque algún error en setupEventListeners haya cortado la ejecución.
        if (!this._audioNameListenersBound) {
            const cancelBtn = document.getElementById('cancel-audio-name');
            const confirmBtn = document.getElementById('confirm-audio-name');

            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    this.hideAudioNameModal();
                });
            }

            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    this.confirmAudioName();
                });
            }

            // Enter en el input para confirmar
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.confirmAudioName();
                }
            });

            this._audioNameListenersBound = true;
        }
        
        modal.style.display = 'flex';
        input.value = '';
        input.focus();
    }

    hideAudioNameModal() {
        const modal = document.getElementById('audio-name-modal');
        modal.style.display = 'none';
    }

    async confirmAudioName() {
        const input = document.getElementById('audio-name-input');
        const customName = input.value.trim();
        
        if (!customName) {
            alert('Por favor ingresa un nombre para el audio');
            return;
        }
        
        this.hideAudioNameModal();
        await this.loadAudio(customName);
    }

    async loadAudio(customName) {
        try {
            // // console.log('Cargando audio desde panel de control con nombre:', customName);
            
            // // console.log('Llamando a select-audio-file...');
            const result = await ipcRenderer.invoke('select-audio-file');
            // // console.log('Resultado de select-audio-file:', result);
            
            if (result.success) {
                // // console.log('Audio cargado:', result.filePath);
                
                await ipcRenderer.invoke('control-command', {
                    command: 'loadAudio',
                    data: { 
                        filePath: result.filePath,
                        customName: customName
                    }
                });
                // // console.log('Audio cargado con nombre:', customName);
                
                // Actualizar lista inmediatamente
                setTimeout(() => {
                    this.updateAudioList();
                }, 500);

                // Toast (verde)
                this.showToast('Audio agregado correctamente', 'success');
            } else {
                // console.error('Error cargando audio:', result.error);
            }
        } catch (error) {
            // console.error('Error cargando audio:', error);
        }
    }

    async loadAudioVideo() {
        try {
            // // console.log('Cargando video placa para audios');
            const result = await ipcRenderer.invoke('select-video-file');
            if (result.success) {
                // // console.log('Video placa cargado:', result.filePath);
                await ipcRenderer.invoke('control-command', {
                    command: 'loadAudioVideo',
                    data: { filePath: result.filePath }
                });
                // Actualizar texto del botón
                document.getElementById('load-audio-video-btn').innerHTML = 'Cambiar Placa Audio';
                // // console.log('Video placa cargado exitosamente');
                // Toast (verde)
                this.showToast('Video de placa de audio cargado correctamente', 'success');
            } else {
                // console.error('Error cargando video placa:', result.error);
            }
        } catch (error) {
            // console.error('Error cargando video placa:', error);
        }
    }

    async checkLoadedVideos() {
        try {
            // Verificar si hay videos cargados consultando al reproductor principal
            const status = await ipcRenderer.invoke('get-player-status');
            if (status && status.videos) {
                if (status.videos.securityVideoPath) {
                    document.getElementById('load-security-video-btn').innerHTML = 'Cambiar Video Seguridad';
                }
                if (status.videos.loopVideoPath) {
                    document.getElementById('load-loop-video-btn').innerHTML = 'Cambiar Video Loop';
                }
                if (status.videos.loopEmbarqueVideoPath) {
                    document.getElementById('load-loop-embarque-video-btn').innerHTML = 'Cambiar Video Loop Embarque';
                }
                if (status.videos.audioVideoPath) {
                    document.getElementById('load-audio-video-btn').innerHTML = 'Cambiar Placa Audio';
                }
            }
            
            // Actualizar botones de modo de reproducción según contenido cargado
            this.updatePlaybackModeButtons();
        } catch (error) {
            // console.error('Error verificando videos cargados:', error);
        }
    }

    async updatePlaybackModeButtons() {
        try {
            // // console.log('Actualizando botones de modo de reproducción...');
            const status = await ipcRenderer.invoke('get-player-status');
            // // console.log('Estado del reproductor:', status);
            
            const projectBtn = document.getElementById('mode-project-btn');
            const securityBtn = document.getElementById('mode-security-btn');
            const loopBtn = document.getElementById('mode-loop-btn');
            const loopEmbarqueContainer = document.getElementById('loop-embarque-container');
            
            // Ocultar todos los botones por defecto
            projectBtn.style.display = 'none';
            securityBtn.style.display = 'none';
            loopBtn.style.display = 'none';
            if (loopEmbarqueContainer) {
                loopEmbarqueContainer.style.display = 'none';
            }
            
            // Mostrar botón de proyecto si hay proyecto cargado
            if (status && status.project && status.project.name) {
                // // console.log('Proyecto encontrado:', status.project.name);
                projectBtn.style.display = 'block';
            }
            
            // Mostrar botón de seguridad si hay video de seguridad cargado
            if (status && status.videos && status.videos.securityVideoPath) {
                // // console.log('Video de seguridad encontrado:', status.videos.securityVideoPath);
                securityBtn.style.display = 'block';
            }
            
            // Mostrar botón de loop si hay video de loop cargado
            if (status && status.videos && status.videos.loopVideoPath) {
                // // console.log('Video de loop encontrado:', status.videos.loopVideoPath);
                loopBtn.style.display = 'block';
            }
            
            // Mostrar botón de loop embarque si hay video de loop embarque cargado
            if (loopEmbarqueContainer) {
                if (status && status.videos && status.videos.loopEmbarqueVideoPath) {
                    loopEmbarqueContainer.style.display = 'block';
                    const musicToggle = document.getElementById('enable-music-toggle');
                    // Mostrar/ocultar toggle según si hay música cargada
                    if (musicToggle) {
                        const toggleLabel = musicToggle.closest('label');
                        if (toggleLabel) {
                            if (this.musicList && this.musicList.length > 0) {
                                toggleLabel.style.display = 'flex';
                            } else {
                                toggleLabel.style.display = 'none';
                            }
                        }
                    }
                } else {
                    loopEmbarqueContainer.style.display = 'none';
                }
            }
            
            // Si no hay status del reproductor, verificar localStorage directamente
            if (!status || !status.project) {
                // // console.log('No hay estado del reproductor, verificando localStorage...');
                try {
                    const savedProject = localStorage.getItem('savedProject');
                    if (savedProject) {
                        const projectData = JSON.parse(savedProject);
                        // // console.log('Proyecto guardado en localStorage:', projectData);
                        if (projectData && projectData.name) {
                            projectBtn.style.display = 'block';
                        }
                    }
                } catch (error) {
                    // // console.log('No hay proyecto guardado en localStorage');
                }
            }
            
            // Verificar videos guardados en localStorage si no hay status
            if (!status || !status.videos) {
                try {
                    const savedSecurityVideo = localStorage.getItem('securityVideoPath');
                    if (savedSecurityVideo) {
                        // // console.log('Video de seguridad guardado:', savedSecurityVideo);
                        securityBtn.style.display = 'block';
                    }
                    
                    const savedLoopVideo = localStorage.getItem('loopVideoPath');
                    if (savedLoopVideo) {
                        // // console.log('Video de loop guardado:', savedLoopVideo);
                        loopBtn.style.display = 'block';
                    }
                } catch (error) {
                    // // console.log('No hay videos guardados en localStorage');
                }
            }
            
            // // console.log('Botones actualizados - Proyecto:', projectBtn.style.display, 'Seguridad:', securityBtn.style.display, 'Loop:', loopBtn.style.display);
            
        } catch (error) {
            // console.error('Error actualizando botones de modo:', error);
        }
    }

    async clearAudios() {
        try {
            // // console.log('Limpiando audios guardados');
            await ipcRenderer.invoke('control-command', {
                command: 'clearAudios'
            });
            // // console.log('Audios limpiados exitosamente');
            this.updateAudioList();
            // Toast (rojo)
            this.showToast('Se eliminaron todos los audios.', 'error');
        } catch (error) {
            // console.error('Error limpiando audios:', error);
            this.showToast('Error al borrar los audios (ver consola).', 'error');
        }
    }

    async loadMusic() {
        try {
            const result = await ipcRenderer.invoke('select-music-file');
            
            if (result.success) {
                await ipcRenderer.invoke('control-command', {
                    command: 'loadMusic',
                    data: { 
                        filePath: result.filePath,
                        fileName: result.fileName
                    }
                });
                this.updateMusicList();
                this.showToast('Música cargada correctamente', 'success');
            } else {
                this.showToast('Error al cargar música', 'error');
            }
        } catch (error) {
            console.error('Error cargando música:', error);
            this.showToast('Error al cargar música', 'error');
        }
    }

    async clearMusic() {
        try {
            await ipcRenderer.invoke('control-command', {
                command: 'clearMusic'
            });
            this.updateMusicList();
            this.showToast('Se eliminó toda la música.', 'error');
        } catch (error) {
            console.error('Error limpiando música:', error);
            this.showToast('Error al borrar la música (ver consola).', 'error');
        }
    }

    updateAudioList() {
        try {
            // Solicitar lista de audios directamente
            ipcRenderer.invoke('get-audio-list').then(result => {
                // // console.log('Lista de audios recibida:', result);
                this.displayAudioList(result);
            }).catch(error => {
                // console.error('Error obteniendo lista de audios:', error);
                this.displayAudioList([]);
            });
        } catch (error) {
            // console.error('Error actualizando lista de audios:', error);
        }
    }

    displayAudioList(audios) {
        const audioListDiv = document.getElementById('audio-list');
        const configAudioListDiv = document.getElementById('config-audio-list');
        
        // Guardar la lista de audios localmente
        this.audiosList = audios || [];
        // // console.log('Lista de audios guardada en panel:', this.audiosList);
        
        if (audios && audios.length > 0) {
            // Lista principal con botones de reproducir
            audioListDiv.innerHTML = '';
            audios.forEach(audio => {
                const div = document.createElement('div');
                div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 5px;';
                
                const span = document.createElement('span');
                span.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;';
                span.innerHTML = `<i class="las la-bullhorn"></i> ${audio.customName}`;
                
                const button = document.createElement('button');
                button.className = 'btn';
                button.style.cssText = 'padding: 5px 10px; font-size: 12px; flex-shrink: 0;';
                button.innerHTML = '<i class="las la-play"></i> Reproducir';
                button.addEventListener('click', () => {
                    this.playAudio(audio.id);
                });
                
                div.appendChild(span);
                div.appendChild(button);
                audioListDiv.appendChild(div);
            });
            
            // Lista en configuración con botones de eliminar
            configAudioListDiv.innerHTML = '<h5 style="margin-bottom: 10px; color: #b7b7b7;">Audios Cargados:</h5>';
            audios.forEach(audio => {
                const div = document.createElement('div');
                div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 5px;';
                
                const span = document.createElement('span');
                span.style.cssText = 'color: #b7b7b7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0;';
                span.innerHTML = `<i class="las la-bullhorn"></i> ${audio.customName}`;
                
                const button = document.createElement('button');
                button.className = 'btn btn-danger';
                button.style.cssText = 'padding: 3px 8px; font-size: 10px; flex-shrink: 0;';
                button.innerHTML = '<i class="las la-trash"></i> Eliminar';
                button.addEventListener('click', () => {
                    this.deleteAudio(audio.id);
                });
                
                div.appendChild(span);
                div.appendChild(button);
                configAudioListDiv.appendChild(div);
            });
        } else {
            audioListDiv.innerHTML = '<p style="opacity: 0.7; font-size: 12px;">No hay audios cargados</p>';
            configAudioListDiv.innerHTML = '<p style="opacity: 0.7; font-size: 12px; color: #fff;">No hay audios cargados</p>';
        }
    }

    async playAudio(audioId) {
        try {
            // // console.log('Reproduciendo audio desde panel, ID:', audioId);
            
            // Obtener la información completa del audio desde la lista local
            const audio = this.audiosList.find(a => a.id === audioId);
            if (!audio) {
                // console.error('Audio no encontrado en el panel con ID:', audioId);
                // // console.log('Audios disponibles en panel:', this.audiosList);
                return;
            }
            
            // // console.log('Audio encontrado en panel:', audio);
            
            // Enviar TODA la información del audio al player
            await ipcRenderer.invoke('control-command', {
                command: 'playAudio',
                data: {
                    audioId: audio.id,
                    filePath: audio.filePath,
                    customName: audio.customName,
                    loadedAt: audio.loadedAt
                }
            });
        } catch (error) {
            // console.error('Error reproduciendo audio:', error);
        }
    }

    async deleteAudio(audioId) {
        try {
            // // console.log('Eliminando audio:', audioId);
            
            // Enviar comando al reproductor para eliminar el audio
            await ipcRenderer.invoke('control-command', {
                command: 'deleteAudio',
                data: { audioId: audioId }
            });
            
            // Actualizar la lista de audios
            this.updateAudioList();

            // Toast (rojo) para audio individual eliminado
            this.showToast('Audio eliminado.', 'error');
        } catch (error) {
            // console.error('Error eliminando audio:', error);
            this.showToast('Error al eliminar el audio (ver consola).', 'error');
        }
    }

    updateMusicList() {
        try {
            ipcRenderer.invoke('get-music-list').then(result => {
                this.displayMusicList(result);
            }).catch(error => {
                console.error('Error obteniendo lista de música:', error);
                this.displayMusicList([]);
            });
        } catch (error) {
            console.error('Error actualizando lista de música:', error);
        }
    }

    displayMusicList(musicList) {
        const configMusicListDiv = document.getElementById('config-music-list');
        
        // Guardar la lista de música localmente
        this.musicList = musicList || [];
        
        // Ordenar alfabéticamente por nombre
        const sortedMusic = [...musicList].sort((a, b) => a.name.localeCompare(b.name));
        
        if (sortedMusic && sortedMusic.length > 0) {
            configMusicListDiv.innerHTML = '<h5 style="margin-bottom: 10px; color: #b7b7b7;">Música Cargada:</h5>';
            sortedMusic.forEach(music => {
                const div = document.createElement('div');
                div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin: 5px 0; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 5px; width: 100%; max-width: 100%;';
                
                const span = document.createElement('span');
                span.style.cssText = 'color: #b7b7b7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; margin-right: 10px;';
                span.innerHTML = `<i class="las la-music"></i> ${music.name}`;
                
                const button = document.createElement('button');
                button.className = 'btn btn-danger';
                button.style.cssText = 'padding: 3px 8px; font-size: 10px;';
                button.innerHTML = '<i class="las la-trash"></i> Eliminar';
                button.addEventListener('click', () => {
                    this.deleteMusic(music.id);
                });
                
                div.appendChild(span);
                div.appendChild(button);
                configMusicListDiv.appendChild(div);
            });
        } else {
            configMusicListDiv.innerHTML = '<p style="opacity: 0.7; font-size: 12px; color: #fff;">No hay música cargada</p>';
        }
        
        // Actualizar estado del toggle y visibilidad
        this.updateMusicToggle();
    }

    async updateMusicToggle() {
        try {
            // Obtener estado actual de música desde el player
            const status = await ipcRenderer.invoke('get-player-status');
            const musicEnabled = status && status.musicEnabled !== undefined ? status.musicEnabled : false;
            const hasMusic = this.musicList && this.musicList.length > 0;
            const hasLoopEmbarque = status && status.videos && status.videos.loopEmbarqueVideoPath;
            
            const toggle = document.getElementById('enable-music-toggle');
            const toggleLabel = toggle ? toggle.closest('label') : null;
            
            if (toggle) {
                toggle.checked = musicEnabled && hasMusic;
                toggle.disabled = !hasMusic; // Deshabilitar si no hay música
            }
            
            // Mostrar/ocultar toggle solo si hay loop embarque y música
            if (toggleLabel) {
                if (hasLoopEmbarque && hasMusic) {
                    toggleLabel.style.display = 'flex';
                } else {
                    toggleLabel.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error actualizando toggle de música:', error);
        }
    }

    async deleteMusic(musicId) {
        try {
            await ipcRenderer.invoke('control-command', {
                command: 'deleteMusic',
                data: { musicId: musicId }
            });
            
            this.updateMusicList();
            this.showToast('Música eliminada.', 'error');
        } catch (error) {
            console.error('Error eliminando música:', error);
            this.showToast('Error al eliminar la música (ver consola).', 'error');
        }
    }

    async toggleMusicEnabled(enabled) {
        try {
            await ipcRenderer.invoke('control-command', {
                command: 'setMusicEnabled',
                data: { enabled: enabled }
            });
            if (enabled) {
                this.showToast('Música activada', 'success');
            } else {
                this.showToast('Música desactivada', 'info');
            }
        } catch (error) {
            console.error('Error cambiando estado de música:', error);
            this.showToast('Error al cambiar estado de música', 'error');
        }
    }

    // Funciones para cámara IP
    async testCamera() {
        try {
            const url = document.getElementById('ip-camera-url').value.trim();
            if (!url) {
                alert('Por favor ingresa una URL de cámara');
                return;
            }

            // Validar formato de URL
            try {
                new URL(url);
            } catch (e) {
                alert('URL inválida. Por favor ingresa una URL válida (ej: http://192.168.1.100:8080/video)');
                return;
            }

            // Mostrar modal de prueba
            this.showCameraTest(url);
        } catch (error) {
            // console.error('Error probando cámara:', error);
            alert('Error probando la cámara');
        }
    }

    testSpecificUrl(endpoint) {
        const baseUrl = document.getElementById('ip-camera-url').value.trim();
        if (!baseUrl) {
            alert('Por favor ingresa la URL base de la cámara (ej: http://192.168.0.4:8080)');
            return;
        }

        // Construir URL completa
        const fullUrl = baseUrl + endpoint;
        
        // Actualizar el campo de entrada
        document.getElementById('ip-camera-url').value = fullUrl;
        
        // Probar la URL
        this.showCameraTest(fullUrl);
    }

    showCameraTest(url) {
        // Mostrar modal
        const modal = document.getElementById('camera-test-modal');
        const video = document.getElementById('camera-test-video');
        const image = document.getElementById('camera-test-image');
        const status = document.getElementById('camera-status');
        const urlDisplay = document.getElementById('camera-url-display');
        
        modal.style.display = 'flex';
        urlDisplay.textContent = url;
        status.textContent = 'Conectando...';
        status.style.color = '#888';
        
        // Ocultar ambos elementos inicialmente
        video.style.display = 'none';
        image.style.display = 'none';
        
        // Detectar tipo de contenido y usar el elemento apropiado
        if (url.includes('/video') || url.includes('mjpeg') || url.includes('stream')) {
            this.testMjpegStream(url, image, status);
        } else if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('shot')) {
            this.testImageCapture(url, image, status);
        } else if (url.includes('.wav') || url.includes('.aac') || url.includes('audio')) {
            this.testAudioStream(url, status);
        } else {
            this.tryCameraUrls(url, video, status);
        }
    }

    // Función para verificar el estado de la cámara IP
    async checkCameraStatus() {
        try {
            const result = await ipcRenderer.invoke('control-command', {
                command: 'getCameraStatus',
                data: {}
            });
            
            if (result.success) {
                return result.status;
            } else {
                return 'disconnected';
            }
        } catch (error) {
            return 'error';
        }
    }

    // Actualizar indicador de estado de la cámara
    updateCameraStatusIndicator(status) {
        const indicator = document.getElementById('camera-status-indicator');
        if (!indicator) return;
        
        switch (status) {
            case 'connected':
                indicator.textContent = '🟢';
                indicator.title = 'Cámara conectada';
                break;
            case 'disconnected':
                indicator.textContent = '🔴';
                indicator.title = 'Cámara desconectada';
                break;
            case 'connecting':
                indicator.textContent = '🟡';
                indicator.title = 'Conectando a cámara...';
                break;
            case 'error':
                indicator.textContent = '⚠️';
                indicator.title = 'Error de conexión';
                break;
            default:
                indicator.textContent = '●';
                indicator.title = 'Estado desconocido';
        }
    }

    async tryCameraUrls(baseUrl, video, status) {
        // Lista de URLs comunes para probar
        const possibleUrls = [
            baseUrl,
            baseUrl + '/video',
            baseUrl + '/stream',
            baseUrl + '/mjpeg',
            baseUrl + '/cam/realmonitor',
            baseUrl + '/live',
            baseUrl + '/h264',
            baseUrl + '/video.mjpg',
            baseUrl + '/stream.mjpg'
        ];

        // Remover duplicados
        const uniqueUrls = [...new Set(possibleUrls)];

        for (let i = 0; i < uniqueUrls.length; i++) {
            const testUrl = uniqueUrls[i];
            status.textContent = `Probando: ${testUrl}`;
            status.style.color = '#ffa500';
            
            try {
                const success = await this.testVideoUrl(testUrl, video);
                if (success) {
                    status.textContent = `Cámara funcionando correctamente ✓ (${testUrl})`;
                    status.style.color = '#28a745';
                    return;
                }
            } catch (error) {
                // Continuar con la siguiente URL
            }
        }
        
        // Si ninguna URL funcionó
        status.textContent = 'Error: No se pudo conectar con ninguna URL de stream';
        status.style.color = '#dc3545';
    }

    testVideoUrl(url, video) {
        return new Promise((resolve) => {
            let resolved = false;
            
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(false);
                }
            }, 3000); // 3 segundos por URL
            
            video.onloadstart = () => {
                // Video empezó a cargar
            };
            
            video.oncanplay = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve(true);
                }
            };
            
            video.onerror = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve(false);
                }
            };
            
            video.onstalled = () => {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeout);
                    resolve(false);
                }
            };
            
            // Intentar cargar el video
            video.src = url;
            video.load();
        });
    }

    testMjpegStream(url, image, status) {
        status.textContent = 'Cargando stream MJPEG...';
        status.style.color = '#ffa500';
        
        // Mostrar controles de calidad
        document.getElementById('quality-controls').style.display = 'block';
        
        // Mostrar el elemento img
        image.style.display = 'block';
        
        // Aplicar parámetros de calidad por defecto
        this.applyQualityToUrl(url, image, status);
    }

    applyQualityToUrl(baseUrl, image, status) {
        const quality = document.getElementById('quality-select').value;
        const resolution = document.getElementById('resolution-select').value;
        
        // Construir URL con parámetros de calidad
        let enhancedUrl = baseUrl;
        
        // Agregar parámetros de calidad según el tipo de cámara
        if (baseUrl.includes('192.168.0.4:8080')) {
            // Para IP Webcam
            const qualityMap = {
                'low': '25',
                'medium': '50', 
                'high': '75',
                'max': '100'
            };
            
            const [width, height] = resolution.split('x');
            enhancedUrl = `${baseUrl}?quality=${qualityMap[quality]}&width=${width}&height=${height}`;
        } else {
            // Para otras cámaras, usar parámetros estándar
            const qualityMap = {
                'low': '25',
                'medium': '50',
                'high': '75', 
                'max': '100'
            };
            
            const [width, height] = resolution.split('x');
            enhancedUrl = `${baseUrl}?quality=${qualityMap[quality]}&width=${width}&height=${height}`;
        }
        
        // Configurar el stream MJPEG con parámetros de calidad
        image.src = enhancedUrl;
        
        // Eventos de la imagen
        image.onload = () => {
            status.textContent = `Stream MJPEG funcionando correctamente ✓ (${resolution}, ${quality})`;
            status.style.color = '#28a745';
        };
        
        image.onerror = () => {
            status.textContent = 'Error: No se pudo cargar el stream MJPEG';
            status.style.color = '#dc3545';
        };
        
        // Timeout después de 10 segundos
        setTimeout(() => {
            if (status.textContent === 'Cargando stream MJPEG...') {
                status.textContent = 'Timeout: No se pudo conectar al stream MJPEG';
                status.style.color = '#dc3545';
            }
        }, 10000);
    }

    applyQualitySettings() {
        const image = document.getElementById('camera-test-image');
        const status = document.getElementById('camera-status');
        const urlDisplay = document.getElementById('camera-url-display');
        
        if (image.style.display === 'block') {
            // Re-aplicar configuración de calidad
            const baseUrl = urlDisplay.textContent.split('?')[0]; // Remover parámetros existentes
            this.applyQualityToUrl(baseUrl, image, status);
            
            // Guardar configuración de calidad
            this.saveCameraQualitySettings();
        }
    }

    saveCameraQualitySettings() {
        const quality = document.getElementById('quality-select').value;
        const resolution = document.getElementById('resolution-select').value;
        const baseUrl = document.getElementById('ip-camera-url').value.trim();
        
        // Guardar configuración en localStorage
        const cameraConfig = {
            url: baseUrl,
            quality: quality,
            resolution: resolution,
            timestamp: Date.now()
        };
        
        localStorage.setItem('cameraQualityConfig', JSON.stringify(cameraConfig));
        
        // Enviar configuración al reproductor principal
        ipcRenderer.invoke('control-command', {
            command: 'saveCameraConfig',
            data: cameraConfig
        });
    }

    testImageCapture(url, image, status) {
        status.textContent = 'Cargando captura de imagen...';
        status.style.color = '#ffa500';
        
        // Mostrar el elemento img
        image.style.display = 'block';
        
        // Configurar la imagen
        image.src = url;
        
        // Eventos de la imagen
        image.onload = () => {
            status.textContent = 'Captura de imagen funcionando correctamente ✓';
            status.style.color = '#28a745';
        };
        
        image.onerror = () => {
            status.textContent = 'Error: No se pudo cargar la captura de imagen';
            status.style.color = '#dc3545';
        };
        
        // Timeout después de 5 segundos
        setTimeout(() => {
            if (status.textContent === 'Cargando captura de imagen...') {
                status.textContent = 'Timeout: No se pudo cargar la captura';
                status.style.color = '#dc3545';
            }
        }, 5000);
    }

    testAudioStream(url, status) {
        status.textContent = 'Probando stream de audio...';
        status.style.color = '#ffa500';
        
        // Crear elemento de audio temporal
        const audio = new Audio();
        
        audio.oncanplay = () => {
            status.textContent = 'Stream de audio funcionando correctamente ✓';
            status.style.color = '#28a745';
        };
        
        audio.onerror = () => {
            status.textContent = 'Error: No se pudo cargar el stream de audio';
            status.style.color = '#dc3545';
        };
        
        // Intentar cargar el audio
        audio.src = url;
        audio.load();
        
        // Timeout después de 5 segundos
        setTimeout(() => {
            if (status.textContent === 'Probando stream de audio...') {
                status.textContent = 'Timeout: No se pudo cargar el audio';
                status.style.color = '#dc3545';
            }
        }, 5000);
    }

    closeCameraTest() {
        const modal = document.getElementById('camera-test-modal');
        const video = document.getElementById('camera-test-video');
        const image = document.getElementById('camera-test-image');
        const qualityControls = document.getElementById('quality-controls');
        
        // Detener video
        video.pause();
        video.src = '';
        
        // Detener imagen
        image.src = '';
        
        // Ocultar controles de calidad
        qualityControls.style.display = 'none';
        
        // Ocultar modal
        modal.style.display = 'none';
    }

    async saveCameraUrl() {
        try {
            const url = document.getElementById('ip-camera-url').value.trim();
            if (!url) {
                alert('Por favor ingresa una URL de cámara');
                return;
            }

            // Validar formato de URL
            try {
                new URL(url);
            } catch (e) {
                alert('URL inválida. Por favor ingresa una URL válida (ej: http://192.168.1.100:8080/video)');
                return;
            }

            // Enviar comando al reproductor para guardar la URL
            const result = await ipcRenderer.invoke('control-command', {
                command: 'saveCameraUrl',
                data: { url: url }
            });

            if (result.success) {
                alert('URL de cámara guardada exitosamente');
            } else {
                alert('Error guardando URL: ' + (result.error || 'Error desconocido'));
            }
        } catch (error) {
            // console.error('Error guardando URL de cámara:', error);
            alert('Error guardando la URL de cámara');
        }
    }

    // Cargar URL guardada al inicializar
    async loadSavedCameraUrl() {
        try {
            const result = await ipcRenderer.invoke('control-command', {
                command: 'getCameraUrl',
                data: {}
            });

            if (result.success && result.url) {
                document.getElementById('ip-camera-url').value = result.url;
            }
            
            // Iniciar monitoreo del estado de la cámara
            this.startCameraMonitoring();
        } catch (error) {
            // console.error('Error cargando URL guardada:', error);
        }
    }

    // Iniciar monitoreo periódico del estado de la cámara
    startCameraMonitoring() {
        // Verificar estado cada 30 segundos
        setInterval(async () => {
            try {
                const status = await this.checkCameraStatus();
                this.updateCameraStatusIndicator(status);
            } catch (error) {
                this.updateCameraStatusIndicator('error');
            }
        }, 30000);
        
        // Verificación inicial
        this.updateCameraStatusIndicator('disconnected');
    }

    // ===== MÉTODOS DEL SERVIDOR HTTP =====
    // Eliminados: Ya no se usa servidor HTTP en el Player

    // ===== MÉTODOS DEL MANAGER =====

    // Guardar configuración del Manager (simplificada)
    async saveManagerConfig() {
        try {
            const hostname = document.getElementById('manager-hostname').value.trim();
            const terminalId = document.getElementById('manager-terminal-id').value.trim();

            if (!hostname || !terminalId) {
                alert('Por favor completa todos los campos');
                return;
            }

            const config = {
                hostname: hostname,
                terminalId: terminalId
            };

            const result = await ipcRenderer.invoke('save-manager-config', config);
            if (result.success) {
                alert('Configuración del Manager guardada correctamente');
                this.loadManagerConfig();
            } else {
                alert('Error guardando configuración: ' + result.error);
            }
        } catch (error) {
            alert('Error guardando configuración: ' + error.message);
        }
    }

    // Probar conexión al Manager
    async testManagerConnection() {
        try {
            const hostname = document.getElementById('manager-hostname').value.trim();

            if (!hostname) {
                alert('Por favor configura el hostname/IP primero');
                return;
            }

            const result = await ipcRenderer.invoke('test-manager-connection', { hostname });
            if (result.success) {
                alert(`Conexión al Manager exitosa\nHostname: ${hostname}\nPuerto: 9001\nTiempo: ${result.responseTime}ms`);
                this.updateManagerStatus('connected');
            } else {
                alert('Error conectando al Manager: ' + result.error);
                this.updateManagerStatus('error');
            }
        } catch (error) {
            alert('Error probando conexión: ' + error.message);
            this.updateManagerStatus('error');
        }
    }

    // Cargar configuración del Manager (simplificada)
    async loadManagerConfig() {
        try {
            const result = await ipcRenderer.invoke('get-manager-config');
            if (result.success) {
                const config = result.config;
                document.getElementById('manager-hostname').value = config.hostname || '';
                document.getElementById('manager-terminal-id').value = config.terminalId || '';
                
                // Actualizar información del Manager
                document.getElementById('manager-status').textContent = config.isConfigured ? 'Configurado' : 'Sin configurar';
                document.getElementById('manager-url').textContent = config.isConfigured ? `http://${config.hostname}:9001` : 'No configurado';
                document.getElementById('manager-terminal-id-display').textContent = config.terminalId || 'No configurado';
                
                // Actualizar indicador visual
                this.updateManagerStatusIndicator(config.isConfigured ? 'configured' : 'not-configured');
            }
        } catch (error) {
            // console.error('Error cargando configuración del Manager:', error);
        }
    }

    // Actualizar estado del Manager
    updateManagerStatus(status) {
        const statusElement = document.getElementById('manager-status');
        const indicator = document.getElementById('manager-status-indicator');
        
        switch (status) {
            case 'connected':
                statusElement.textContent = 'Conectado';
                indicator.style.color = '#28a745';
                indicator.textContent = '●';
                break;
            case 'error':
                statusElement.textContent = 'Error de conexión';
                indicator.style.color = '#dc3545';
                indicator.textContent = '●';
                break;
            case 'configured':
                statusElement.textContent = 'Configurado';
                indicator.style.color = '#17a2b8';
                indicator.textContent = '●';
                break;
            default:
                statusElement.textContent = 'Sin configurar';
                indicator.style.color = '#888';
                indicator.textContent = '●';
        }
    }

    // Actualizar indicador visual del Manager
    updateManagerStatusIndicator(status) {
        const indicator = document.getElementById('manager-status-indicator');
        
        switch (status) {
            case 'connected':
                indicator.style.color = '#28a745';
                indicator.textContent = '●';
                break;
            case 'error':
                indicator.style.color = '#dc3545';
                indicator.textContent = '●';
                break;
            case 'configured':
                indicator.style.color = '#17a2b8';
                indicator.textContent = '●';
                break;
            default:
                indicator.style.color = '#888';
                indicator.textContent = '●';
        }
    }

    // ===== CONTROL DE ESTADO DE DESCARGA =====

    // Mostrar estado de descarga
    showDownloadStatus() {
        // console.log('📥 showDownloadStatus() llamado');
        const downloadStatus = document.getElementById('download-status');
        const controlSection = document.querySelector('.control-section');
        
        if (!downloadStatus) {
            // console.error('❌ Elemento download-status no encontrado');
            return;
        }
        
        if (!controlSection) {
            // console.error('❌ Elemento .control-section no encontrado');
            return;
        }
        
        // Mostrar mensaje
        downloadStatus.style.display = 'block';
        // console.log('📥 Mensaje de descarga mostrado');
        
        // Deshabilitar botones
        controlSection.classList.add('download-in-progress');
        // console.log('📥 Clase download-in-progress agregada');
        
        // console.log('📥 Mostrando estado de descarga - botones deshabilitados');
    }

    // Ocultar estado de descarga
    hideDownloadStatus() {
        // console.log('✅ hideDownloadStatus() llamado');
        const downloadStatus = document.getElementById('download-status');
        const controlSection = document.querySelector('.control-section');
        
        if (!downloadStatus) {
            // console.error('❌ Elemento download-status no encontrado');
            return;
        }
        
        if (!controlSection) {
            // console.error('❌ Elemento .control-section no encontrado');
            return;
        }
        
        // Ocultar mensaje
        downloadStatus.style.display = 'none';
        // console.log('✅ Mensaje de descarga ocultado');
        
        // Habilitar botones
        // console.log('🔍 Clases antes de remover:', controlSection.className);
        controlSection.classList.remove('download-in-progress');
        // console.log('🔍 Clases después de remover:', controlSection.className);
        
        // Verificar que se removió la clase
        const hasClass = controlSection.classList.contains('download-in-progress');
        // console.log('🔍 ¿Tiene clase download-in-progress?', hasClass);
        
        // Forzar actualización de estilos
        controlSection.style.display = 'none';
        controlSection.offsetHeight; // Trigger reflow
        controlSection.style.display = '';
        
        // console.log('✅ Estado de descarga ocultado - botones habilitados');
        
        // Verificar botones específicos
        this.checkButtonStates();
    }

    // Verificar estado de botones
    checkButtonStates() {
        // console.log('🔍 Verificando estado de botones...');
        
        const buttons = document.querySelectorAll('.btn');
        // console.log(`🔍 Encontrados ${buttons.length} botones`);
        
        buttons.forEach((btn, index) => {
            const isDisabled = btn.style.opacity === '0.6' || 
                             btn.classList.contains('disabled') ||
                             btn.disabled;
            // console.log(`🔍 Botón ${index}: ${btn.textContent.trim()} - Deshabilitado: ${isDisabled}`);
        });
        
        // Forzar actualización de todos los botones
        buttons.forEach(btn => {
            btn.style.opacity = '';
            btn.style.background = '';
            btn.style.color = '';
            btn.style.cursor = '';
            btn.classList.remove('disabled');
            btn.disabled = false;
        });
        
        // console.log('🔍 Botones actualizados manualmente');
    }

    // Actualizar panel después de descarga
    updatePanelAfterDownload() {
        try {
            // console.log('🔄 Actualizando panel después de descarga...');
            
            // Esperar un momento para que el proyecto se cargue completamente
            setTimeout(() => {
                // Actualizar lista de audios
                this.updateAudioList();
                
                // Verificar videos cargados
                this.checkLoadedVideos();
                
                // Forzar actualización de botones
                this.checkButtonStates();
                
                // Establecer modo de proyecto cuando se carga automáticamente
                this.updateModeDisplay('project');
                
                // console.log('✅ Panel actualizado después de descarga');
            }, 2000); // 2 segundos de delay
            
        } catch (error) {
            // console.error('❌ Error actualizando panel después de descarga:', error);
        }
    }

    // Verificar estado inicial del panel
    checkInitialState() {
        try {
            // console.log('🔍 Verificando estado inicial del panel...');
            
            // Verificar si hay videos cargados
            const hasVideos = this.audiosList.length > 0;
            
            if (!hasVideos) {
                // Si no hay contenido, mostrar "Sin contenido"
                this.updateModeDisplay('none');
                // console.log('📭 No hay contenido - mostrando "Sin contenido"');
            } else {
                // Si hay contenido, verificar si está reproduciendo
                // console.log('📁 Hay contenido disponible');
            }
            
        } catch (error) {
            // console.error('❌ Error verificando estado inicial:', error);
        }
    }

    async openCertificacionModal() {
        console.log('📋 Abriendo modal de certificación...');
        const modal = document.getElementById('certificacion-modal');
        const videosList = document.getElementById('certificacion-videos-list');
        
        if (!modal) {
            console.error('❌ No se encontró el modal certificacion-modal');
            return;
        }
        
        if (!videosList) {
            console.error('❌ No se encontró el elemento certificacion-videos-list');
            return;
        }
        
        // Limpiar completamente el contenido anterior
        videosList.innerHTML = '';
        this.certificacionVideos = null; // Limpiar la lista anterior
        
        modal.style.display = 'flex';
        videosList.innerHTML = '<p style="text-align: center; color: #888; margin: 20px 0;">Cargando videos...</p>';
        
        try {
            // Obtener el proyecto ORIGINAL desde el archivo JSON, no el estado del player
            // (porque el player puede tener el proyecto temporal de certificación cargado)
            const result = await ipcRenderer.invoke('load-project-from-programacion');
            console.log('📊 Proyecto cargado desde archivo:', result);
            
            if (!result || !result.success || !result.data) {
                console.warn('⚠️ No se pudo cargar el proyecto:', result);
                videosList.innerHTML = '<p style="text-align: center; color: #dc3545; margin: 20px 0;">No hay proyecto cargado</p>';
                return;
            }
            
            const projectData = result.data;
            console.log('📁 Datos del proyecto:', projectData);
            const allVideos = [];
            
            // Recorrer todos los bloques y extraer todos los videos
            if (projectData.blocks && Array.isArray(projectData.blocks)) {
                projectData.blocks.forEach((block, blockIndex) => {
                    console.log(`📦 Bloque ${blockIndex}:`, block.name, 'Items:', block.items?.length || 0);
                    if (block.items && Array.isArray(block.items)) {
                        block.items.forEach((item, itemIndex) => {
                            if (item.type === 'video' && item.file) {
                                allVideos.push({
                                    name: item.name || item.file,
                                    file: item.file,
                                    hasAudio: item.hasAudio !== undefined ? item.hasAudio : true
                                });
                                console.log(`  ✅ Video agregado: ${item.name || item.file}`);
                            }
                        });
                    }
                });
            }
            
            console.log(`📋 Total de videos encontrados: ${allVideos.length}`);
            
            // Ordenar alfabéticamente por nombre
            allVideos.sort((a, b) => {
                const nameA = (a.name || a.file || '').toLowerCase();
                const nameB = (b.name || b.file || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
            
            // Mostrar la lista con checkboxes
            if (allVideos.length === 0) {
                videosList.innerHTML = '<p style="text-align: center; color: #888; margin: 20px 0;">No hay videos en el proyecto</p>';
                return;
            }
            
            // Siempre mostrar TODOS los videos con TODOS los checkboxes marcados
            let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
            allVideos.forEach((video, index) => {
                html += `
                    <label style="display: flex; align-items: center; gap: 10px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 5px; cursor: pointer; transition: background 0.2s;" 
                           onmouseover="this.style.background='rgba(255,255,255,0.08)'" 
                           onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                        <input type="checkbox" class="certificacion-video-checkbox" data-index="${index}" checked style="width: 18px; height: 18px; cursor: pointer; flex-shrink: 0;">
                        <span style="color: #b7b7b7; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHtml(video.name || video.file)}</span>
                    </label>
                `;
            });
            html += '</div>';
            
            videosList.innerHTML = html;
            console.log(`✅ Lista de videos renderizada: ${allVideos.length} videos`);
            
            // Guardar la lista de videos para usar después (solo para playCertificacion)
            this.certificacionVideos = allVideos;
            
        } catch (error) {
            console.error('❌ Error cargando videos para certificación:', error);
            videosList.innerHTML = '<p style="text-align: center; color: #dc3545; margin: 20px 0;">Error al cargar los videos</p>';
        }
    }

    closeCertificacionModal() {
        const modal = document.getElementById('certificacion-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    async playCertificacion() {
        try {
            if (!this.certificacionVideos || this.certificacionVideos.length === 0) {
                this.showToast('No hay videos disponibles', 'error');
                return;
            }
            
            // Obtener los checkboxes marcados
            const checkboxes = document.querySelectorAll('.certificacion-video-checkbox:checked');
            
            if (checkboxes.length === 0) {
                this.showToast('Selecciona al menos un video', 'error');
                return;
            }
            
            // Obtener el proyecto original para usar su folderPath
            const originalProject = await ipcRenderer.invoke('load-project-from-programacion');
            
            if (!originalProject || !originalProject.success) {
                this.showToast('Error al obtener el proyecto original', 'error');
                return;
            }
            
            // Crear array con los videos seleccionados
            const selectedVideos = [];
            checkboxes.forEach(checkbox => {
                const index = parseInt(checkbox.getAttribute('data-index'));
                if (this.certificacionVideos[index]) {
                    selectedVideos.push({
                        type: 'video',
                        file: this.certificacionVideos[index].file,
                        name: this.certificacionVideos[index].name || this.certificacionVideos[index].file,
                        hasAudio: this.certificacionVideos[index].hasAudio !== undefined ? this.certificacionVideos[index].hasAudio : true
                    });
                }
            });
            
            // Crear JSON temporal de certificación con el folderPath del proyecto original
            const certificacionData = {
                name: 'Certificación',
                folderPath: originalProject.data.folderPath || originalProject.projectPath || '',
                blocks: [{
                    name: 'Certificación',
                    items: selectedVideos,
                    daysOfWeek: [],
                    useTimeRange: false,
                    startTime: '',
                    endTime: ''
                }]
            };
            
            console.log('📋 Proyecto de certificación creado:', certificacionData);
            console.log('📁 folderPath:', certificacionData.folderPath);
            
            // Enviar al player para reproducir
            await ipcRenderer.invoke('control-command', {
                command: 'playCertificacion',
                data: { projectData: certificacionData }
            });
            
            // NO cerrar el modal, solo mostrar el toast
            this.showToast('Reproduciendo certificación...', 'success');
            
        } catch (error) {
            console.error('Error reproduciendo certificación:', error);
            this.showToast('Error al reproducir certificación', 'error');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async importProjectManually() {
        const importBtn = document.getElementById('import-project-btn');
        const originalContent = importBtn.innerHTML;
        const originalDisabled = importBtn.disabled;
        
        try {
            // Cambiar botón a estado de carga
            importBtn.disabled = true;
            importBtn.innerHTML = '<i class="las la-spinner la-spin"></i> Importando...';
            
            this.showToast('Seleccionando archivo ZIP...', 'info');
            
            const result = await ipcRenderer.invoke('select-zip-file');
            
            if (!result.success) {
                // Restaurar botón
                importBtn.disabled = originalDisabled;
                importBtn.innerHTML = originalContent;
                
                if (result.error && result.error !== 'No se seleccionó ningún archivo') {
                    this.showToast(`Error: ${result.error}`, 'error');
                } else {
                    this.showToast('Importación cancelada', 'info');
                }
                return;
            }

            // Mantener el estado de carga mientras se procesa
            importBtn.innerHTML = '<i class="las la-spinner la-spin"></i> Importando...';
            this.showToast('Descomprimiendo y verificando proyecto...', 'info');
            
            const importResult = await ipcRenderer.invoke('import-project-from-zip', {
                zipPath: result.filePath
            });

            // Restaurar botón
            importBtn.disabled = originalDisabled;
            importBtn.innerHTML = originalContent;

            if (importResult.success) {
                this.showToast('Proyecto importado exitosamente', 'success');
                
                // Actualizar el panel después de un momento para que el proyecto se cargue
                setTimeout(() => {
                    this.updatePlaybackModeButtons();
                    this.checkLoadedVideos();
                }, 1000);
            } else {
                this.showToast(`Error al importar: ${importResult.error}`, 'error');
            }
        } catch (error) {
            // Restaurar botón en caso de error
            importBtn.disabled = originalDisabled;
            importBtn.innerHTML = originalContent;
            
            console.error('Error importando proyecto:', error);
            this.showToast('Error al importar proyecto', 'error');
        }
    }

}

// Inicializar el panel de control cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM cargado, inicializando ControlPanel...');
    const certificacionBtnTest = document.getElementById('mode-certificacion-btn');
    console.log('🔍 Botón certificación en DOMContentLoaded:', certificacionBtnTest);
    window.controlPanel = new ControlPanel();
    console.log('✅ ControlPanel inicializado');
    
    // Verificar nuevamente después de la inicialización
    setTimeout(() => {
        const certificacionBtnAfter = document.getElementById('mode-certificacion-btn');
        console.log('🔍 Botón certificación después de init:', certificacionBtnAfter);
        if (certificacionBtnAfter) {
            console.log('✅ Botón existe, verificando listener...');
            // Intentar hacer clic programáticamente para test
            // certificacionBtnAfter.click();
        }
    }, 1000);
});

// Registrar todos los listeners de IPC en el scope global (después de DOMContentLoaded pero fuera del bloque)
// Listener para archivos .config detectados
ipcRenderer.on('config-file-detected', (event, data) => {
    // console.log('📁 Archivo .config detectado en Panel de Control:', data);
    // console.log('📂 Ruta:', data.filePath);
    // console.log('📄 Contenido:', data.content);
    // console.log('⏰ Timestamp:', data.timestamp);
    
    // Mostrar mensaje de descarga y deshabilitar botones
    if (window.controlPanel) {
        window.controlPanel.showDownloadStatus();
    }
});

// Listener para descarga completada
ipcRenderer.on('download-completed', (event, data) => {
    // console.log('✅ Descarga completada recibida en Panel de Control:', data);
    if (window.controlPanel) {
        // console.log('📥 Llamando hideDownloadStatus()...');
        window.controlPanel.hideDownloadStatus();
        
        // Actualizar estado del panel después de la descarga
        // console.log('🔄 Actualizando estado del panel...');
        window.controlPanel.updatePanelAfterDownload();
    } else {
        // console.error('❌ window.controlPanel no está disponible');
    }
});

// Listener para error en descarga
ipcRenderer.on('download-error', (event, data) => {
    // console.error('❌ Error en descarga recibido en Panel de Control:', data);
    if (window.controlPanel) {
        // console.log('📥 Llamando hideDownloadStatus() por error...');
        window.controlPanel.hideDownloadStatus();
    } else {
        // console.error('❌ window.controlPanel no está disponible');
    }
});

// Listener para actualizar UI después de eliminar videos
console.log('📝 [CONTROL-PANEL] Registrando listener videos-deleted...');
ipcRenderer.on('videos-deleted', () => {
    console.log('🔄 [CONTROL-PANEL] ════════════════════════════════════════');
    console.log('🔄 [CONTROL-PANEL] Videos eliminados, actualizando UI...');
    console.log('🔄 [CONTROL-PANEL] ════════════════════════════════════════');
    
    // Función para actualizar la UI
    const updateUI = () => {
        if (!window.controlPanel) {
            console.log('⏳ [CONTROL-PANEL] Esperando a que window.controlPanel esté disponible...');
            setTimeout(updateUI, 100);
            return;
        }
        
        console.log('✅ [CONTROL-PANEL] window.controlPanel disponible, actualizando UI...');
        
        // Forzar actualización de textos de los botones a "Cargar"
        const securityBtn = document.getElementById('load-security-video-btn');
        const loopBtn = document.getElementById('load-loop-video-btn');
        const audioVideoBtn = document.getElementById('load-audio-video-btn');
        
        console.log('🔍 [CONTROL-PANEL] Botones encontrados:', {
            security: !!securityBtn,
            loop: !!loopBtn,
            audioVideo: !!audioVideoBtn
        });
        
        if (securityBtn) {
            securityBtn.innerHTML = 'Cargar Video Seguridad';
            console.log('   ✅ [CONTROL-PANEL] Botón de seguridad actualizado');
        }
        if (loopBtn) {
            loopBtn.innerHTML = 'Cargar Video Loop';
            console.log('   ✅ [CONTROL-PANEL] Botón de loop actualizado');
        }
        if (audioVideoBtn) {
            audioVideoBtn.innerHTML = 'Cargar Placa Audio';
            console.log('   ✅ [CONTROL-PANEL] Botón de placa audio actualizado');
        }
        
        // Esperar un momento y luego actualizar botones de modo de reproducción
        setTimeout(() => {
            window.controlPanel.updatePlaybackModeButtons();
            window.controlPanel.checkLoadedVideos();
            console.log('✅ [CONTROL-PANEL] UI completamente actualizada después de eliminar videos');
        }, 100);
    };
    
    // Intentar actualizar inmediatamente o esperar
    updateUI();
});
console.log('📝 [CONTROL-PANEL] Listener videos-deleted registrado');

