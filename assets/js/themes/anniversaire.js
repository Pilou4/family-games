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
   VOIX SYNCHRONISÉES — écran "Règles du jeu" (propre à ce thème, voir la
   garde en haut de fichier : ce code ne tourne jamais sur un autre thème).
   ----------------------------------------------------------------------
   Les fichiers sont déjà présents dans public/voix/ (rien à générer ici) :
   un fichier fixe pour le titre et pour chaque ligne "point", et un
   fichier par valeur possible pour les lignes dynamiques (nombre de
   chansons, durée d'un extrait) — ex: "9-chansons.mp3",
   "15-sec-par-extrait.mp3". Le minutage de lecture de chaque ligne est
   calé sur son délai d'apparition CSS (voir .birthday-rule:nth-child(N)
   et .birthday-rules-title dans anniversaire.css) pour rester synchrone
   avec le texte qui apparaît.
   ========================================================================== */

/** "1-chanson.mp3" au singulier, "N-chansons.mp3" au pluriel ; null si hors
 *  plage (fichiers disponibles de 1 à 69 chansons) — la ligne reste
 *  silencieuse plutôt que de planter sur un fichier manquant. */
function questionCountVoiceFile(count) {
    if (!Number.isFinite(count) || count < 1) {
        return null;
    }
    if (1 === count) {
        return '1-chanson.mp3';
    }
    return count <= 69 ? `${count}-chansons.mp3` : null;
}

/** "N-sec-par-extrait.mp3" ; null si hors plage (fichiers disponibles de
 *  10 à 20 secondes seulement) — même logique de repli silencieux. */
function durationVoiceFile(duration) {
    if (!Number.isFinite(duration)) {
        return null;
    }
    return (duration >= 10 && duration <= 20) ? `${duration}-sec-par-extrait.mp3` : null;
}

/**
 * Crée un contrôleur de voix indépendant (son propre <audio>, son propre
 * jeu de minuteurs) — un par contexte (prévisualisation / vrai jeu), les
 * deux ne tournant jamais en même temps sur la même page.
 */
function createRulesVoiceController() {
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    document.body.appendChild(audio);

    let timers = [];

    function stop() {
        timers.forEach((id) => clearTimeout(id));
        timers = [];
        audio.pause();
        audio.currentTime = 0;
    }

    function playFile(fileName) {
        audio.pause();
        audio.src = `/voix/${fileName}`;
        audio.currentTime = 0;
        audio.play().catch(() => {});
    }

    /**
     * Lance la séquence complète pour l'écran "rules" passé en argument.
     * Lit les valeurs dynamiques (nombre de chansons, durée) directement
     * dans son DOM, et ne joue une ligne "point" que si elle n'est pas
     * masquée (data-rules-point, caché par screens.js quand ce critère
     * n'est pas coché pour ce blind test — voir setRulesPointVisible).
     */
    function playSequence(rulesScreenEl) {
        stop();

        if (!rulesScreenEl) {
            return;
        }

        const questionCountEl = rulesScreenEl.querySelector('[data-game-value="question-count"]');
        const durationEl = rulesScreenEl.querySelector('[data-game-value="duration"]');
        const questionCount = questionCountEl ? parseInt(questionCountEl.textContent, 10) : NaN;
        const duration = durationEl ? parseInt(durationEl.textContent, 10) : NaN;

        const pointFiles = {
            title: '1-point-pour-le-titre.mp3',
            artist: '1-point-pour-artiste.mp3',
            year: '1-point-pour-annee.mp3',
        };
        // Délais alignés sur .birthday-rule:nth-child(3/4/5) dans
        // anniversaire.css : fixes, quelle que soit la ligne masquée ou
        // non (nth-child compte la position réelle dans le HTML, pas
        // seulement les lignes visibles). Espacés d'environ 1.75-2s les
        // uns des autres pour laisser à chaque voix le temps de se
        // terminer avant que la ligne suivante n'apparaisse (la plus
        // longue dure jusqu'à ~1.8s) — voir le même commentaire côté CSS.
        const pointDelays = { title: 6200, artist: 7850, year: 9500 };

        const sequence = [
            { delay: 1050, file: 'regles-du-jeu.mp3' },
            { delay: 2400, file: questionCountVoiceFile(questionCount) },
            { delay: 4150, file: durationVoiceFile(duration) },
        ];

        ['title', 'artist', 'year'].forEach((key) => {
            const lineEl = rulesScreenEl.querySelector(`[data-rules-point="${key}"]`);
            if (lineEl && !lineEl.hidden) {
                sequence.push({ delay: pointDelays[key], file: pointFiles[key] });
            }
        });

        sequence
            .filter((entry) => null !== entry.file)
            .forEach((entry) => {
                timers.push(setTimeout(() => playFile(entry.file), entry.delay));
            });
    }

    return { playSequence, stop };
}

/**
 * Joue la voix "C'est parti !" (public/voix/cest-partie.mp3), calée sur
 * l'apparition du titre de l'écran "start" (voir .birthday-start-title
 * dans anniversaire.css, dont l'animation démarre à .55s) — même
 * principe que createRulesVoiceController ci-dessus, en plus simple
 * puisqu'il n'y a qu'une seule ligne, fixe (pas de valeur dynamique).
 */
function createStartVoiceController() {
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    document.body.appendChild(audio);

    let timer = null;

    function stop() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        audio.pause();
        audio.currentTime = 0;
    }

    function play() {
        stop();
        timer = setTimeout(() => {
            audio.src = '/voix/cest-partie.mp3';
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }, 550);
    }

    return { play, stop };
}

/** "extrait-numero-N.mp3" ; null si hors plage (fichiers disponibles de 1
 *  à 69) — la ligne reste silencieuse plutôt que de planter. */
function extraitNumeroVoiceFile(number) {
    if (!Number.isFinite(number) || number < 1) {
        return null;
    }
    return number <= 69 ? `extrait-numero-${number}.mp3` : null;
}

/**
 * Joue la voix "Extrait numéro X" (public/voix/extrait-numero-N.mp3),
 * calée sur l'apparition du gros numéro de l'écran "transition" (voir
 * .birthday-page-5-number dans anniversaire.css, dont l'animation
 * démarre à .15s, label juste avant à .2s).
 *
 * Important : dans le vrai jeu, la valeur (data-game-value="track-number")
 * est écrite par screens.js JUSTE APRÈS l'envoi de l'événement
 * 'game:screenchange' (voir goToTransition) — donc PAS encore disponible
 * au moment où ce gestionnaire est appelé. On ne la lit qu'à l'intérieur
 * du setTimeout ci-dessous, une fois le minuteur écoulé, jamais avant.
 */
function createExtraitVoiceController() {
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    document.body.appendChild(audio);

    let timer = null;

    function stop() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        audio.pause();
        audio.currentTime = 0;
    }

    function play(transitionScreenEl) {
        stop();

        if (!transitionScreenEl) {
            return;
        }

        timer = setTimeout(() => {
            const numberEl = transitionScreenEl.querySelector('[data-game-value="track-number"]');
            const number = numberEl ? parseInt(numberEl.textContent, 10) : NaN;
            const file = extraitNumeroVoiceFile(number);
            if (!file) {
                return;
            }
            audio.src = `/voix/${file}`;
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }, 200);
    }

    return { play, stop };
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
    const rulesVoice = createRulesVoiceController();
    const startVoice = createStartVoiceController();
    const extraitVoice = createExtraitVoiceController();

    // La barre de contrôle musique (lecture, volume, son du "c'est
    // parti"...) est commune à tous les thèmes — voir
    // assets/js/theme-preview-player.js. Ce thème ne gère ici que ce qui
    // lui est propre : les classes de fin d'animation, la bougie, et les
    // voix des écrans "règles", "c'est parti" et "extrait n°".

    document.addEventListener('themepreview:screenchange', (event) => {
        const { key } = event.detail;

        document.body.classList.toggle('anniv-ending', 'end' === key);
        document.body.classList.toggle('anniv-thanks', 'thanks' === key);

        if (candleTimer) {
            clearInterval(candleTimer);
            candleTimer = null;
        }

        if ('rules' === key) {
            rulesVoice.playSequence(document.querySelector('[data-screen="rules"]'));
        } else {
            rulesVoice.stop();
        }

        if ('start' === key) {
            startVoice.play();
        } else {
            startVoice.stop();
        }

        if ('transition' === key) {
            extraitVoice.play(document.querySelector('[data-screen="transition"]'));
        } else {
            extraitVoice.stop();
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
    const rulesVoice = createRulesVoiceController();
    const startVoice = createStartVoiceController();
    const extraitVoice = createExtraitVoiceController();

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

        if ('rules' === key) {
            rulesVoice.playSequence(document.querySelector('[data-screen="rules"]'));
        } else {
            rulesVoice.stop();
        }

        if ('start' === key) {
            startSound.currentTime = 0;
            startSound.volume = 0.45;
            startSound.play().catch(() => {});
            startVoice.play();
        } else {
            startVoice.stop();
        }

        if ('transition' === key) {
            extraitVoice.play(document.querySelector('[data-screen="transition"]'));
        } else {
            extraitVoice.stop();
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
