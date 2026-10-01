/**
 * LECTEUR MUSIQUE DE PRÉVISUALISATION — commun à tous les thèmes, pour ne
 * pas le dupliquer dans chacun (voir templates/admin/theme_preview/show.
 * html.twig, qui affiche la barre pour tous les thèmes désormais et
 * décide, thème par thème, quelle source audio lui donner — rien ici
 * n'est lié à "anniversaire" en particulier).
 *
 * Si le thème affiché n'a pas de <source> (pas de musique renseignée
 * dans show.html.twig pour ce thème), ou que la source indiquée échoue
 * à charger, la barre reste visible mais désactivée (classe
 * .is-disabled) plutôt que fonctionnelle à vide.
 */

const music = document.getElementById('theme-preview-music');
const startSound = document.getElementById('theme-preview-start-sound');
const player = document.getElementById('theme-preview-player');
const playBtn = document.getElementById('theme-preview-player-play');
const muteBtn = document.getElementById('theme-preview-player-mute');
const progress = document.getElementById('theme-preview-player-progress');
const volume = document.getElementById('theme-preview-player-volume');

if (music && player && playBtn && muteBtn && progress && volume) {
    let lastVolume = 0.18;

    // Écrans où la musique d'ambiance joue — identiques pour tous les
    // thèmes puisque le contrat d'écrans (data-screen) est partagé.
    const AMBIENT_SCREENS = ['welcome', 'rules', 'start'];

    function setReady(ready) {
        player.classList.toggle('is-disabled', !ready);
        [playBtn, muteBtn, progress, volume].forEach((el) => {
            el.disabled = !ready;
        });
    }

    // Désactivée si le thème n'a tout simplement pas de <source> (pas de
    // musique renseignée pour lui dans show.html.twig), activée sinon —
    // puis désactivée si cette source échoue réellement à charger (fichier
    // manquant sur le serveur). Pas d'attente d'un événement de type
    // "chargement terminé" (canplaythrough) pour activer la barre : il ne
    // se déclenche pas de façon fiable selon le navigateur.
    const hasSource = music.querySelector('source[src]') !== null;
    setReady(hasSource);
    music.addEventListener('error', () => setReady(false));

    function updatePlayButton() {
        playBtn.textContent = music.paused ? '▶' : 'Ⅱ';
        player.classList.toggle('is-playing', !music.paused);
    }

    function startMusic() {
        if (player.classList.contains('is-disabled')) {
            return;
        }
        if (0 === music.volume) {
            music.volume = lastVolume || 0.18;
        }
        music.play().then(updatePlayButton).catch(updatePlayButton);
    }

    function stopMusic() {
        music.pause();
        updatePlayButton();
    }

    playBtn.addEventListener('click', () => {
        if (music.paused) {
            startMusic();
        } else {
            stopMusic();
        }
    });

    muteBtn.addEventListener('click', () => {
        if (music.muted) {
            music.muted = false;
            music.volume = lastVolume || 0.18;
            muteBtn.textContent = '🔊';
        } else {
            if (music.volume > 0) {
                lastVolume = music.volume;
            }
            music.muted = true;
            muteBtn.textContent = '🔇';
        }
    });

    volume.addEventListener('input', () => {
        const value = parseFloat(volume.value);
        music.volume = value;
        if (value > 0) {
            lastVolume = value;
            music.muted = false;
            muteBtn.textContent = '🔊';
        } else {
            music.muted = true;
            muteBtn.textContent = '🔇';
        }
    });

    music.addEventListener('timeupdate', () => {
        if (music.duration) {
            progress.value = (music.currentTime / music.duration) * 100;
        }
    });

    progress.addEventListener('input', () => {
        if (music.duration) {
            music.currentTime = (parseFloat(progress.value) / 100) * music.duration;
        }
    });

    music.volume = 0.18;
    volume.value = '0.18';
    updatePlayButton();

    document.addEventListener('themepreview:screenchange', (event) => {
        const { key } = event.detail;

        if (AMBIENT_SCREENS.includes(key)) {
            startMusic();
        } else {
            stopMusic();
        }

        if ('start' === key && startSound) {
            startSound.currentTime = 0;
            startSound.volume = 0.45;
            startSound.play().catch(() => {});
        }
    });
}
