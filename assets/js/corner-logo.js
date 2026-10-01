/**
 * Logo permanent en coin d'écran — commun à tous les thèmes, pour ne pas
 * dupliquer cette logique dans chacun. Visible dès qu'on quitte l'écran
 * "presentation" (réservé à la prévisualisation), jusqu'à la fin.
 *
 * Écoute les deux événements de changement d'écran possibles :
 * 'themepreview:screenchange' (prévisualisation, envoyé par
 * theme-preview.js) et 'game:screenchange' (vrai jeu, envoyé par
 * assets/js/game/screens.js) — même forme, donc même traitement.
 */

const logoEl = document.getElementById('game-corner-logo');

if (logoEl) {
    function handleScreenChange(event) {
        const { key } = event.detail;
        logoEl.classList.toggle('is-visible', 'presentation' !== key);
    }

    document.addEventListener('themepreview:screenchange', handleScreenChange);
    document.addEventListener('game:screenchange', handleScreenChange);
}
