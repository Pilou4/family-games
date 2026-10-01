import { state } from './state.js';

function removeTimer(timer) {
    const index = state.pausableTimers.indexOf(timer);
    if (-1 !== index) {
        state.pausableTimers.splice(index, 1);
    }
}

/**
 * Programme réellement le setTimeout natif d'un minuteur pausable, avec
 * le même nettoyage (retrait de state.pausableTimers une fois déclenché)
 * que ce soit à sa création ou après une reprise (resumeAllTimers) —
 * avant, seule la création passait par ce nettoyage, ce qui laissait des
 * minuteurs déjà déclenchés traîner indéfiniment dans le tableau après
 * une reprise.
 */
function scheduleTimer(timer, delay) {
    timer.timeoutId = setTimeout(() => {
        removeTimer(timer);
        timer.callback();
    }, delay);
}

/**
 * Un setTimeout que le bouton pause peut suspendre puis reprendre
 * exactement là où il en était (délais entre écrans, avant/après un
 * morceau...).
 * @param {() => void} callback
 * @param {number} delay
 */
export function createPausableTimeout(callback, delay) {
    const timer = {
        callback,
        remaining: delay,
        startedAt: Date.now(),
        timeoutId: null,
        // Si le jeu est DÉJÀ en pause au moment où ce minuteur est créé
        // (ex: un écran qui s'enchaîne tout seul 400ms après la fin d'un
        // extrait, alors que l'admin a cliqué pause pile à ce moment-là),
        // il doit naître gelé — jamais se mettre à décompter dans le vide
        // pendant que tout le reste est figé à l'écran. Il ne démarrera
        // vraiment qu'au prochain resumeAllTimers() (bouton play repris).
        paused: state.isPaused,
    };

    state.pausableTimers.push(timer);

    if (!timer.paused) {
        scheduleTimer(timer, delay);
    }

    return timer;
}

/**
 * @param {object|null} timer
 */
export function clearPausableTimeout(timer) {
    if (!timer) {
        return;
    }
    clearTimeout(timer.timeoutId);
    removeTimer(timer);
}

export function pauseAllTimers() {
    state.pausableTimers.forEach((timer) => {
        if (timer.paused) {
            return;
        }
        timer.paused = true;
        clearTimeout(timer.timeoutId);
        timer.remaining -= Date.now() - timer.startedAt;
    });
}

export function resumeAllTimers() {
    state.pausableTimers.forEach((timer) => {
        if (!timer.paused) {
            return;
        }
        timer.paused = false;
        timer.startedAt = Date.now();
        scheduleTimer(timer, Math.max(timer.remaining, 0));
    });
}

/**
 * Comme createPausableTimeout, mais avec la possibilité de déclencher
 * immédiatement le callback (bouton "avance" pendant un écran
 * d'introduction).
 * @param {() => void} callback
 * @param {number} delay
 */
export function createSkippableTimeout(callback, delay) {
    const wrapped = () => {
        state.currentSkipAction = null;
        callback();
    };
    const timer = createPausableTimeout(wrapped, delay);
    state.currentSkipAction = () => {
        clearPausableTimeout(timer);
        wrapped();
    };
    return timer;
}
