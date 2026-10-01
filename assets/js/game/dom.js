/**
 * Toutes les références DOM du jeu, centralisées ici pour que chaque
 * module (timer, playback, screens, recording, effects) les importe sans
 * dupliquer les document.getElementById un peu partout.
 */

export const game = document.getElementById('game');
export const screensRoot = document.getElementById('game-screens');
export const adminBarEl = document.getElementById('game-admin-bar');
export const prevBtn = document.getElementById('game-prev-btn');
export const pauseBtn = document.getElementById('game-pause-btn');
export const pauseIconEl = document.getElementById('game-pause-icon');
export const nextBtn = document.getElementById('game-next-btn');
export const recordBtn = document.getElementById('game-record-btn');
export const recordStartBtn = document.getElementById('game-record-start-btn');
export const audioEl = document.getElementById('game-audio');
export const voiceAudioEl = document.getElementById('game-voice-audio');
