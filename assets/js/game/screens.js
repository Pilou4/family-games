import { screensRoot } from './dom.js';
import { state, tracks, blindTestName, blindTestDescription, questionCount, trackDuration, requiredFields, DEFAULT_SCREEN_DURATION } from './state.js';
import { stopCountdownEarly } from './timer.js';
import { playMp3, playYoutube, stopAllPlayback } from './playback.js';
import { createPausableTimeout, clearPausableTimeout } from './pausable.js';

function getAllScreens() {
    return Array.from(screensRoot.querySelectorAll('[data-screen]'))
        .filter((el) => 'true' !== el.dataset.previewOnly)
        // L'écran "description" ne fait partie du vrai jeu que si le blind
        // test a vraiment une description renseignée — sinon il est
        // entièrement sauté, comme s'il n'existait pas (il reste visible
        // en prévisualisation, qui ne passe pas par getAllScreens()).
        .filter((el) => 'description' !== el.dataset.screen || '' !== blindTestDescription.trim());
}

function findScreen(key) {
    return screensRoot.querySelector(`[data-screen="${key}"]`);
}

function screenDuration(el) {
    const declared = el ? parseInt(el.dataset.screenDuration, 10) : NaN;
    return Number.isNaN(declared) ? DEFAULT_SCREEN_DURATION : declared;
}

function showScreen(el) {
    if (!el || el.classList.contains('is-active')) {
        return;
    }
    screensRoot.querySelectorAll('.is-active').forEach((s) => s.classList.remove('is-active'));
    el.classList.add('is-active');
    document.dispatchEvent(new CustomEvent('game:screenchange', { detail: { key: el.dataset.screen } }));
}

function fillGameValue(root, key, value) {
    if (!root) {
        return;
    }
    root.querySelectorAll(`[data-game-value="${key}"]`).forEach((el) => {
        el.textContent = value;
    });
}

/**
 * Comme fillGameValue, mais reconstruit le contenu en une lettre par
 * <span> (avec un délai d'animation croissant), au lieu d'un simple
 * texte — nécessaire pour les titres qui s'animent lettre par lettre en
 * CSS (chaque lettre est un <span> individuel animé, voir par exemple
 * .birthday-page-2-title span dans anniversaire.css). Un simple
 * textContent détruirait ces <span> et, avec eux, l'animation ET la
 * couleur (souvent posée sur les lettres, pas sur le titre entier).
 * @param {number} delayStep secondes entre chaque lettre
 */
function fillLetterAnimatedValue(root, key, value, delayStep = 0.08) {
    if (!root) {
        return;
    }
    root.querySelectorAll(`[data-game-value="${key}"]`).forEach((el) => {
        const letterClass = el.dataset.letterClass || '';
        el.setAttribute('aria-label', value);
        el.textContent = '';
        [...value].forEach((char, index) => {
            const span = document.createElement('span');
            if (letterClass) {
                span.className = letterClass;
            }
            span.style.animationDelay = `${index * delayStep}s`;
            span.textContent = ' ' === char ? '\u00A0' : char;
            el.appendChild(span);
        });
    });
}

function fillResponse(root, key, value) {
    if (!root) {
        return;
    }
    root.querySelectorAll(`[data-response-key="${key}"]`).forEach((el) => {
        el.textContent = value || '';
    });
}

/**
 * Affiche ou cache une case de réponse entière (voir
 * data-response-container="artist"/"year"/"extra" dans le HTML) — le
 * nombre de cases visibles doit correspondre aux champs réellement
 * configurés pour ce blind test, pas toujours en montrer 3.
 */
function setResponseVisible(root, key, visible) {
    if (!root) {
        return;
    }
    root.querySelectorAll(`[data-response-container="${key}"]`).forEach((el) => {
        el.hidden = !visible;
    });
}

/**
 * Affiche ou cache une ligne de règle entière (voir
 * data-rules-point="title"/"artist"/"year" dans le HTML, sur l'écran
 * "rules") — même mécanique que setResponseVisible pour la révélation :
 * seuls les critères réellement cochés pour ce blind test doivent
 * apparaître dans les règles.
 */
function setRulesPointVisible(key, visible) {
    screensRoot.querySelectorAll(`[data-rules-point="${key}"]`).forEach((el) => {
        el.hidden = !visible;
    });
}

function getIntroScreens() {
    const screens = getAllScreens();
    const startIndex = screens.findIndex((el) => 'start' === el.dataset.screen);
    return -1 === startIndex ? screens : screens.slice(0, startIndex + 1);
}

export function fillStaticGameValues() {
    fillLetterAnimatedValue(screensRoot, 'blindtest-name', blindTestName);
    fillGameValue(screensRoot, 'description', blindTestDescription);
    fillGameValue(screensRoot, 'question-count', String(questionCount));
    fillGameValue(screensRoot, 'duration', String(trackDuration));

    // Écran "rules" : seuls les critères cochés pour ce blind test (voir
    // BlindTest::AVAILABLE_REQUIRED_FIELDS) doivent apparaître dans la
    // liste des règles.
    setRulesPointVisible('title', requiredFields.includes('title'));
    setRulesPointVisible('artist', requiredFields.includes('artist'));
    setRulesPointVisible('year', requiredFields.includes('year'));
}

export function showInitialScreen() {
    const [first] = getIntroScreens();
    showScreen(first);
}

/**
 * Enchaîne les écrans d'introduction, chacun affiché data-screen-duration
 * ms (5000 par défaut), puis appelle onComplete. Avance ET recul sont
 * possibles à tout moment (boutons de la barre de contrôle) : les deux
 * passent par la même fonction showAt, qui annule systématiquement le
 * minuteur en attente avant de changer d'écran.
 */
export function startIntroSequence(onComplete) {
    const screens = getIntroScreens();
    let pendingTimer = null;

    function showAt(index) {
        if (pendingTimer) {
            clearPausableTimeout(pendingTimer);
            pendingTimer = null;
        }

        if (index < 0) {
            index = 0;
        }

        if (index >= screens.length) {
            state.currentSkipAction = null;
            state.currentBackAction = null;
            onComplete();
            return;
        }

        showScreen(screens[index]);
        pendingTimer = createPausableTimeout(() => showAt(index + 1), screenDuration(screens[index]));
        state.currentSkipAction = () => showAt(index + 1);
        state.currentBackAction = () => showAt(index - 1);
    }

    showAt(0);
}

/**
 * Affiche l'écran de transition (s'il existe) puis lance la lecture du
 * morceau courant. Le minuteur de transition est mémorisé pour pouvoir
 * l'annuler proprement si on avance/recule manuellement pendant qu'il
 * est en attente (sinon : double avance).
 */
export function playCurrentTrack() {
    const transitionEl = findScreen('transition');

    if (transitionEl) {
        showScreen(transitionEl);
        const number = String(state.currentIndex + 1);
        const total = String(tracks.length).padStart(2, '0');
        fillGameValue(transitionEl, 'track-number', number);
        fillGameValue(transitionEl, 'track-total', total);
        state.transitionTimeoutId = createPausableTimeout(startTrackPlayback, screenDuration(transitionEl));
    } else {
        startTrackPlayback();
    }
}

function startTrackPlayback() {
    const track = tracks[state.currentIndex];
    const timerEl = findScreen('timer');

    showScreen(timerEl);
    state.countdownStarted = false;
    state.trackPlaybackActive = true;

    if (track.source === 'mp3') {
        playMp3(track);
    } else if (track.source === 'youtube') {
        playYoutube(track);
    }
}

export function reveal() {
    const track = tracks[state.currentIndex];
    const revealEl = findScreen('reveal');

    // Le son continue de jouer PENDANT l'écran de réponse (voulu : on
    // veut pouvoir réécouter le morceau en lisant la réponse) — il ne
    // s'arrête vraiment que lorsqu'on avance vers l'extrait suivant ou la
    // fin du jeu (voir stopAllPlayback() dans goToNext()/goToPrevious()/
    // showEndScreen()). state.trackPlaybackActive reste donc à true ici :
    // le bouton pause doit continuer à gérer ce son normalement, avec
    // exactement le même mécanisme que pendant l'extrait (capture de la
    // position exacte, voir pausePlayback()/resumePlayback()).
    showScreen(revealEl);
    fillResponse(revealEl, 'title', track.title);

    setResponseVisible(revealEl, 'artist', requiredFields.includes('artist'));
    fillResponse(revealEl, 'artist', track.artist);

    setResponseVisible(revealEl, 'year', requiredFields.includes('year'));
    fillResponse(revealEl, 'year', track.year ? String(track.year) : '');

    // Case "information" : réservée à la prévisualisation pour l'instant
    // (aucun champ réel n'y correspond), toujours cachée en vrai jeu.
    setResponseVisible(revealEl, 'extra', false);

    state.revealTimeoutId = createPausableTimeout(goToNext, screenDuration(revealEl));
}

/**
 * Annule les minuteurs de transition/révélation en attente — nécessaire
 * avant tout changement manuel de morceau (avance/recul), sinon un
 * minuteur oublié se déclenche plus tard en plus de l'action manuelle
 * (double avance).
 */
function cancelPendingTrackTimers() {
    if (state.transitionTimeoutId) {
        clearPausableTimeout(state.transitionTimeoutId);
        state.transitionTimeoutId = null;
    }
    if (state.revealTimeoutId) {
        clearPausableTimeout(state.revealTimeoutId);
        state.revealTimeoutId = null;
    }
}

export function goToNext() {
    if (!state.gameStarted) {
        return;
    }

    cancelPendingTrackTimers();

    if (state.currentIndex >= tracks.length - 1) {
        showEndScreen();
        return;
    }

    state.currentIndex += 1;
    stopCountdownEarly();
    stopAllPlayback();
    playCurrentTrack();
}

export function goToPrevious() {
    if (!state.gameStarted || state.currentIndex <= 0) {
        return;
    }

    cancelPendingTrackTimers();

    state.currentIndex -= 1;
    stopCountdownEarly();
    stopAllPlayback();
    playCurrentTrack();
}

/**
 * Écrans à partir de "end" (bravo à tous) jusqu'à la fin (ex: Merci) —
 * la conclusion. Même mécanique que startIntroSequence : avance ET
 * recul possibles à tout moment via la barre de contrôle, les deux
 * passent par showAt qui annule systématiquement le minuteur en
 * attente avant de changer d'écran.
 */
function showEndScreen() {
    state.trackPlaybackActive = false;
    stopCountdownEarly();
    stopAllPlayback();

    const allScreens = getAllScreens();
    const endIndex = allScreens.findIndex((el) => 'end' === el.dataset.screen);
    const outroScreens = -1 === endIndex ? [] : allScreens.slice(endIndex);
    let pendingTimer = null;

    function showAt(index) {
        if (pendingTimer) {
            clearPausableTimeout(pendingTimer);
            pendingTimer = null;
        }

        if (index < 0) {
            index = 0;
        }

        if (index >= outroScreens.length) {
            state.currentSkipAction = null;
            state.currentBackAction = null;
            return;
        }

        showScreen(outroScreens[index]);
        pendingTimer = createPausableTimeout(() => showAt(index + 1), screenDuration(outroScreens[index]));
        state.currentSkipAction = () => showAt(index + 1);
        state.currentBackAction = () => showAt(index - 1);
    }

    showAt(0);
}
