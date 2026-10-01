import { recordBtn, recordStartBtn } from './dom.js';
import { state } from './state.js';

// --- Enregistrement ------------------------------------------------
//
// Combine deux sources :
// - l'IMAGE vient d'une vraie capture d'écran de l'onglet (getDisplayMedia,
//   vidéo uniquement) : garantit un rendu exactement identique à ce qui
//   est affiché (couleurs, polices, animations), sans rien redessiner à
//   la main.
// - le SON vient directement de TOUTES les balises <audio> présentes sur
//   la page au moment du clic (musique + voix du jeu, mais aussi musique
//   d'ambiance ou effets sonores propres à un thème, ex: anniversaire.js)
//   via l'API Web Audio, PAS de la fenêtre de partage d'écran : capturer
//   le son via la case "Partager l'audio de l'onglet" de cette fenêtre
//   s'est révélé peu fiable en pratique (silence malgré la case cochée
//   sous Chrome, combinaison vidéo+audio carrément refusée sous Firefox)
//   — passer par les balises audio elles-mêmes évite complètement cette
//   dépendance : le son est automatiquement inclus, sans rien à cocher.
//
// Point technique important : l'AudioContext ci-dessous est créé et
// réveillé ("resume") tout de suite au clic, encore dans la continuité
// synchrone du geste de l'utilisateur, avant le moindre "await" — un
// AudioContext créé plus tard (ex: après la fenêtre de partage d'écran)
// peut démarrer "suspendu" selon la politique anti-autoplay du
// navigateur, avec pour résultat un enregistrement totalement silencieux.
//
// Limite réelle et non contournable : le son d'une vidéo YouTube (site
// tiers) ne peut pas être récupéré par l'API Web Audio — seule l'image
// l'est pour ces morceaux-là (protection navigateur contre le vol de
// son d'un autre site).

function setupRecordingAudio() {
    if (state.recordingAudioDestination) {
        // Déjà créé lors d'un enregistrement précédent dans cette même
        // page — toujours s'assurer qu'il n'est pas resté suspendu,
        // sinon silence total au 2e enregistrement.
        if (state.recordingAudioContext && 'suspended' === state.recordingAudioContext.state) {
            state.recordingAudioContext.resume();
        }
        return state.recordingAudioDestination;
    }

    state.recordingAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = state.recordingAudioContext.createMediaStreamDestination();

    // TOUTES les balises <audio> de la page, pas seulement celles du
    // moteur de jeu (#game-audio, #game-voice-audio) : un thème peut
    // créer les siennes pour sa propre musique d'ambiance ou ses effets
    // sonores (ex: assets/js/themes/anniversaire.js), toutes présentes
    // dans le DOM dès le chargement de la page, avant le premier clic sur
    // "Enregistrer" — connectées une seule fois ici à la même destination
    // captée, tout en restant audibles normalement (double connexion).
    document.querySelectorAll('audio').forEach((el) => {
        const source = state.recordingAudioContext.createMediaElementSource(el);
        source.connect(state.recordingAudioContext.destination);
        source.connect(destination);
    });

    state.recordingAudioContext.resume();

    state.recordingAudioDestination = destination;
    return destination;
}

/**
 * Un enregistrement est considéré "déjà en cours" seulement si son
 * MediaRecorder n'est pas inactif ET que son flux a encore au moins une
 * piste vivante. Cette 2e condition est une protection supplémentaire :
 * si un arrêt précédent s'est mal passé, .state peut rester bloqué sur
 * "recording" indéfiniment — sans cette vérification, le tout prochain
 * clic sur "Enregistrer" ne ferait plus rien du tout (silencieusement
 * bloqué par ce verrou), sans aucun moyen de redémarrer sans recharger
 * la page.
 */
function isRecordingActuallyInProgress() {
    if (!state.mediaRecorder || 'inactive' === state.mediaRecorder.state) {
        return false;
    }
    const { stream } = state.mediaRecorder;
    if (stream && stream.getTracks().every((track) => 'ended' === track.readyState)) {
        return false;
    }
    return true;
}

export async function startRecording() {
    // Verrou posé AVANT tout "await" : empêche un 2e appel de démarrer
    // (double-clic, ou 2 boutons déclenchant chacun startRecording()) tant
    // que le premier n'est pas allé jusqu'au bout.
    if (state.recordingStarting || isRecordingActuallyInProgress()) {
        return;
    }
    state.recordingStarting = true;

    try {
        // Créé tout de suite, encore dans la continuité synchrone du
        // clic (voir l'explication en haut de fichier).
        const audioDestination = setupRecordingAudio();

        // Le jeu est déjà plein écran en permanence : il ne reste plus
        // qu'à masquer la barre de contrôle pour que la capture montre
        // exactement le jeu, rien d'autre.
        document.body.classList.add('is-recording-mode');
        // Laisse la mise en page se stabiliser avant de capturer.
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        state.displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: 'browser',
                // 20 plutôt que 30 : sur certains navigateurs/systèmes, la
                // capture d'écran elle-même (pas l'encodage) est coûteuse
                // en CPU — baisser le nombre d'images demandées réduit
                // directement cette charge.
                frameRate: { ideal: 20, max: 20 },
                // 1440p plutôt que 1080p : légère hausse de netteté
                // demandée, tout en gardant une limite ("max") pour ne
                // jamais capturer à la résolution native d'un écran 4K/
                // Retina (bien plus de pixels à encoder pour un gain
                // invisible au visionnage).
                width: { ideal: 2560, max: 2560 },
                height: { ideal: 1440, max: 1440 },
                // Le curseur de la souris redessiné à chaque image coûte
                // un peu de calcul en plus, pour un rendu qu'on ne veut
                // de toute façon pas voir dans la vidéo.
                cursor: 'never',
            },
            // Pas de son demandé ici — il vient des balises <audio> du jeu
            // (voir setupRecordingAudio ci-dessus), pas de la fenêtre de
            // partage d'écran.
            audio: false,
            // Ignoré par Firefox (spécifique à Chrome/Edge), sans effet
            // négatif — permet à Chrome de proposer directement "Cet
            // onglet" en premier choix.
            preferCurrentTab: true,
            selfBrowserSurface: 'include',
        });

        const [videoTrack] = state.displayStream.getVideoTracks();
        if (videoTrack && 'contentHint' in videoTrack) {
            // Indique au navigateur de privilégier la fluidité (nombre
            // d'images tenu) plutôt que le détail par image en cas de
            // ressources limitées.
            videoTrack.contentHint = 'motion';
        }

        const combinedStream = new MediaStream([
            ...state.displayStream.getVideoTracks(),
            ...audioDestination.stream.getAudioTracks(),
        ]);

        // VP8 s'encode en temps réel beaucoup plus vite que VP9 (moins de
        // compression, mais bien moins gourmand en CPU) : sans codec
        // précisé, le navigateur peut choisir VP9 et saturer le CPU
        // pendant l'encodage, ce qui fait ramer l'affichage EN DIRECT
        // pendant l'enregistrement (pas juste le fichier final).
        const preferredMimeTypes = [
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp8',
            'video/webm',
        ];
        const mimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';

        state.recordedChunks = [];
        state.mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType,
            // 6 Mbps : légère hausse pour accompagner le passage à 1440p
            // ci-dessus (image plus nette), sans reprendre les débits plus
            // élevés qui avaient contribué aux saccades plus tôt.
            videoBitsPerSecond: 6000000,
        });

        state.mediaRecorder.addEventListener('dataavailable', (event) => {
            if (event.data.size > 0) {
                state.recordedChunks.push(event.data);
            }
        });

        state.mediaRecorder.addEventListener('stop', () => {
            document.body.classList.remove('is-recording-mode');
            state.displayStream.getTracks().forEach((track) => track.stop());
            state.displayStream = null;

            const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'blind-test.webm';
            link.click();
            URL.revokeObjectURL(url);

            recordBtn.textContent = '⏺';
            recordBtn.hidden = false;
            if (recordStartBtn) {
                recordStartBtn.hidden = true;
            }
        });

        // Si l'utilisateur arrête le partage depuis la barre du
        // navigateur elle-même (pas notre bouton), on arrête proprement.
        let nativeStopHandled = false;
        const handleNativeStop = () => {
            if (nativeStopHandled) {
                return;
            }
            nativeStopHandled = true;
            stopRecording();
            // Filet de sécurité : si l'évènement 'stop' du MediaRecorder
            // ne se déclenche pas, on force quand même le retour à
            // l'état normal après un court délai, pour ne jamais rester
            // bloqué avec la barre de contrôle cachée.
            setTimeout(() => {
                if (recordBtn.hidden) {
                    document.body.classList.remove('is-recording-mode');
                    recordBtn.textContent = '⏺';
                    recordBtn.hidden = false;
                    if (recordStartBtn) {
                        recordStartBtn.hidden = true;
                    }
                }
            }, 1500);
        };
        state.displayStream.getVideoTracks()[0].addEventListener('ended', handleNativeStop);

        state.mediaRecorder.start();
        recordBtn.textContent = '⏹';
    } catch (error) {
        document.body.classList.remove('is-recording-mode');
        recordBtn.hidden = false;
        if (recordStartBtn) {
            recordStartBtn.hidden = true;
        }
        console.error('Impossible de démarrer l\'enregistrement :', error);
    } finally {
        state.recordingStarting = false;
    }
}

export function stopRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
    }
}
