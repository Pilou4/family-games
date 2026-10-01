import {
    game, adminBarEl, prevBtn, pauseBtn, pauseIconEl, nextBtn, recordBtn, recordStartBtn, audioEl,
} from './dom.js';
import { state } from './state.js';
import { pauseAllTimers, resumeAllTimers } from './pausable.js';
import { pauseCountdown, resumeCountdown } from './timer.js';
import { pausePlayback, resumePlayback } from './playback.js';
import {
    fillStaticGameValues, showInitialScreen, enterIntroSequence,
    goToNext, goToPrevious,
} from './screens.js';
import { startRecording, stopRecording } from './recording.js';

const PLAY_ICON = '<path d="M8 5v14l11-7z"/>';
const PAUSE_ICON = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>';

const isPreview = Boolean(game) && game.dataset.isPreview === '1';

// Devient true au premier clic sur "Lecture" (nécessaire : les
// navigateurs bloquent la lecture audio tant qu'il n'y a pas eu
// d'interaction de l'utilisateur, donc rien ne peut démarrer tout seul
// au chargement de la page).
let hasStarted = false;

// Rien à faire sur une page sans jeu (garde-fou, en pratique ce script
// n'est chargé que sur la vraie page de jeu).
if (game) {
    init();
}

function init() {
    fillStaticGameValues();
    bindButtons();
    bindKeyboardShortcuts();
    bindScreenChangeSafetyNet();

    if (adminBarEl) {
        adminBarEl.hidden = false;
    }

    if (isPreview && recordBtn) {
        recordBtn.hidden = false;
    }

    // On ne touche à rien avant le premier clic sur "Lecture" : la page
    // de présentation reste affichée telle quelle (écran d'attente),
    // exactement comme le HTML du thème la définit par défaut.
}

function beginGame() {
    enterIntroSequence();
}

/**
 * Met en pause/reprend TOUT son "d'ambiance" présent sur la page — pas le
 * morceau du blind test lui-même (#game-audio), déjà entièrement géré
 * par pausePlayback()/resumePlayback() dans playback.js, avec leur propre
 * garde (state.trackPlaybackActive) qui sait précisément quand il y a
 * vraiment un extrait à mettre en pause. Un thème peut avoir sa propre
 * musique d'ambiance ou ses propres effets sonores (ex: anniversaire.js,
 * et bientôt une mélodie/voix sur les pages de fin), joués sur leurs
 * propres balises <audio> que game.js ne connaît pas à l'avance — pour
 * CEUX-LÀ uniquement, on mémorise sur chaque élément s'il jouait avant la
 * pause, pour ne reprendre que ceux qui jouaient vraiment.
 *
 * #game-audio est explicitement exclu ici : le laisser dans ce balayage
 * générique créait une double gestion sur le même élément (deux systèmes
 * de pause différents sur la même balise), avec un vrai bug observé —
 * une pause posée pendant un extrait, suivie d'une navigation manuelle
 * qui change d'écran sans repasser par "lecture", laissait une marque
 * "il jouait avant la pause" oubliée sur #game-audio ; un futur clic sur
 * pause (même sur l'écran de fin, bien après que l'extrait soit terminé)
 * la relisait alors par erreur depuis sa dernière position. Désormais,
 * #game-audio ne peut plus être concerné que par pausePlayback()/
 * resumePlayback(), qui refusent déjà tout si aucun extrait n'est
 * vraiment actif — une seule autorité par élément, donc plus de
 * confusion possible entre ces deux mécanismes.
 */
function pauseAllAudioElements() {
    document.querySelectorAll('audio').forEach((el) => {
        if (el !== audioEl && !el.paused) {
            el.dataset.pausedByGame = '1';
            el.pause();
        }
    });
}

function resumeAllAudioElements() {
    document.querySelectorAll('audio').forEach((el) => {
        if (el !== audioEl && el.dataset.pausedByGame === '1') {
            delete el.dataset.pausedByGame;
            el.play().catch(() => {});
        }
    });
}

/**
 * Anti-clic-fou : empêche de redéclencher play/pause en rafale. togglePause()
 * est entièrement synchrone (JS étant mono-thread, un clic est toujours
 * traité jusqu'au bout avant que le suivant puisse démarrer), donc
 * l'icône ne peut PAS se désynchroniser du vrai état même sans ce verrou
 * — le vrai risque, c'est d'enchaîner les appels audio.play()/.pause()
 * trop vite (ça peut déclencher une erreur navigateur bénigne, déjà
 * rattrapée ailleurs par un .catch(), mais ça fait crachoter le son).
 * 250ms suffit largement à laisser le moteur audio respirer entre deux
 * bascules, sans que ce soit perceptible au clic normal — inutile de
 * bloquer plus longtemps juste pour "faire propre". Le bouton reste
 * visuellement désactivé pendant ce court délai, pour que ce soit
 * évident qu'un clic ne sert à rien tant qu'il est là.
 */
const PAUSE_TOGGLE_COOLDOWN_MS = 250;
let pauseToggleLocked = false;

function togglePauseWithCooldown() {
    if (pauseToggleLocked) {
        return;
    }

    pauseToggleLocked = true;
    if (pauseBtn) {
        pauseBtn.disabled = true;
    }

    togglePause();

    setTimeout(() => {
        pauseToggleLocked = false;
        if (pauseBtn) {
            pauseBtn.disabled = false;
        }
    }, PAUSE_TOGGLE_COOLDOWN_MS);
}

export function togglePause() {
    // Premier clic : ce bouton sert à LANCER le jeu (son inclus), pas à
    // le mettre en pause — il n'y a encore rien à mettre en pause.
    if (!hasStarted) {
        hasStarted = true;
        if (pauseIconEl) {
            pauseIconEl.innerHTML = PAUSE_ICON;
        }
        beginGame();
        return;
    }

    if (state.isPaused) {
        state.isPaused = false;
        resumeAllTimers();
        resumeCountdown();
        resumePlayback();
        resumeAllAudioElements();
        if (pauseIconEl) {
            pauseIconEl.innerHTML = PAUSE_ICON;
        }
        document.body.classList.remove('is-game-paused');
    } else {
        state.isPaused = true;
        pauseAllTimers();
        pauseCountdown();
        pausePlayback();
        pauseAllAudioElements();
        if (pauseIconEl) {
            pauseIconEl.innerHTML = PLAY_ICON;
        }
        document.body.classList.add('is-game-paused');
    }
}

/**
 * Sortie propre de l'état pause : remise à zéro de l'icône et du fond,
 * oubli de tout ce qui pouvait rester en attente (position mémorisée,
 * pistes audio marquées "coupées par la pause") et dégel de tous les
 * minuteurs pausables — sans rien relancer au hasard (chaque écran/
 * thème remet son propre son dans le bon état tout seul, via ses
 * propres règles). Centralisé ici pour qu'il n'y ait qu'un seul endroit
 * à tenir à jour si ce comportement doit évoluer.
 */
function exitPauseState() {
    state.isPaused = false;
    state.pausedPlaybackPosition = null;
    document.body.classList.remove('is-game-paused');
    if (pauseIconEl) {
        pauseIconEl.innerHTML = PAUSE_ICON;
    }
    document.querySelectorAll('audio').forEach((el) => {
        delete el.dataset.pausedByGame;
    });
    resumeAllTimers();
}

/**
 * Filet de sécurité : si jamais un changement d'écran survient alors que
 * state.isPaused est encore true (ex: un futur appel qui changerait
 * d'écran pendant une pause sans passer par goBack()/goForward()
 * ci-dessous), on sort proprement de la pause plutôt que de rester
 * bloqué en interne dessus alors que tout semble normal à l'écran.
 * Devenu secondaire depuis que goBack()/goForward() appellent déjà
 * exitPauseState() directement (voir plus bas) — gardé en filet
 * supplémentaire, sans rien changer à son comportement.
 */
function bindScreenChangeSafetyNet() {
    document.addEventListener('game:screenchange', () => {
        if (!state.isPaused) {
            return;
        }
        exitPauseState();
    });
}

/**
 * Empêche un même clic (ou une même pression clavier) de déclencher
 * l'action d'avance/recul deux fois de suite en une fraction de
 * seconde : sans ce verrou, un double déclenchement fait sauter
 * plusieurs écrans d'un coup (ex: "suivant" depuis "C'est parti" qui
 * atterrit directement sur "Merci") au lieu de passer à l'écran
 * suivant. Le verrou se relâche tout seul dès que l'affichage a eu le
 * temps de se mettre à jour.
 */
let navBusy = false;
function withNavLock(action) {
    if (navBusy) {
        return;
    }
    navBusy = true;
    action();
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            navBusy = false;
        });
    });
}

/**
 * Précédent/suivant utilisé PENDANT une pause : on sort explicitement de
 * l'état pause avant d'exécuter la navigation elle-même, au lieu de
 * compter uniquement sur l'événement 'game:screenchange' (voir
 * bindScreenChangeSafetyNet ci-dessus) — certains écrans (transition,
 * chrono, réponse) sont le MÊME élément DOM réutilisé d'un morceau à
 * l'autre, donc le changer pour un morceau différent ne le fait pas
 * forcément ressortir de "is-active" à un instant donné (showScreen()
 * ne fait rien s'il est déjà actif), et l'événement ne se déclenche
 * alors pas. Résultat observé : la lecture reprenait bien, mais le
 * bouton restait affiché "pause" — appeler ceci ici, avant la
 * navigation, garantit que le bouton et l'état interne sont toujours
 * synchronisés, quel que soit l'écran de destination.
 */
function goBack() {
    if (state.isPaused) {
        exitPauseState();
    }
    if (state.currentBackAction) {
        state.currentBackAction();
    } else {
        goToPrevious();
    }
}

function goForward() {
    if (state.isPaused) {
        exitPauseState();
    }
    if (state.currentSkipAction) {
        state.currentSkipAction();
    } else {
        goToNext();
    }
}

function bindButtons() {
    if (prevBtn) {
        prevBtn.addEventListener('click', () => withNavLock(goBack));
    }

    if (pauseBtn) {
        pauseBtn.addEventListener('click', togglePauseWithCooldown);
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => withNavLock(goForward));
    }

    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
                stopRecording();
            } else {
                startRecording();
            }
        });
    }
}

/**
 * Pendant l'enregistrement, la barre de contrôle est volontairement
 * masquée (pour ne pas apparaître dans la vidéo) — mais l'admin doit
 * quand même pouvoir mettre en pause, changer de morceau ou arrêter
 * l'enregistrement. Ces raccourcis clavier ne s'affichent nulle part à
 * l'écran, donc ils ne polluent jamais la capture, contrairement à un
 * bouton visible.
 */
function bindKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
        const tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') {
            return;
        }

        if (event.code === 'Space') {
            event.preventDefault();
            togglePauseWithCooldown();
        } else if (event.code === 'ArrowRight') {
            withNavLock(goForward);
        } else if (event.code === 'ArrowLeft') {
            withNavLock(goBack);
        } else if (event.key === 'r' || event.key === 'R') {
            if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
                stopRecording();
            } else if (recordBtn && !recordBtn.hidden) {
                recordBtn.click();
            }
        }
    });
}
