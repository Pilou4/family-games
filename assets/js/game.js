(function () {
    const player = document.getElementById('game-player');
    if (!player) {
        return;
    }

    const tracks = JSON.parse(document.getElementById('game-tracks-data').textContent);
    const resultUrl = player.dataset.resultUrl;
    const isPreview = new URLSearchParams(window.location.search).get('preview') === '1';

    const startBtn = document.getElementById('game-start-btn');
    const logoEl = document.getElementById('game-logo');
    const welcomeEl = document.getElementById('game-welcome');
    const rulesScreenEl = document.getElementById('game-rules-screen');
    const adminBarEl = document.getElementById('game-admin-bar');
    const prevBtn = document.getElementById('game-prev-btn');
    const pauseBtn = document.getElementById('game-pause-btn');
    const pauseIconEl = document.getElementById('game-pause-icon');
    const nextBtn = document.getElementById('game-next-btn');
    const recordBtn = document.getElementById('game-record-btn');
    const revealEl = document.getElementById('game-reveal');
    const revealArtistEl = document.getElementById('game-reveal-artist');
    const revealArtistRowEl = document.getElementById('game-reveal-artist-row');
    const revealTitleEl = document.getElementById('game-reveal-title');
    const revealTitleRowEl = document.getElementById('game-reveal-title-row');
    const revealYearEl = document.getElementById('game-reveal-year');
    const revealYearRowEl = document.getElementById('game-reveal-year-row');
    const timerEl = document.getElementById('game-timer');
    const timerRingEl = document.getElementById('game-timer-ring');
    const progressCircle = document.getElementById('game-timer-progress');
    const audioEl = document.getElementById('game-audio');
    const numberEl = document.getElementById('game-number');
    const metaEl = document.getElementById('game-meta');
    const numberBadgeEl = document.getElementById('game-number-badge');
    const numberBadgeValueEl = document.getElementById('game-number-badge-value');
    const cardEl = document.querySelector('.game-card');

    const REVEAL_PAUSE_MS = 5000;
    const WELCOME_DISPLAY_MS = 3000;
    const RULES_DISPLAY_MS = 5000;

    const circumference = 2 * Math.PI * 54;
    if (progressCircle) {
        progressCircle.style.strokeDasharray = circumference;
    }

    // En mode test, tous les contrôles admin (précédent/pause/suivant/
    // enregistrer) sont visibles dès le chargement de la page, pas besoin
    // d'attendre le clic sur "Lancer".
    // La barre précédent/pause/suivant est utile à tout le monde, pas
    // seulement en mode test. Seul "Enregistrer" reste réservé à l'admin.
    if (adminBarEl) {
        adminBarEl.hidden = false;
    }
    if (isPreview && recordBtn) {
        recordBtn.hidden = false;
    }

    let currentIndex = 0;
    let youtubePlayer = null;
    let animationFrameId = null;
    let countdownStarted = false;
    let revealTimeoutId = null;
    let isPaused = false;

    // État courant utilisé UNIQUEMENT pour redessiner l'enregistrement
    // (voir plus bas). Mis à jour aux mêmes endroits que l'affichage réel.
    let recordingState = { phase: 'idle' };
    let recordingTrackNumber = 0;

    function togglePause() {
        const track = currentTrack();

        if (isPaused) {
            if (track.source === 'mp3') {
                audioEl.play();
            } else if (track.source === 'youtube' && youtubePlayer) {
                youtubePlayer.playVideo();
            }
            isPaused = false;
            pauseIconEl.innerHTML = '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';
        } else {
            if (track.source === 'mp3') {
                audioEl.pause();
            } else if (track.source === 'youtube' && youtubePlayer) {
                youtubePlayer.pauseVideo();
            }
            isPaused = true;
            pauseIconEl.innerHTML = '<path d="M8 5v14l11-7z"/>';
        }
    }

    function currentTrack() {
        return tracks[currentIndex];
    }

    // Renvoie la position réelle de lecture (en secondes) du morceau en
    // cours, quelle que soit sa source. C'est la SEULE source de vérité
    // utilisée pour le chrono : si le son bégaie ou s'arrête, cette valeur
    // n'avance plus, donc le chrono se fige avec lui automatiquement.
    function getCurrentPlaybackPosition() {
        const track = currentTrack();
        if (track.source === 'mp3') {
            return audioEl.currentTime || 0;
        }
        if (track.source === 'youtube' && youtubePlayer && youtubePlayer.getCurrentTime) {
            return youtubePlayer.getCurrentTime();
        }
        return 0;
    }

    function beginCountdownOnce() {
        if (countdownStarted) {
            return;
        }
        countdownStarted = true;
        startCountdown();
    }

    function startCountdown() {
        const track = currentTrack();
        const duration = track.duration;
        timerRingEl.classList.add('is-counting');

        function tick() {
            const position = getCurrentPlaybackPosition();
            const elapsed = Math.max(position - track.startTime, 0);
            const remaining = Math.max(duration - elapsed, 0);

            timerEl.textContent = Math.ceil(remaining);
            if (progressCircle) {
                progressCircle.style.strokeDashoffset = Math.min(elapsed / duration, 1) * circumference;
            }
            recordingState = { phase: 'countdown', remaining, duration };

            if (elapsed >= duration) {
                timerRingEl.classList.remove('is-counting');
                stopAllPlayback();
                reveal();
                return;
            }

            animationFrameId = requestAnimationFrame(tick);
        }

        animationFrameId = requestAnimationFrame(tick);
    }

    function stopCountdownEarly() {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        timerRingEl.classList.remove('is-counting');
    }

    function goToNext() {
        if (revealTimeoutId) {
            clearTimeout(revealTimeoutId);
            revealTimeoutId = null;
        }

        if (currentIndex === tracks.length - 1) {
            window.location.href = resultUrl;
            return;
        }

        currentIndex += 1;
        playCurrentTrack();
    }

    function goToPrevious() {
        if (currentIndex === 0) {
            return;
        }

        if (revealTimeoutId) {
            clearTimeout(revealTimeoutId);
            revealTimeoutId = null;
        }

        currentIndex -= 1;
        playCurrentTrack();
    }

    function setRevealField(valueEl, rowEl, value) {
        if (value) {
            valueEl.textContent = value;
            rowEl.hidden = false;
        } else {
            rowEl.hidden = true;
        }
    }

    function reveal() {
        const track = currentTrack();

        setRevealField(revealArtistEl, revealArtistRowEl, track.artist);
        setRevealField(revealTitleEl, revealTitleRowEl, track.title);
        setRevealField(revealYearEl, revealYearRowEl, track.year);

        revealEl.hidden = false;
        if (timerRingEl) {
            timerRingEl.hidden = true;
        }

        recordingState = { phase: 'reveal', artist: track.artist, title: track.title, year: track.year };

        // Enchaînement automatique dans tous les cas ; la barre admin
        // (visible uniquement en mode test) permet juste de ne pas attendre.
        revealTimeoutId = setTimeout(goToNext, REVEAL_PAUSE_MS);
    }

    function playMp3(track) {
        audioEl.addEventListener('loadedmetadata', () => {
            audioEl.currentTime = track.startTime;
            audioEl.play().catch((error) => {
                console.error('Lecture audio impossible :', error);
            });
        }, { once: true });

        audioEl.addEventListener('playing', () => {
            beginCountdownOnce();
        }, { once: true });

        audioEl.addEventListener('error', () => {
            console.error('Impossible de charger le fichier audio :', track.mp3Src);
        }, { once: true });

        audioEl.src = track.mp3Src;
        audioEl.load();
    }

    function createYoutubePlayer(track) {
        youtubePlayer = new window.YT.Player('youtube-target', {
            height: '1',
            width: '1',
            videoId: track.youtubeId,
            playerVars: {
                autoplay: 1,
                start: track.startTime,
                controls: 0,
                modestbranding: 1,
                rel: 0,
                iv_load_policy: 3,
            },
            events: {
                onReady: function (event) {
                    event.target.playVideo();
                },
                onStateChange: function (event) {
                    if (event.data === window.YT.PlayerState.PLAYING) {
                        beginCountdownOnce();
                    } else if (event.data === window.YT.PlayerState.ENDED) {
                        stopCountdownEarly();
                        reveal();
                    }
                },
                onError: function (event) {
                    console.error('Erreur YouTube (code ' + event.data + ') pour la vidéo ' + track.youtubeId + '. Codes 101/150 = intégration interdite par le propriétaire.');
                },
            },
        });
    }

    function playYoutube(track) {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            console.warn('Ce morceau est en YouTube : son non capturé dans l\'enregistrement (limite de sécurité des navigateurs), seule l\'image l\'est.');
        }

        if (youtubePlayer) {
            youtubePlayer.loadVideoById({ videoId: track.youtubeId, startSeconds: track.startTime });
            return;
        }

        if (window.YT && window.YT.Player) {
            createYoutubePlayer(track);
            return;
        }

        if (!document.getElementById('youtube-iframe-api')) {
            const script = document.createElement('script');
            script.id = 'youtube-iframe-api';
            script.src = 'https://www.youtube.com/iframe_api';
            document.head.appendChild(script);
        }

        window.onYouTubeIframeAPIReady = function () {
            createYoutubePlayer(track);
        };
    }

    function stopAllPlayback() {
        audioEl.pause();
        if (youtubePlayer) {
            youtubePlayer.pauseVideo();
        }
    }

    function playCurrentTrack() {
        stopCountdownEarly();
        stopAllPlayback();
        if (revealTimeoutId) {
            clearTimeout(revealTimeoutId);
            revealTimeoutId = null;
        }

        numberEl.textContent = currentIndex + 1;
        if (numberBadgeValueEl) {
            numberBadgeValueEl.textContent = currentIndex + 1;
        }
        if (numberBadgeEl) {
            numberBadgeEl.hidden = false;
        }
        recordingTrackNumber = currentIndex + 1;
        revealEl.hidden = true;
        if (timerRingEl) {
            timerRingEl.hidden = false;
        }
        countdownStarted = false;
        isPaused = false;
        if (pauseIconEl) {
            pauseIconEl.innerHTML = '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';
        }
        timerEl.textContent = '--';
        if (progressCircle) {
            progressCircle.style.strokeDashoffset = 0;
        }

        const track = currentTrack();

        if (track.source === 'mp3') {
            playMp3(track);
        } else if (track.source === 'youtube') {
            playYoutube(track);
        }
    }

    // --- Enregistrement ------------------------------------------------
    //
    // On n'utilise PAS la capture d'écran du navigateur (getDisplayMedia) :
    // elle impose un popup de partage à chaque fois et pose des soucis de
    // fiabilité (audio parfois refusé, conflits d'accélération graphique).
    //
    // À la place : on redessine nous-mêmes le contenu du bloc jeu sur un
    // canvas invisible (logo / consigne / chrono / révélation), et on
    // récupère le son directement depuis la balise <audio> via l'API Web
    // Audio. Aucun popup, aucune capture d'écran.
    //
    // Limite réelle et non contournable : le son d'une vidéo YouTube (site
    // tiers) ne peut pas être récupéré par cette méthode — seule l'image
    // l'est pour ces morceaux-là. C'est une protection de sécurité des
    // navigateurs contre le vol de son d'un autre site.

    let mediaRecorder = null;
    let recordedChunks = [];
    let recordingDrawLoopActive = false;
    let recordingAudioContext = null;
    let recordingAudioSource = null;
    let logoImage = null;

    function getCssColor(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const paragraphs = text.split('\n');
        const lines = [];

        paragraphs.forEach((paragraph) => {
            const words = paragraph.split(/\s+/).filter(Boolean);

            if (words.length === 0) {
                lines.push('');
                return;
            }

            let line = '';
            words.forEach((word) => {
                const testLine = line ? line + ' ' + word : word;
                if (ctx.measureText(testLine).width > maxWidth && line) {
                    lines.push(line);
                    line = word;
                } else {
                    line = testLine;
                }
            });
            if (line) {
                lines.push(line);
            }
        });

        const startY = y - ((lines.length - 1) * lineHeight) / 2;
        lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
    }

    function drawRecordingFrame(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = getCssColor('--color-bg-elevated');
        ctx.fillRect(0, 0, width, height);

        if (recordingTrackNumber > 0) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = getCssColor('--color-muted');
            ctx.font = '600 14px sans-serif';
            ctx.fillText('Extrait ' + recordingTrackNumber + ' / ' + tracks.length, 16, 16);
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (recordingState.phase === 'welcome' && recordingState.text) {
            ctx.fillStyle = getCssColor('--color-accent');
            ctx.font = '700 22px sans-serif';
            wrapText(ctx, recordingState.text, width / 2, height / 2, width * 0.8, 30);
            return;
        }

        if (recordingState.phase === 'rules' && recordingState.text) {
            ctx.fillStyle = getCssColor('--color-text');
            ctx.font = '600 20px sans-serif';
            wrapText(ctx, recordingState.text, width / 2, height / 2, width * 0.8, 28);
            return;
        }

        if (recordingState.phase === 'countdown') {
            const remaining = Math.max(recordingState.remaining || 0, 0);
            const duration = recordingState.duration || 1;
            const cx = width / 2;
            const cy = height / 2 - 20;
            const radius = Math.min(width, height) * 0.22;

            ctx.lineWidth = 8;
            ctx.strokeStyle = getCssColor('--color-bg');
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();

            const progress = 1 - remaining / duration;
            ctx.strokeStyle = getCssColor('--color-accent');
            ctx.beginPath();
            ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = getCssColor('--color-text');
            ctx.font = '800 42px sans-serif';
            ctx.fillText(String(Math.ceil(remaining)), cx, cy);
            return;
        }

        if (recordingState.phase === 'reveal') {
            ctx.fillStyle = getCssColor('--color-text');
            ctx.font = '700 22px sans-serif';
            const lines = [];
            if (recordingState.artist) {
                lines.push('Artiste : ' + recordingState.artist);
            }
            if (recordingState.title) {
                lines.push('Titre : ' + recordingState.title);
            }
            if (recordingState.year) {
                lines.push('Année : ' + recordingState.year);
            }
            const lineHeight = 34;
            const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
            lines.forEach((line, i) => ctx.fillText(line, width / 2, startY + i * lineHeight));
            return;
        }

        // Phase par défaut ('idle') : le logo.
        if (logoImage && logoImage.complete) {
            const size = Math.min(width, height) * 0.5;
            ctx.drawImage(logoImage, width / 2 - size / 2, height / 2 - size / 2, size, size);
        }
    }

    function setupRecordingAudio() {
        if (recordingAudioContext) {
            return recordingAudioContext.destinationNode;
        }

        recordingAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        recordingAudioSource = recordingAudioContext.createMediaElementSource(audioEl);
        const destination = recordingAudioContext.createMediaStreamDestination();

        // On garde le son audible normalement en plus de la capture.
        recordingAudioSource.connect(recordingAudioContext.destination);
        recordingAudioSource.connect(destination);

        recordingAudioContext.destinationNode = destination;
        return destination;
    }

    async function startRecording() {
        try {
            if (!logoImage) {
                logoImage = new Image();
                logoImage.src = '/images/logo.svg';
                await new Promise((resolve) => {
                    logoImage.onload = resolve;
                    logoImage.onerror = resolve;
                });
            }

            const audioDestination = setupRecordingAudio();

            // Suréchantillonnage : au moins x2, même sur un écran standard,
            // pour un rendu net (le texte notamment) dans la vidéo finale.
            const pixelRatio = Math.max(window.devicePixelRatio || 1, 2);
            const rect = cardEl.getBoundingClientRect();

            const canvas = document.createElement('canvas');
            canvas.width = Math.round(rect.width * pixelRatio);
            canvas.height = Math.round(rect.height * pixelRatio);
            const ctx = canvas.getContext('2d');
            ctx.scale(pixelRatio, pixelRatio);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            recordingDrawLoopActive = true;

            function drawFrame() {
                if (!recordingDrawLoopActive) {
                    return;
                }
                drawRecordingFrame(ctx, rect.width, rect.height);
                requestAnimationFrame(drawFrame);
            }

            drawFrame();

            const canvasStream = canvas.captureStream(30);
            const combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioDestination.stream.getAudioTracks(),
            ]);

            recordedChunks = [];
            mediaRecorder = new MediaRecorder(combinedStream, {
                mimeType: 'video/webm',
                videoBitsPerSecond: 16000000,
            });

            mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            });

            mediaRecorder.addEventListener('stop', () => {
                recordingDrawLoopActive = false;

                const blob = new Blob(recordedChunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'blind-test.webm';
                link.click();
                URL.revokeObjectURL(url);

                recordBtn.textContent = '⏺ Enregistrer';
            });

            mediaRecorder.start();
            recordBtn.textContent = '⏹ Arrêter l\'enregistrement';
        } catch (error) {
            console.error('Impossible de démarrer l\'enregistrement :', error);
        }
    }

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
    }

    startBtn.addEventListener('click', () => {
        startBtn.disabled = true;
        startBtn.hidden = true;

        if (logoEl) {
            logoEl.hidden = true;
        }
        if (recordBtn) {
            recordBtn.hidden = true;
        }

        function beginGame() {
            if (rulesScreenEl) {
                rulesScreenEl.hidden = true;
            }
            if (metaEl) {
                metaEl.classList.remove('game__meta--invisible');
            }
            if (timerRingEl) {
                timerRingEl.hidden = false;
            }
            playCurrentTrack();
        }

        function showRulesScreen() {
            if (welcomeEl) {
                welcomeEl.hidden = true;
            }
            if (rulesScreenEl && rulesScreenEl.querySelector('li')) {
                rulesScreenEl.hidden = false;
                recordingState = { phase: 'rules', text: rulesScreenEl.innerText };
                setTimeout(beginGame, RULES_DISPLAY_MS);
            } else {
                beginGame();
            }
        }

        if (welcomeEl) {
            if (timerRingEl) {
                timerRingEl.hidden = true;
            }
            welcomeEl.hidden = false;
            recordingState = { phase: 'welcome', text: welcomeEl.innerText };
            setTimeout(showRulesScreen, WELCOME_DISPLAY_MS);
        } else {
            showRulesScreen();
        }
    });

    if (prevBtn) {
        prevBtn.addEventListener('click', goToPrevious);
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', togglePause);
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', goToNext);
    }

    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                stopRecording();
            } else {
                startRecording();
            }
        });
    }
})();
