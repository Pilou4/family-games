import { audioEl, voiceAudioEl, recordBtn } from './dom.js';
import { state } from './state.js';

// --- Enregistrement ------------------------------------------------
//
// Combine le meilleur des deux approches déjà testées :
// - l'IMAGE vient d'une vraie capture d'écran de l'onglet
//   (getDisplayMedia, vidéo uniquement) : garantit un rendu exactement
//   identique à ce qui est affiché (couleurs, polices, animations),
//   sans avoir à redessiner quoi que ce soit à la main.
// - le SON (musique + voix) vient de l'API Web Audio, directement
//   depuis les balises <audio> elles-mêmes : fiable à 100%, ne dépend
//   pas d'une case à cocher dans la fenêtre de partage du navigateur.
//
// Limite réelle et non contournable : le son d'une vidéo YouTube (site
// tiers) ne peut pas être récupéré par l'API Web Audio — seule l'image
// l'est pour ces morceaux-là (protection navigateur contre le vol de
// son d'un autre site).

export function setupRecordingAudio() {
    if (state.recordingAudioDestination) {
        return state.recordingAudioDestination;
    }

    state.recordingAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = state.recordingAudioContext.createMediaStreamDestination();

    // Musique + voix connectées à la même destination captée, tout en
    // restant audibles normalement (double connexion).
    [audioEl, voiceAudioEl].forEach((el) => {
        if (!el) {
            return;
        }
        const source = state.recordingAudioContext.createMediaElementSource(el);
        source.connect(state.recordingAudioContext.destination);
        source.connect(destination);
    });

    state.recordingAudioDestination = destination;
    return destination;
}

export async function startRecording() {
    try {
        // Le jeu est déjà plein écran en permanence : il ne reste plus
        // qu'à masquer la barre de contrôle pour que la capture montre
        // exactement le jeu, rien d'autre.
        document.body.classList.add('is-recording-mode');
        // Laisse la mise en page se stabiliser avant de capturer.
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        state.displayStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                displaySurface: 'browser',
                frameRate: 30,
            },
            audio: false,
            preferCurrentTab: true,
            selfBrowserSurface: 'include',
        });

        const audioDestination = setupRecordingAudio();

        const combinedStream = new MediaStream([
            ...state.displayStream.getVideoTracks(),
            ...audioDestination.stream.getAudioTracks(),
        ]);

        // VP8 s'encode en temps réel beaucoup plus vite que VP9 (moins de
        // compression, mais bien moins gourmand en CPU) : sans codec
        // précisé, le navigateur peut choisir VP9 et saturer le CPU
        // pendant l'encodage, ce qui fait ramer l'affichage EN DIRECT
        // pendant l'enregistrement (pas juste le fichier final). On
        // prend le meilleur codec réellement rapide disponible.
        const preferredMimeTypes = [
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp8',
            'video/webm',
        ];
        const mimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';

        state.recordedChunks = [];
        state.mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType,
            // 8 Mbps est déjà largement suffisant en qualité pour du
            // 1080p (bien au-dessus de ce qu'utilise le streaming vidéo
            // classique) ; 25 Mbps ne s'encodait pas en temps réel de
            // façon fiable sur toutes les machines.
            videoBitsPerSecond: 8000000,
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
        });

        // Si l'utilisateur arrête le partage depuis la barre du
        // navigateur elle-même (pas notre bouton), on arrête proprement.
        state.displayStream.getVideoTracks()[0].addEventListener('ended', () => {
            stopRecording();
        });

        state.mediaRecorder.start();
        recordBtn.textContent = '⏹';
    } catch (error) {
        document.body.classList.remove('is-recording-mode');
        console.error('Impossible de démarrer l\'enregistrement :', error);
    }
}

export function stopRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
        state.mediaRecorder.stop();
    }
}
