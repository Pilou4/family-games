import { state, tracks } from './state.js';
import { getCurrentPlaybackPosition } from './playback.js';
import { reveal } from './screens.js';
import { createPausableTimeout } from './pausable.js';

export function beginCountdownOnce() {
    if (state.countdownStarted) {
        return;
    }
    state.countdownStarted = true;
    startCountdown();
}

/**
 * Vérifie le temps restant à chaque frame (comme requestAnimationFrame
 * le permet, ~60x/s) pour déclencher la réponse au bon moment à la
 * milliseconde près — mais n'écrit dans le DOM qu'une fois par seconde
 * (quand le chiffre affiché change réellement), pour ne pas surcharger
 * inutilement le navigateur.
 */
export function startCountdown() {
    const track = tracks[state.currentIndex];
    const duration = track.duration;
    const timerValueEl = document.querySelector('[data-screen="timer"] [data-game-value="timer"]');
    let lastDisplayed = null;

    function tick() {
        const position = getCurrentPlaybackPosition();
        const elapsed = Math.max(position - track.startTime, 0);
        const remaining = Math.max(duration - elapsed, 0);

        const displayed = Math.floor(remaining);
        if (timerValueEl && displayed !== lastDisplayed) {
            lastDisplayed = displayed;
            timerValueEl.textContent = displayed;
            timerValueEl.dataset.remaining = remaining;
            timerValueEl.dataset.duration = duration;
        }

        if (elapsed >= duration) {
            stopCountdownEarly();
            // Force l'affichage de "0" (au cas où la position audio ait
            // "sauté" par-dessus ce point exact, ce qui arrive selon les
            // navigateurs) et laisse un court instant garanti pour que ce
            // soit visible, plutôt que d'enchaîner sur la réponse dans la
            // même image.
            if (timerValueEl) {
                timerValueEl.textContent = '0';
                timerValueEl.dataset.remaining = 0;
                timerValueEl.dataset.duration = duration;
            }
            // createPausableTimeout (pas un setTimeout brut) : si une
            // pause tombe pile dans cette toute petite fenêtre de 400ms
            // (entre "le temps est écoulé" et "la réponse s'affiche"),
            // elle doit vraiment tout geler, pas laisser la réponse
            // s'afficher puis s'enchaîner toute seule en arrière-plan
            // pendant que l'écran semble figé.
            createPausableTimeout(reveal, 400);
            return;
        }

        state.countdownFrameId = requestAnimationFrame(tick);
    }

    state.countdownTick = tick;
    tick();
}

export function stopCountdownEarly() {
    if (state.countdownFrameId) {
        cancelAnimationFrame(state.countdownFrameId);
        state.countdownFrameId = null;
    }
    state.countdownTick = null;
}

/**
 * Suspend le décompte sans perdre sa position : comme le son lui-même
 * est mis en pause (voir game.js), sa position ne bouge plus tant que
 * resumeCountdown() ne relance pas la vérification.
 */
export function pauseCountdown() {
    if (state.countdownFrameId) {
        cancelAnimationFrame(state.countdownFrameId);
        state.countdownFrameId = null;
    }
}

export function resumeCountdown() {
    if (!state.countdownTick || state.countdownFrameId) {
        return;
    }
    state.countdownFrameId = requestAnimationFrame(state.countdownTick);
}
