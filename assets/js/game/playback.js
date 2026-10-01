import { audioEl } from './dom.js';
import { state, tracks } from './state.js';
import { beginCountdownOnce, stopCountdownEarly } from './timer.js';
import { reveal } from './screens.js';

export function getCurrentPlaybackPosition() {
    const track = tracks[state.currentIndex];
    if (track.source === 'mp3') {
        return audioEl.currentTime || 0;
    }
    if (track.source === 'youtube' && state.youtubePlayer && state.youtubePlayer.getCurrentTime) {
        return state.youtubePlayer.getCurrentTime();
    }
    return 0;
}

export function playMp3(track) {
    // Affectation de propriété (onloadedmetadata = ...) plutôt que
    // addEventListener(..., {once:true}) : ça REMPLACE l'écouteur
    // précédent au lieu de s'empiler avec lui. Important ici, sinon un
    // changement rapide de morceau (précédent/avance cliqués vite) peut
    // laisser un ancien écouteur, pas encore déclenché, se déclencher
    // plus tard avec les mauvaises informations (le morceau qu'il visait
    // n'est déjà plus celui en cours).
    audioEl.onloadedmetadata = () => {
        audioEl.currentTime = track.startTime;
        audioEl.play().catch((error) => {
            console.error('Lecture audio impossible :', error);
        });
    };

    audioEl.onplaying = () => {
        beginCountdownOnce();
    };

    audioEl.onerror = () => {
        console.error('Impossible de charger le fichier audio :', track.mp3Src);
    };

    audioEl.src = track.mp3Src;
    audioEl.load();
}

export function createYoutubePlayer(track) {
    state.youtubePlayer = new window.YT.Player('youtube-target', {
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
                console.error('Erreur YouTube (code ' + event.data + ') pour la vidéo ' + track.youtubeId + '.');
            },
        },
    });
}

export function playYoutube(track) {
    if (state.youtubePlayer) {
        state.youtubePlayer.loadVideoById({ videoId: track.youtubeId, startSeconds: track.startTime });
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

export function stopAllPlayback() {
    audioEl.pause();
    if (state.youtubePlayer) {
        state.youtubePlayer.pauseVideo();
    }
}

/**
 * Met en pause le morceau/vidéo en cours ET mémorise sa position exacte
 * (state.pausedPlaybackPosition), réappliquée explicitement par
 * resumePlayback() ci-dessous. Nécessaire pour garantir une VRAIE pause
 * (reprise pile au même endroit) quel que soit le lecteur : un simple
 * pause()/play() natif suffit en théorie, mais certains fichiers/lecteurs
 * peuvent légèrement dériver la position à la reprise (ex: réalignement
 * sur un mot-clé proche pour un mp3 à débit variable, ou resynchronisation
 * du lecteur YouTube) — on force donc explicitement le retour exact à la
 * position figée, pour se comporter exactement comme une pause vidéo/
 * musique "normale", sans exception.
 */
export function pausePlayback() {
    const track = tracks[state.currentIndex];
    // state.trackPlaybackActive n'est vrai QUE pendant l'écran "timer"
    // (l'extrait en train de jouer) — une fois la réponse affichée (voir
    // reveal() dans screens.js, qui stoppe le son et repasse ce drapeau à
    // false), il n'y a plus rien à mettre en pause/reprendre ici : sans
    // cette garde, rappuyer sur pause pendant l'écran de réponse
    // relançait le morceau déjà terminé depuis le début.
    if (!track || !state.trackPlaybackActive) {
        return;
    }

    state.pausedPlaybackPosition = getCurrentPlaybackPosition();

    if (track.source === 'mp3') {
        audioEl.pause();
    } else if (track.source === 'youtube' && state.youtubePlayer) {
        state.youtubePlayer.pauseVideo();
    }
}

export function resumePlayback() {
    const track = tracks[state.currentIndex];
    // Même garde qu'en pause : si l'extrait n'est plus "actif" (écran de
    // réponse ou suivant), il n'y a rien à reprendre — surtout pas
    // relancer un morceau déjà coupé.
    if (!track || !state.trackPlaybackActive) {
        return;
    }

    const resumeAt = state.pausedPlaybackPosition;
    state.pausedPlaybackPosition = null;

    if (track.source === 'mp3') {
        if (null !== resumeAt) {
            audioEl.currentTime = resumeAt;
        }
        audioEl.play().catch(() => {});
    } else if (track.source === 'youtube' && state.youtubePlayer) {
        if (null !== resumeAt && state.youtubePlayer.seekTo) {
            state.youtubePlayer.seekTo(resumeAt, true);
        }
        state.youtubePlayer.playVideo();
    }
}
