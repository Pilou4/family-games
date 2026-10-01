import '../../styles/themes/anniversaire.css';

/**
 * THÈME "ANNIVERSAIRE"
 * ---------------------
 * Fonctionne dans 2 contextes, chacun avec sa propre détection :
 * - la prévisualisation (templates/admin/theme_preview) : écoute
 *   l'événement générique 'themepreview:screenchange' envoyé par
 *   theme-preview.js à chaque changement d'écran.
 * - le vrai jeu, une fois ce thème branché dessus : écoute
 *   'game:screenchange', envoyé par le moteur (assets/js/game/screens.js)
 *   — même forme d'événement, donc même logique, juste une vraie source
 *   de vérité pour le chrono (voir initRealGameHooks).
 * Les deux cohabitent sans conflit : chaque partie vérifie sa propre
 * classe sur <body> avant d'agir.
 */

if (document.body.classList.contains('theme-anniversaire')) {
    initBackgroundDecor();
    initPreviewHooks();
    initRealGameHooks();
}

/**
 * Lumières flottantes + confettis + ballons en fond, présents en
 * permanence — utile dans les deux contextes.
 */
function initBackgroundDecor() {
    const container = document.createDocumentFragment();

    ['anniv-bg-light--1', 'anniv-bg-light--2', 'anniv-bg-light--3'].forEach((modifier) => {
        const light = document.createElement('div');
        light.className = `anniv-bg-light ${modifier}`;
        container.appendChild(light);
    });

    // Position, couleur, rotation et délai de chaque confetti/ballon sont
    // définis dans anniversaire.css (classes --1, --2, ...) : le JS se
    // contente de créer les éléments et de poser la bonne classe, aucun
    // style n'est écrit ici.
    for (let i = 1; i <= 8; i += 1) {
        const confetti = document.createElement('div');
        confetti.className = `anniv-bg-confetti anniv-bg-confetti--${i}`;
        container.appendChild(confetti);
    }

    for (let i = 1; i <= 2; i += 1) {
        const balloon = document.createElement('div');
        balloon.className = `anniv-bg-balloon anniv-bg-balloon--${i}`;
        balloon.textContent = '🎈';
        container.appendChild(balloon);
    }

    document.body.appendChild(container);
}

// Les 12 confettis de l'écran "C'est parti" (.birthday-start-confetti)
// sont déjà présents dans le HTML du thème et entièrement pilotés par
// anniversaire.css (position, couleur et trajectoire via nth-child +
// variables CSS, animation déclenchée par la classe .is-active posée sur
// l'écran) — rien à faire ici, pas de duplication en JS.

/**
 * Fait "brûler" une bougie déjà présente dans le DOM sur BASE_SECONDS,
 * réutilisé par la prévisualisation (compte à rebours simulé) et pourra
 * l'être par le vrai jeu (voir syncCandleToRealTimer plus bas).
 */
function createCandleController(candleEl) {
    const body = candleEl.querySelector('.birthday-page-6-side-candle-body');
    const center = candleEl.parentElement?.querySelector('.birthday-page-6-center');
    const number = candleEl.parentElement?.querySelector('.birthday-page-6-number');

    function setFraction(fraction, secondsLeft) {
        const clamped = Math.max(0, Math.min(1, fraction));
        candleEl.style.setProperty('--burn', String(clamped));
        candleEl.style.setProperty('--melt', String(1 - clamped));
        candleEl.style.setProperty('--flame-opacity', clamped <= 0 ? '0' : '1');
        candleEl.classList.toggle('finished', clamped <= 0);
        candleEl.classList.toggle('show-final-drips', clamped <= 1 / 15);

        if (number && undefined !== secondsLeft) {
            number.textContent = String(secondsLeft);
        }

        if (center) {
            const hue = 2 + 42 * clamped;
            center.style.setProperty('--timer-hue', String(hue));
            center.classList.remove('timer-high', 'timer-mid', 'timer-low');
            if (clamped >= 11 / 15) {
                center.classList.add('timer-high');
            } else if (clamped >= 6 / 15) {
                center.classList.add('timer-mid');
            } else {
                center.classList.add('timer-low');
            }
        }
    }

    function reset() {
        candleEl.classList.remove('is-burning');
        setFraction(1, 15);
        // Force le recalcul immédiat de la hauteur pleine avant de
        // réactiver la transition, sinon la bougie "saute" au reset.
        void body?.offsetHeight;
        candleEl.classList.add('is-burning');
    }

    return { setFraction, reset };
}

/* ==========================================================================
   PRÉVISUALISATION : écoute les changements d'écran génériques
   ========================================================================== */

function initPreviewHooks() {
    if (!document.body.classList.contains('theme-preview')) {
        return;
    }

    let candleTimer = null;
    let candleController = null;

    // La barre de contrôle musique (lecture, volume, son du "c'est
    // parti"...) est commune à tous les thèmes — voir
    // assets/js/theme-preview-player.js. Ce thème ne gère ici que ce qui
    // lui est propre : les classes de fin d'animation et la bougie.

    document.addEventListener('themepreview:screenchange', (event) => {
        const { key } = event.detail;

        document.body.classList.toggle('anniv-ending', 'end' === key);
        document.body.classList.toggle('anniv-thanks', 'thanks' === key);

        if (candleTimer) {
            clearInterval(candleTimer);
            candleTimer = null;
        }

        if ('timer' === key) {
            const candleEl = document.querySelector('[data-screen="timer"] .birthday-page-6-side-candle');
            if (candleEl) {
                candleController = createCandleController(candleEl);
                candleController.reset();
                let secondsLeft = 15;
                candleTimer = setInterval(() => {
                    secondsLeft -= 1;
                    if (secondsLeft < 0) {
                        clearInterval(candleTimer);
                        candleTimer = null;
                        return;
                    }
                    candleController.setFraction(secondsLeft / 15, secondsLeft);
                }, 1000);
            }
        }
    });
}

/* ==========================================================================
   VRAI JEU (une fois ce thème branché dessus) : écoute 'game:screenchange',
   envoyé par le moteur (assets/js/game/screens.js) à chaque changement
   d'écran — même forme que 'themepreview:screenchange' côté
   prévisualisation, donc la logique ci-dessous est très proche de
   initPreviewHooks, avec une vraie source de vérité pour le chrono au
   lieu d'un compte à rebours simulé.
   ========================================================================== */

function initRealGameHooks() {
    if (!document.body.classList.contains('game-fullscreen')) {
        return;
    }

    let candleController = null;
    let candleObserver = null;

    const music = document.createElement('audio');
    music.src = '/audio/theme-anniversaire/music.mp3';
    music.loop = true;
    music.volume = 0.18;
    music.preload = 'auto';
    document.body.appendChild(music);

    const startSound = document.createElement('audio');
    startSound.src = '/audio/theme-anniversaire/start.mp3';
    startSound.preload = 'auto';
    document.body.appendChild(startSound);

    const AMBIENT_SCREENS = ['welcome', 'rules', 'start'];

    document.addEventListener('game:screenchange', (event) => {
        const { key } = event.detail;

        document.body.classList.toggle('anniv-ending', 'end' === key);
        document.body.classList.toggle('anniv-thanks', 'thanks' === key);

        if (AMBIENT_SCREENS.includes(key)) {
            music.play().catch(() => {});
        } else {
            music.pause();
        }

        if (candleObserver) {
            candleObserver.disconnect();
            candleObserver = null;
        }

        if ('start' === key) {
            startSound.currentTime = 0;
            startSound.volume = 0.45;
            startSound.play().catch(() => {});
        }

        if ('timer' === key) {
            const candleEl = document.querySelector('[data-screen="timer"] .birthday-page-6-side-candle');
            const timerValueEl = document.querySelector('[data-screen="timer"] [data-game-value="timer"]');
            if (!candleEl || !timerValueEl) {
                return;
            }

            candleController = createCandleController(candleEl);
            candleController.reset();

            candleObserver = new MutationObserver(() => {
                const remaining = parseFloat(timerValueEl.dataset.remaining);
                const duration = parseFloat(timerValueEl.dataset.duration);
                if (!duration || Number.isNaN(remaining)) {
                    return;
                }
                candleController.setFraction(remaining / duration, Math.ceil(remaining));
            });
            candleObserver.observe(timerValueEl, {
                attributes: true,
                attributeFilter: ['data-remaining', 'data-duration'],
            });
        }
    });
}
