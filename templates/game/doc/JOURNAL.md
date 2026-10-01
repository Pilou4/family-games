# Blind Test — Description du jeu et journal des modifications

Dernière mise à jour : 2026-09-30

## 1. Description du jeu

Le jeu est un Symfony/Twig sans framework JS (PHP/Twig/Vanilla JS/CSS uniquement). Chaque thème visuel
(ex: "anniversaire") est **un seul fichier Twig** :
`templates/game/themes/{slug}.html.twig`

Ce fichier contient 9 écrans, chacun une `<section data-screen="...">` :

| Écran (`data-screen`) | Rôle |
| --- | --- |
| `presentation` | Écran d'attente affiché avant le premier clic sur "Lecture" (exclu du vrai déroulé du jeu via `data-preview-only="true"`) |
| `welcome` | Écran d'accueil du jeu, affiché juste après le clic sur "Lecture" — affiche le vrai nom du blind test |
| `rules` | Règles du jeu |
| `start` | "C'est parti" |
| `transition` | "Extrait n°..." entre deux morceaux |
| `timer` | Chrono + bougie pendant l'écoute d'un extrait |
| `reveal` | Réponse (titre / artiste / année) |
| `end` | "Bravo à tous" — fin du blind test |
| `thanks` | "Merci" — écran de conclusion |

Ce même fichier Twig est utilisé à l'identique par la prévisualisation admin et par le vrai jeu (aucune
duplication de markup entre les deux).

### Mécanique JS (`assets/js/game/`)

- `dom.js` : références aux éléments du DOM (boutons, zone de jeu, etc.)
- `state.js` : état global du jeu (morceau courant, pause, etc.) + données injectées par Twig (nom du
  blind test, nombre de questions, durée, champs requis)
- `screens.js` : affichage des écrans, remplissage des valeurs dynamiques (`data-game-value`),
  enchaînement de l'intro (`welcome` → `rules` → `start`) et de la fin (`end` → `thanks`)
- `timer.js` : décompte du temps restant sur un extrait
- `playback.js` : lecture des morceaux (MP3 ou YouTube)
- `pausable.js` : minuteurs qui peuvent être mis en pause/repris
- `recording.js` : enregistrement vidéo de la partie
- `game.js` : point d'entrée, boutons de la barre de contrôle (précédent / pause-lecture / suivant /
  enregistrer)

### Attributs Twig utilisés par le JS (contrat à respecter dans chaque thème)

- `data-screen="..."` : identifie chaque écran
- `data-preview-only="true"` : écran visible seulement en prévisualisation admin, exclu du vrai jeu
- `data-screen-duration="Xms"` : durée d'affichage avant passage automatique à l'écran suivant (5000ms
  par défaut si absent)
- `data-game-value="cle"` : élément dont le texte est rempli dynamiquement par le JS (ex: `blindtest-name`,
  `duration`, `timer`, `track-number`, `question-count`)
- `data-response-key="titre|artist|year|extra"` et `data-response-container="..."` : cases de réponse sur
  l'écran `reveal`

## 2. Journal des modifications de cette session

### Fichiers modifiés

| Fichier | Ce qui a changé |
| --- | --- |
| `assets/js/game/dom.js` | Reconstruit pour pointer vers les vrais id du DOM (`game`, `game-screens`, `game-admin-bar`, etc.) |
| `assets/js/game/game.js` | Premier clic = démarrage du jeu (pas d'auto-play) ; pause met en pause tout le son de la page (y compris la musique du thème) et toutes les animations CSS ; icônes play/pause inversées puis corrigées ; verrou anti double-déclenchement sur les boutons précédent/suivant et les raccourcis clavier (un clic ne peut plus faire sauter plusieurs écrans d'un coup) |
| `assets/js/game/screens.js` | `showScreen()` rendu idempotent (ne rejoue plus l'animation d'entrée en double) ; navigation avance/recul étendue à la séquence de fin (`end` → `thanks`), elle ne fonctionnait qu'en introduction avant |
| `assets/js/game/recording.js` | Codec vidéo VP8 + bitrate 8 Mbps au lieu de VP9/25 Mbps par défaut (l'encodage en temps réel saturait le CPU et faisait ramer l'affichage pendant l'enregistrement) |
| `assets/styles/game.css` | La barre de contrôle et l'en-tête se masquent bien pendant l'enregistrement (raccourcis clavier Espace/flèches/R pour piloter le jeu sans qu'elle soit visible à l'écran) |
| `assets/styles/themes/theme-anniversaire.css` | Cases de réponse qui s'étirent pour remplir toute la largeur quel que soit le nombre de cases affichées ; espacement de la page "Merci" réajusté après suppression du petit label en double |
| `templates/game/themes/anniversaire.html.twig` | Page de présentation exclue du déroulé réel du jeu (`data-preview-only`) tout en restant l'écran d'attente avant clic ; nom du blind test affiché sur l'écran d'accueil (après clic Lecture) plutôt que sur la présentation ; logo en double supprimé ; attributs `data-game-value` manquants remis sur le chrono, la durée et le numéro de morceau ; textes "OPTIONNEL", "le morceau continue pendant la réponse", "PLACE AU DERNIER MESSAGE" et le "MERCI" en double supprimés ; icônes ballon SVG pour les numéros de règles |
| `public/images/icones/rule-balloon.svg` | Nouvelle icône ballon (dégradé doré) utilisée via `inline_svg()` sur l'écran des règles |

### Bugs corrigés, avec la cause exacte

- **Pause qui ne changeait qu'une fois** : dans `game.js`, les icônes play/pause étaient inversées.
- **Chrono figé sur 15, bougie immobile** : il manquait `data-game-value="timer"` sur le chiffre du
  chrono dans le twig — sans lui, ni le JS (`timer.js`) ni la bougie (`theme-anniversaire.js`) ne
  pouvaient le mettre à jour.
- **"15" au lieu de "10" sur la page d'accueil** : même cause, `data-game-value="duration"` manquant.
- **Avance/recul qui semblaient ne rien faire** : le numéro de morceau sur l'écran de transition n'avait
  pas `data-game-value="track-number"`, il restait bloqué sur "01".
- **Avance/recul cassés à partir de "bravo à tous"** : la séquence de fin n'exposait pas les mêmes
  actions que l'introduction. Unifiée sur le même mécanisme.
- **Un clic sur "suivant" depuis "C'est parti" faisait sauter directement jusqu'à "Merci"** (et pareil en
  arrière) : un même clic pouvait déclencher deux fois l'action d'avance en quelques millisecondes,
  ce qui faisait avancer de plusieurs écrans d'un coup. Un verrou empêche maintenant un second
  déclenchement tant que l'écran précédent n'a pas fini de s'afficher.
- **Cases de réponse avec un espace vide** : la grille CSS était figée à 3 colonnes même quand 1 ou 2
  cases seulement étaient affichées. Passée en largeur automatique.
- **Style de la page "Merci" décalé** : la suppression du petit label "MERCI" en double avait aussi
  supprimé l'espace qu'il réservait au-dessus du titre. Espacement restauré.

### À tester

- [ ] Clic sur Lecture : icône passe bien en pause, reclic remet en lecture
- [ ] Pause coupe bien le chrono, la musique du thème et toutes les animations ; reprise relance tout au même point
- [ ] Avance/recul : un seul écran à la fois, y compris juste après "C'est parti" et entre "bravo à tous" et "merci"
- [ ] Chrono affiche la vraie durée configurée et décompte, bougie brûle en même temps
- [ ] Page d'accueil affiche la bonne durée
- [ ] Numéro de morceau change bien sur l'écran de transition à chaque avance
- [ ] Cases de réponse remplissent toute la largeur sans espace vide
- [ ] Page "Merci" : un seul "MERCI", espacement correct
- [ ] Enregistrement : fluide, barre de contrôle invisible à l'écran mais pilotable au clavier (Espace/flèches/R)
