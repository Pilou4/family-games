import { game } from './dom.js';

export const tracks = JSON.parse(document.getElementById('game-tracks-data').textContent);
export const blindTestName = game.dataset.blindtestName;
export const blindTestDescription = game.dataset.description || '';
export const questionCount = parseInt(game.dataset.questionCount, 10) || tracks.length;
export const trackDuration = parseInt(game.dataset.duration, 10) || 0;
export const requiredFields = JSON.parse(game.dataset.requiredFields || '[]');

/**
 * Durée d'affichage par défaut (ms) de chaque écran, utilisée quand un
 * thème ne déclare PAS son propre data-screen-duration sur cet écran.
 * Un thème reste toujours libre de choisir sa propre durée pour un écran
 * précis (ex: une animation ou un message plus long) simplement en
 * posant data-screen-duration="XXXX" dans son .html.twig — voir
 * docs/THEMES.md. Pas d'entrée ici pour "presentation" (prévisualisation
 * uniquement, jamais minuté dans le vrai jeu) ni pour "timer" (piloté
 * par la durée réelle du son, pas par un minuteur fixe).
 *
 * Aucun thème (default, anniversaire) ne pose plus de
 * data-screen-duration dans son .html.twig : tout passe par ces valeurs
 * communes, pour que chaque page dure pile le même temps réel d'un
 * thème à l'autre. Un futur thème pourra toujours surcharger un écran
 * précis avec data-screen-duration s'il en a vraiment besoin (voir
 * docs/THEMES.md) — DEFAULT_SCREEN_DURATION ci-dessous reste le filet de
 * sécurité pour tout écran futur qui ne serait même pas listé ici.
 */
export const DEFAULT_SCREEN_DURATIONS = {
    welcome: 4500,
    description: 5000,
    rules: 6000,
    start: 3000,
    transition: 3000,
    reveal: 5000,
    end: 4000,
    thanks: 5000,
};

/** Dernier filet de sécurité : durée (ms) pour un écran absent de DEFAULT_SCREEN_DURATIONS. */
export const DEFAULT_SCREEN_DURATION = 5000;

export const state = {
    currentIndex: 0,
    youtubePlayer: null,
    countdownStarted: false,
    trackPlaybackActive: false,
    countdownFrameId: null,
    countdownTick: null,
    gameStarted: false,
    isPaused: false,
    currentSkipAction: null,
    currentBackAction: null,
    pausableTimers: [],
    transitionTimeoutId: null,
    revealTimeoutId: null,
    // Position exacte (en secondes) du morceau/vidéo au moment précis de
    // la pause — voir pausePlayback()/resumePlayback() dans playback.js.
    // Réappliquée explicitement à la reprise pour garantir qu'on reparte
    // pile au même endroit, sans dépendre du comportement par défaut du
    // navigateur (qui peut dériver selon le format du fichier).
    pausedPlaybackPosition: null,
};
