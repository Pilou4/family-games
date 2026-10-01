# Système de thèmes visuels

Ce document doit suffire, à lui seul, pour créer ou modifier un thème —
pas besoin d'aller lire le reste du projet avant de commencer. S'il manque
quelque chose une fois que tu as commencé, c'est que ce document a un
trou : corrige-le en même temps que tu codes.

## Le principe en une phrase

**Un thème = 3 fichiers (`{slug}.html.twig`, `{slug}.css`, `{slug}.js`) qui
décrivent TOUS les écrans du jeu, du début à la fin.** Le même triplet est
utilisé tel quel par la prévisualisation admin (`/admin/theme/{slug}/preview`)
et par le vrai jeu (`/game/{id}/play`) — ce n'est pas une "décoration"
posée par-dessus une page commune, c'est le jeu entier pour ce thème.

Ce que la prévisualisation et le vrai jeu ont en commun (navigation, logo,
barre de contrôle musique de la prévisualisation, barre d'admin du vrai
jeu) est fourni automatiquement par le système, **jamais réécrit dans un
thème** — voir la section dédiée plus bas.

## Les 3 fichiers d'un thème

Pour un thème de slug `halloween` :

| Fichier | Rôle |
|---|---|
| `templates/game/themes/halloween.html.twig` | Tous les écrans du thème |
| `assets/styles/themes/halloween.css` | Tout le style, organisé par écran |
| `assets/js/themes/halloween.js` | Animations/sons propres à ce thème (optionnel si le thème n'a besoin d'aucun JS, mais voir plus bas — on en crée quand même un minimal) |

Pas de préfixe `theme-` dans ces noms de fichiers : on est déjà dans un
dossier `themes/`, le préfixe serait redondant. En revanche, la classe CSS
posée sur `<body>` garde son préfixe (`body.theme-halloween`) — c'est un
espace de nommage, pas un nom de fichier.

Ces 3 fichiers ne suffisent pas à faire apparaître le thème : il faut
aussi l'enregistrer (voir "Créer un nouveau thème, étape par étape").

---

## 1. Écrire le fichier `.html.twig`

### Structure générale

Le fichier contient uniquement une suite de `<section>`, une par écran,
rien autour (pas de `<html>`/`<body>`, c'est `include` tel quel par
`templates/admin/theme_preview/show.html.twig` et par
`templates/game/play.html.twig`). Chaque écran est précédé d'un
commentaire Twig qui donne son **numéro de page réel** (celui que voit la
personne qui joue, pas l'ordre technique) et son nom :

```twig
{# ---- Page 2 : Accueil ---- #}
<section class="theme-preview-screen" data-screen="welcome">
    <div class="halloween-welcome">
        <h1 data-game-value="blindtest-name">NOM D'EXEMPLE</h1>
    </div>
</section>
```

Conventions à l'intérieur de chaque écran :
- Une seule div racine par écran, nommée `.{slug}-{nom-ecran}` (ex :
  `.halloween-welcome`), qui porte tout le positionnement de cet écran.
- Les sous-éléments suivent `.{slug}-{nom-ecran}-{partie}` (ex :
  `.halloween-welcome-title`), sans jamais réutiliser un nom de classe
  déjà pris par un autre thème (chaque thème a son propre espace de noms).
- Texte 100% en dur (exemples réalistes, pas des `lorem ipsum`) partout
  SAUF sur les éléments qui portent un attribut `data-game-value` /
  `data-response-key` / `data-rules-point` (voir section 4) — ce sont les
  seuls à être réécrits par le vrai jeu.

### La liste des écrans obligatoires, dans l'ordre

| `data-screen` | Numéro de page réel | Rôle | `data-preview-only` |
|---|---|---|---|
| `presentation` | — (pas un écran du jeu) | Carte de visite du thème, pour nous | `"true"` |
| `welcome` | Page 2 | Accueil, nom du blind test | — |
| `description` | Page "description" | "À propos de ce blind test" | — (voir cas particulier ci-dessous) |
| `rules` | Page 3 | Règles du jeu | — |
| `start` | Page 4 | "C'est parti !" | — |
| `transition` | Page 5 | "Extrait n°X" avant chaque chanson | — |
| `timer` | Page 6 | Chrono + jeu en cours | — |
| `reveal` | Page 7 | Réponse (titre/artiste/année) | — |
| `end` | Page 8 | Fin du blind test | — |
| `thanks` | Page 9 | Écran de remerciement | — |

Attributs à poser sur chaque `<section>` :
- `class="theme-preview-screen"` — toujours, c'est ce qui permet au
  système commun (navigation, changement d'écran) de le reconnaître.
- `data-screen="welcome"` (etc.) — identifiant unique de l'écran, repris
  par tout le JS (commun et celui du thème).
- `data-screen-duration="6500"` — durée d'affichage en millisecondes
  pour les écrans qui s'enchaînent tout seuls (intro : `welcome` à
  `start` ; fin : `end` à `thanks` ; aussi `reveal`). **Optionnel** :
  chaque écran a déjà une durée par défaut (voir
  `DEFAULT_SCREEN_DURATIONS` dans `assets/js/game/state.js`, une valeur
  par type d'écran — `welcome`, `description`, `rules`, `start`,
  `transition`, `reveal`, `end`, `thanks`), posée ici simplement pour que
  TOUS les thèmes aient un rythme cohérent sans que chacun ait à la
  redéfinir. Un thème ne pose `data-screen-duration` sur un écran QUE
  s'il veut une durée différente de ce défaut pour CET écran précis (ex:
  une animation ou un message plus long sur ce thème) — sinon on laisse
  l'attribut absent, le défaut de la page s'applique tout seul. `timer`
  n'a pas d'entrée : il dure le temps réel de la chanson, jamais une
  durée fixe. `presentation` n'en a pas non plus : jamais minuté dans le
  vrai jeu (prévisualisation uniquement).
- `data-preview-only="true"` — uniquement sur `presentation`. Le rend
  visible en prévisualisation (cycle avec les flèches) mais jamais dans le
  vrai jeu.

### Le cas particulier de l'écran "description"

Toujours présent dans le twig, avec un texte d'exemple réaliste en dur.
Aucune condition à écrire dans le thème : le moteur commun
(`assets/js/game/screens.js`) le retire tout seul de la séquence du vrai
jeu si `BlindTest::getDescription()` est vide. En prévisualisation, il
reste toujours visible avec son texte d'exemple.

---

## 2. Écrire le fichier `.css`

### Organisation : un bloc complet par écran, dans l'ordre du twig

```css
/* ==========================================================================
   PAGE 2 : ACCUEIL
   ========================================================================== */

.halloween-welcome {
    /* styles de base */
}

.halloween-welcome-title {
    animation: halloween-title-glow 2s ease-in-out infinite;
}

@keyframes halloween-title-glow {
    /* ... */
}

@media (max-width: 700px) {
    .halloween-welcome-title { font-size: 32px; }
}

/* ==========================================================================
   PAGE 3 : RÈGLES DU JEU
   ========================================================================== */

...
```

**Règle stricte, issue d'une vraie régression qu'on a dû corriger : le
responsive (`@media`) d'une page vit DANS le bloc de cette page, jamais
dans un bloc commun à la fin du fichier.** Ça permet de sélectionner tout
le CSS d'une page (base + animations + responsive) et de la refaire sans
rien casser autour. Seules les règles vraiment globales au thème (pas
propres à un seul écran — ex. le fond général de `<body>`, le décor
flottant permanent) vivent dans un bloc à part, en tête de fichier, avant
le bloc de la page 1.

### Préfixage `body.theme-{slug}`

- **Obligatoire** sur tout sélecteur qui touche un élément du jeu commun à
  tous les thèmes (ex. `body.theme-halloween .game-admin-bar__btn` pour
  accentuer un bouton de la barre d'admin du vrai jeu). Sans ce préfixe,
  la règle s'appliquerait à tous les thèmes.
- **Inutile** sur les classes propres au thème (`.halloween-welcome`,
  etc.) : elles n'existent que dans le HTML de ce thème, rien d'autre ne
  peut les matcher par erreur.

### Animations d'entrée en escalier (plusieurs éléments qui apparaissent l'un après l'autre)

Pattern déjà utilisé plusieurs fois dans les thèmes existants (liste de
règles, blocs de réponse) : une `@keyframes` commune, et un délai différent
par élément via `:nth-child`, déclenché par la classe `.is-active` posée
sur l'écran actif :

```css
.theme-preview-screen[data-screen="rules"].is-active .halloween-rule:nth-child(1) {
    animation: halloween-rule-reveal .7s ease 1.5s forwards;
}
.theme-preview-screen[data-screen="rules"].is-active .halloween-rule:nth-child(2) {
    animation: halloween-rule-reveal .7s ease 1.8s forwards;
}
```

Si le nombre d'éléments peut varier (ex. 2 ou 3 selon les critères cochés,
voir section 4), prévoir une règle `:nth-child(N)` pour CHAQUE position
possible, même si elle n'est utilisée qu'en prévisualisation (en vrai jeu
les éléments masqués sortent du flux, les numéros d'ordre glissent, mais
ça n'a pas d'incidence visible puisqu'un seul délai de plus ou de moins ne
se voit pas).

### Blocs à largeur dynamique (optionnel — seulement si le thème présente déjà ses critères/réponses comme des cases/blocs)

**Règle d'or à ne jamais oublier : on adapte la mécanique au style
existant du thème, jamais l'inverse.** Si un thème affiche ses critères ou
réponses en liste simple (une ligne en dessous de l'autre), elle doit le
rester — ne pas la transformer en cartes/blocs sous prétexte
d'uniformiser avec un autre thème.

Si le thème choisit de présenter plusieurs critères/réponses comme des
blocs côte à côte, ces blocs doivent répartir la largeur disponible tout
seuls selon le nombre réellement affiché : 1 bloc visible = pleine
largeur, 2 blocs = 50% chacun, 3 = 33% chacun. La seule recette qui marche,
en CSS pur, sans JS supplémentaire :

```css
.halloween-reponses {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
    gap: 14px;
}
```

`auto-fit` fait tout le travail : un bloc masqué par `data-rules-point` /
`data-response-container` (qui pose l'attribut HTML `hidden`, donc
`display: none`) sort du calcul de la grille, les blocs restants se
réétalent automatiquement. **Condition impérative : ne jamais poser de
`display` directement sur l'élément qui porte `data-rules-point` /
`data-response-container`** — ça entrerait en conflit avec l'attribut
`hidden` et l'empêcherait de disparaître (c'est le conteneur autour, ou un
enfant, qui peut avoir son propre `display`). Voir
`assets/styles/themes/default.css`
(`.theme-default-rules-points-list` / `.theme-default-reveal-responses`)
pour un exemple qui fonctionne.

---

## 3. Écrire le fichier `.js`

Même avec un thème purement CSS, créer ce fichier minimal (évite un cas
spécial dans le template pour charger un CSS seul) :

```js
import '../../styles/themes/halloween.css';
```

S'il y a des animations/sons à piloter en JS :

```js
import '../../styles/themes/halloween.css';

/**
 * THÈME "HALLOWEEN"
 * ------------------
 * Fonctionne dans 2 contextes, chacun avec sa propre détection :
 * - la prévisualisation (templates/admin/theme_preview) : écoute
 *   'themepreview:screenchange', envoyé par theme-preview.js.
 * - le vrai jeu, une fois ce thème branché dessus : écoute
 *   'game:screenchange', envoyé par assets/js/game/screens.js — même
 *   forme d'événement, donc logique proche, mais avec une vraie source
 *   de vérité (vrai chrono, vraie lecture) au lieu d'un compte à rebours
 *   simulé.
 * Les deux cohabitent sans conflit : chaque partie vérifie sa propre
 * classe sur <body> avant d'agir.
 */

if (document.body.classList.contains('theme-halloween')) {
    initDecor();
    initPreviewHooks();
    initRealGameHooks();
}

/** Éléments décoratifs créés une seule fois, visibles en permanence. */
function initDecor() {
    const container = document.createDocumentFragment();

    for (let i = 1; i <= 6; i += 1) {
        const bat = document.createElement('div');
        // Le JS pose seulement la bonne classe modificatrice — position,
        // couleur, délai, tout est défini dans le CSS (classes --1, --2,
        // ...). Jamais de style écrit ici (voir règle ci-dessous).
        bat.className = `halloween-bat halloween-bat--${i}`;
        container.appendChild(bat);
    }

    document.body.appendChild(container);
}

function initPreviewHooks() {
    if (!document.body.classList.contains('theme-preview')) {
        return;
    }

    document.addEventListener('themepreview:screenchange', (event) => {
        const { key } = event.detail;
        // Réagir au changement d'écran : classes sur <body>, déclencher
        // une animation ponctuelle, etc.
    });
}

function initRealGameHooks() {
    if (!document.body.classList.contains('game-fullscreen')) {
        return;
    }

    document.addEventListener('game:screenchange', (event) => {
        const { key } = event.detail;
        // Même logique que ci-dessus, avec en plus les vraies données
        // (voir section Son plus bas pour la musique).
    });
}
```

### La règle absolue : pas de style écrit en JS

Jamais `element.style.xxx = ...` ni `Object.assign(el.style, {...})` pour
une valeur qui pourrait être une classe CSS fixe (position, couleur,
rotation, délai...). Le JS crée l'élément et pose la bonne classe
modificatrice (`.halloween-bat--1`, `.halloween-bat--2`...), tout le reste
vit dans le CSS.

**Seule exception tolérée :** une valeur recalculée en continu, qui change
plusieurs fois par seconde et ne peut donc pas être une classe fixe —
exemple réel : la combustion d'une bougie sur l'écran `timer`, recalculée
à chaque tick du vrai chrono :

```js
candleEl.style.setProperty('--burn', String(fraction));
```

Voir `createCandleController()` dans `assets/js/themes/anniversaire.js`
pour l'exemple complet, directement réutilisable comme modèle pour toute
décoration synchronisée au chrono réel.

### Synchroniser une décoration sur le vrai chrono (ex : une bougie, une barre de progression maison)

Le chrono réel écrit deux attributs sur l'élément `[data-game-value="timer"]`
à chaque tick (voir `assets/js/game/timer.js`, commun, pas à toucher) :
`data-remaining` (secondes restantes) et `data-duration` (durée totale).
Un thème peut observer ces attributs avec un `MutationObserver` pour
synchroniser sa propre décoration :

```js
const timerValueEl = document.querySelector('[data-screen="timer"] [data-game-value="timer"]');
const observer = new MutationObserver(() => {
    const remaining = parseFloat(timerValueEl.dataset.remaining);
    const duration = parseFloat(timerValueEl.dataset.duration);
    if (!duration || Number.isNaN(remaining)) {
        return;
    }
    // remaining / duration = fraction de temps restant, 1 → 0.
});
observer.observe(timerValueEl, {
    attributes: true,
    attributeFilter: ['data-remaining', 'data-duration'],
});
```

En prévisualisation, il n'y a pas de vrai chrono : simuler un compte à
rebours avec un `setInterval` (voir `initPreviewHooks` dans
`anniversaire.js` pour l'exemple complet, bougie comprise).

---

## 4. Le contrat des champs de fusion ("merge fields")

Un thème n'écrit jamais une vraie donnée en dur dans son HTML. Il pose des
attributs `data-*` sur ses propres éléments, avec un texte d'exemple
réaliste comme contenu — ce texte s'affiche tel quel en prévisualisation,
et c'est lui que le moteur commun (`assets/js/game/screens.js`) remplace
par la vraie valeur en vrai jeu. **Les noms ci-dessous sont fixes, ne pas
en inventer d'autres.**

### `data-game-value="clé"` — une valeur simple à afficher

| Clé | Écran | Valeur réelle | Exemple à mettre dans le twig |
|---|---|---|---|
| `blindtest-name` | `welcome` | Nom du blind test | `BIRTHDAY GLOW` |
| `description` | `description` | `BlindTest::getDescription()` | Un paragraphe d'exemple |
| `question-count` | `rules` | Nombre de chansons | `9` |
| `duration` | `presentation`, `rules` | Secondes par extrait | `15` |
| `track-number` | `transition` | Numéro de l'extrait en cours — **sans zéro devant** (`1`, pas `01`) | `1` |
| `timer` | `timer` | Secondes restantes, mis à jour chaque seconde pendant la vraie lecture, avec `data-remaining`/`data-duration` en plus (voir section 3) | `15` |

```twig
<div class="halloween-truc" data-game-value="blindtest-name">NOM D'EXEMPLE</div>
```

Cas particulier : `blindtest-name` est rempli **lettre par lettre**
(chaque lettre dans son propre `<span>`, voir `fillLetterAnimatedValue`
dans `screens.js`) — utile si le thème anime les lettres individuellement
en CSS (délai d'apparition croissant). Si l'élément porte
`data-letter-class="ma-classe-lettre"`, chaque `<span>` généré reçoit
cette classe, à utiliser dans le CSS pour styliser/animer chaque lettre.

### `data-response-key` / `data-response-container` — l'écran "reveal"

- `data-response-key="title"` : élément dont le texte devient le titre du
  morceau. **Toujours affiché**, quels que soient les critères cochés sur
  le blind test (comportement actuel du moteur — pas encore conditionné
  par "Titre" coché ou non, à garder en tête si ça doit changer un jour).
- `data-response-key="artist"` / `="year"` : élément dont le texte devient
  l'artiste / l'année.
- `data-response-container="artist"` / `="year"` : élément qui doit
  **disparaître entièrement** en vrai jeu si ce critère n'est pas coché
  dans "Ce qu'il faut deviner" pour ce blind test. À poser sur l'élément
  qui doit disparaître — en général l'enveloppe autour du
  `data-response-key` correspondant (label + valeur), pas forcément le
  même élément que `data-response-key` lui-même.

```twig
<div class="halloween-reponse" data-response-container="artist">
    <span class="halloween-reponse-label">ARTISTE</span>
    <span class="halloween-reponse-valeur" data-response-key="artist">NOM D'ARTISTE</span>
</div>
```

### `data-rules-point` — l'écran "rules"

Même mécanique que `data-response-container`, pour l'écran des règles :
un élément avec `data-rules-point="title"` / `="artist"` / `="year"`
disparaît en vrai jeu si ce critère n'est pas coché.

```twig
<li class="halloween-regle" data-rules-point="artist">
    <span><strong>1 point</strong> pour l'artiste</span>
</li>
```

### Comportement prévisualisation vs vrai jeu — très important

- En **prévisualisation**, tous les `data-rules-point` et
  `data-response-container` restent **toujours visibles** (le masquage ne
  tourne que dans le vrai jeu) : normal, pratique pour voir et styliser
  chaque cas (1, 2 ou 3 critères) sans avoir à créer un vrai blind test.
- En **vrai jeu**, seuls ceux dont le critère est réellement coché restent
  visibles, et l'écran `description` est sauté s'il n'y a pas de
  description.

---

## 5. Le son : musique d'ambiance, son de "c'est parti"

Deux contextes bien distincts, à ne pas confondre :

### En prévisualisation admin

Il existe une **barre de contrôle musique commune à tous les thèmes**
(lecture/pause, volume, progression), affichée automatiquement par
`templates/admin/theme_preview/show.html.twig` — **un thème n'a rien à
écrire pour l'avoir, et ne doit surtout pas en recréer une à lui**. Sa
logique vit dans `assets/js/theme-preview-player.js`, son style dans
`assets/styles/theme-preview.css`. Elle est toujours affichée, même sans
musique (visible mais grisée/désactivée).

Pour donner un son à un thème en prévisualisation :

1. Déposer le(s) fichier(s) dans `public/audio/` (pas de convention de
   nommage automatique à ce jour — c'est une ligne explicite à ajouter,
   volontairement, pour ne jamais avoir un son d'un thème qui s'active par
   erreur sur un autre).
2. Dans `templates/admin/theme_preview/show.html.twig`, ajouter le slug
   aux deux lignes `{% set musicSrc = ... %}` / `{% set startSrc = ... %}` :
   ```twig
   {% set musicSrc = slug == 'halloween' ? 'audio/halloween-music.mp3' : (slug == 'anniversaire' ? 'audio/birthday-music.mp3' : null) %}
   {% set startSrc = slug == 'halloween' ? 'audio/halloween-start.mp3' : (slug == 'anniversaire' ? 'audio/birthday-start.mp3' : null) %}
   ```
3. Rien d'autre à faire : `theme-preview-player.js` détecte tout seul si
   la source existe et active la barre en conséquence (désactivée si le
   fichier manque/échoue à charger).

La barre joue la musique d'ambiance sur les écrans `welcome`, `rules` et
`start` (liste `AMBIENT_SCREENS` dans `theme-preview-player.js`, commune à
tous les thèmes), et joue le son "start" une fois à l'arrivée sur l'écran
`start`.

### En vrai jeu

Il n'y a **pas** de barre de contrôle musique pour les spectateurs dans le
vrai jeu (seulement la barre d'admin, réservée à l'hôte : précédent/pause/
suivant/enregistrer). Chaque thème qui veut de la musique en vrai jeu crée
**lui-même** son propre `<audio>` en JS, dans `initRealGameHooks()` —
c'est le seul endroit où un thème est autorisé à créer un élément
`<audio>` :

```js
function initRealGameHooks() {
    if (!document.body.classList.contains('game-fullscreen')) {
        return;
    }

    const music = document.createElement('audio');
    music.src = '/audio/halloween-music.mp3';
    music.loop = true;
    music.volume = 0.18;
    music.preload = 'auto';
    document.body.appendChild(music);

    const AMBIENT_SCREENS = ['welcome', 'rules', 'start'];

    document.addEventListener('game:screenchange', (event) => {
        const { key } = event.detail;
        if (AMBIENT_SCREENS.includes(key)) {
            music.play().catch(() => {});
        } else {
            music.pause();
        }
    });
}
```

Cet `<audio>` est automatiquement mis en pause/repris par le système
commun de pause du jeu (`pauseAllAudioElements()`/`resumeAllAudioElements()`
dans `assets/js/game/game.js`, qui cible génériquement tous les `<audio>`
de la page) — rien à faire de plus pour que la pause fonctionne.

### La voix (prévu, pas encore branché)

Il existe déjà, dans le moteur commun, un emplacement réservé pour une
piste de voix/narration séparée de la musique : l'élément
`<audio id="game-voice-audio">` (voir `templates/game/play.html.twig`,
`assets/js/game/dom.js`, et `assets/js/game/recording.js` qui mélange
musique + voix dans l'enregistrement vidéo). **Aujourd'hui cet élément
existe mais n'a jamais de `src` : la fonctionnalité "voix" n'est pas encore
implémentée.**

Quand elle le sera, le plan est qu'elle soit gérée comme la musique de
prévisualisation : **via la barre de contrôle commune, pas par chaque
thème individuellement**. Un thème ne doit donc :
- jamais créer son propre élément de voix,
- jamais écrire dans `#game-voice-audio` directement,

tant que cette page n'a pas été mise à jour avec le contrat exact (quand
la fonctionnalité sera reposée, cette section sera complétée avec la
marche à suivre précise — en attendant, demander avant de bricoler quoi
que ce soit autour de la voix).

---

## 6. Ce qui est commun à tous les thèmes — inventaire complet, à ne jamais recréer

| Élément | Où il vit | À quoi il sert |
|---|---|---|
| `#game-corner-logo` / `.game-corner-logo` | `assets/js/corner-logo.js` + bloc "LOGO PERMANENT" dans `assets/styles/theme-preview.css` | Logo en bas à droite, apparaît avec une animation dès qu'on quitte l'écran `presentation`, reste jusqu'à la fin |
| Navigation de la prévisualisation (flèches, compteur) | `assets/js/theme-preview.js` | Boutons précédent/suivant + clavier, cycle les écrans en prévisualisation |
| Barre de contrôle musique (prévisualisation uniquement) | markup dans `templates/admin/theme_preview/show.html.twig`, logique dans `assets/js/theme-preview-player.js`, style dans `assets/styles/theme-preview.css` | Lecture/pause, volume, progression — voir section 5 |
| `#game-admin-bar` et ses boutons (`#game-prev-btn`, `#game-pause-btn`, `#game-next-btn`, `#game-record-btn`) | `assets/js/game/game.js` | Barre de contrôle de l'hôte dans le vrai jeu (précédent/pause/suivant/enregistrer) |
| `#game-audio` | `assets/js/game/dom.js`, `playback.js` | Lecture des morceaux mp3 en vrai jeu |
| `#game-voice-audio` | `assets/js/game/dom.js`, `recording.js` | Réservé pour la voix (voir section 5) |
| `#game-tracks-data` | `assets/js/game/state.js` | Données JSON des morceaux, lues au chargement |

Un thème peut accentuer visuellement ces éléments (`body.theme-halloween
.game-admin-bar__btn--start { ... }`, par exemple), mais ne doit jamais ni
les recréer, ni changer leur structure/ID, ni appeler une fonction du
moteur commun depuis son propre JS.

---

## Créer un nouveau thème, étape par étape

Exemple avec un thème "Halloween" (slug `halloween`) :

1. **Créer les 3 fichiers** décrits plus haut, en suivant les sections 1 à 5
   (10 écrans dans le twig, CSS organisé par page avec son responsive
   co-localisé, JS avec la garde + les 2 hooks si besoin).
2. **Enregistrer le point d'entrée JS**, dans `importmap.php` :
   ```php
   'halloween' => ['path' => './assets/js/themes/halloween.js', 'entrypoint' => true],
   ```
3. **Déclarer le thème comme disponible pour le vrai jeu**, dans
   `src/Controller/GameController.php` :
   ```php
   private const AVAILABLE_THEME_SLUGS = [
       'default',
       'anniversaire',
       'halloween',
   ];
   ```
   Sans cette ligne, le vrai jeu retombe sur "Défaut" même si le thème
   existe en admin et a ses fichiers — la prévisualisation, elle,
   fonctionne dès que le fichier twig existe, indépendamment de cette
   liste.
4. **Créer le thème en admin** : `/admin/theme` → "Nouveau thème" → nom
   "Halloween", slug `halloween`. Il apparaît alors dans le menu déroulant
   "Thème visuel" de chaque blind test, et sa prévisualisation
   (`/admin/theme/halloween/preview`) est disponible immédiatement.
5. **Vérifier avant de livrer** (voir checklist ci-dessous).

### Checklist de vérification avant de livrer un thème

- [ ] Les 10 écrans (`presentation` à `thanks`) sont présents, dans
      l'ordre, avec les bons `data-screen`.
- [ ] `presentation` a bien `data-preview-only="true"`.
- [ ] Chaque champ dynamique utilise le bon nom exact (section 4), pas de
      faute de frappe (`data-game-value`, pas `data-gamevalue` ou
      `data-value`).
- [ ] Aucun `display` posé sur un élément qui porte `data-rules-point`/
      `data-response-container` (casserait le masquage, voir section 2).
- [ ] Aucun `element.style.xxx = ...` en JS, sauf l'exception tolérée
      (valeur recalculée en continu).
- [ ] Chaque `@media` est dans le bloc CSS de sa page, pas dans un bloc
      commun en fin de fichier.
- [ ] Le fichier JS a bien la garde `if (document.body.classList.contains('theme-{slug}'))`
      en premier.
- [ ] Accolades CSS équilibrées (`grep -o '{' fichier.css | wc -l` doit
      égaler `grep -o '}' fichier.css | wc -l`).
- [ ] `node --check assets/js/themes/{slug}.js` et
      `php -l templates/game/themes/{slug}.html.twig` passent sans erreur.
- [ ] Prévisualisation testée dans le navigateur, écran par écran, avec
      les flèches — y compris en largeur mobile (réduire la fenêtre).

---

## Ce qu'il ne faut jamais faire dans un thème

- Écrire un style via JS (`element.style.xxx = ...` ou
  `Object.assign(el.style, {...})`) pour une valeur qui pourrait être une
  classe CSS fixe. Seule exception : une valeur recalculée en continu
  (section 3).
- Dupliquer la navigation, le logo, la barre de musique de prévisualisation
  ou la barre d'admin du vrai jeu — ils sont communs (section 6).
- Créer un `<audio>` ailleurs que dans `initRealGameHooks()` (vrai jeu) ou
  en dehors du mécanisme commun (prévisualisation, section 5).
- Toucher `#game-voice-audio` directement (réservé, pas encore branché).
- Changer le style visuel existant d'un thème pour satisfaire une règle
  commune (largeur dynamique, etc.) — c'est la règle qui s'adapte au
  thème, jamais l'inverse.
- Écrire une vraie donnée (nom, nombre de chansons, réponse...) en dur :
  toujours passer par le contrat de la section 4.
- Mettre du responsive (`@media`) ailleurs que dans le bloc CSS de la page
  concernée.
- Modifier `templates/game/play.html.twig`,
  `templates/admin/theme_preview/show.html.twig` ou tout fichier JS/CSS
  commun pour les besoins d'un seul thème.

## Ce qui est totalement libre

Couleurs, polices, dégradés, ombres, images de fond, animations CSS,
structure HTML propre au thème à l'intérieur de chaque écran, éléments
décoratifs ajoutés en JS, disposition (liste simple ou grille de blocs),
nombre et nom des classes propres au thème — tant que les 10 écrans et le
contrat de champs de fusion (section 4) sont respectés.
