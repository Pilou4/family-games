import { game } from './dom.js';

export const tracks = JSON.parse(document.getElementById('game-tracks-data').textContent);
export const blindTestName = game.dataset.blindtestName;
export const blindTestDescription = game.dataset.description || '';
export const questionCount = parseInt(game.dataset.questionCount, 10) || tracks.length;
export const trackDuration = parseInt(game.dataset.duration, 10) || 0;
export const requiredFields = JSON.parse(game.dataset.requiredFields || '[]');

/** Durée par défaut (ms) d'un écran qui ne déclare pas data-screen-duration. */
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
