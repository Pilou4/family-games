/**
 * BASE COMMUNE DE PRÉVISUALISATION
 * ----------------------------------
 * Navigation générique entre écrans (flèches, clavier). Ne connaît rien du
 * contenu spécifique à un thème — chaque theme-{slug}.js peut observer les
 * changements d'écran via l'événement 'themepreview:screenchange' plutôt
 * que d'aller modifier ce fichier.
 */

document.addEventListener('DOMContentLoaded', () => {
    const screens = document.querySelectorAll('.theme-preview-screen');
    const prevBtn = document.getElementById('theme-preview-prev');
    const nextBtn = document.getElementById('theme-preview-next');
    const counter = document.getElementById('theme-preview-counter');

    if (!screens.length || !prevBtn || !nextBtn || !counter) {
        return;
    }

    let currentIndex = 0;

    function showScreen(index) {
        if (index < 0) {
            index = screens.length - 1;
        }
        if (index >= screens.length) {
            index = 0;
        }

        currentIndex = index;
        screens.forEach((screen) => screen.classList.remove('is-active'));

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                screens[currentIndex].classList.add('is-active');
                document.dispatchEvent(new CustomEvent('themepreview:screenchange', {
                    detail: {
                        index: currentIndex,
                        key: screens[currentIndex].dataset.screen,
                    },
                }));
            });
        });

        counter.textContent = `${currentIndex + 1} / ${screens.length}`;
    }

    nextBtn.addEventListener('click', () => showScreen(currentIndex + 1));
    prevBtn.addEventListener('click', () => showScreen(currentIndex - 1));

    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowRight') {
            showScreen(currentIndex + 1);
        }
        if (event.key === 'ArrowLeft') {
            showScreen(currentIndex - 1);
        }
    });

    showScreen(0);
});
