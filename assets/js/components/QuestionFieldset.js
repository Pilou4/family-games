import { cloneTemplate } from '../functions/dom.js';

export class QuestionFieldset {
    /** @type {HTMLElement} */
    #element;

    /** @type {string|null} */
    #objectUrl = null;

    /**
     * @param {number} index
     * @param {Object|null} initialData Données d'un morceau existant (édition), ou null (création)
     */
    constructor(index, initialData = null) {
        this.#element = this.#build(index);
        if (initialData) {
            this.#fill(initialData);
        }
    }

    /**
     * @param {HTMLElement} container
     */
    appendTo(container) {
        container.append(this.#element);
    }

    /**
     * @param {number} index
     * @returns {HTMLElement}
     */
    #build(index) {
        const fragment = cloneTemplate('question-fieldset-template');
        const element = fragment.querySelector('.admin-card--new-question');

        this.#applyFieldNames(element, index);

        element.querySelector('.js-field-source').addEventListener('change', this.#handleSourceChange.bind(this));
        element.querySelector('.js-field-mp3-file').addEventListener('change', this.#handleMp3FileChange.bind(this));
        element.querySelector('.js-field-youtube-id').addEventListener('input', this.#handleYoutubeIdInput.bind(this));
        element.querySelector('.js-use-current-time-btn').addEventListener('click', this.#handleUseCurrentTime.bind(this));
        element.querySelector('.js-open-youtube-modal-btn').addEventListener('click', this.#handleOpenYoutubeModal.bind(this));
        element.querySelector('.js-close-youtube-dialog-btn').addEventListener('click', this.#handleCloseYoutubeModal.bind(this));
        element.querySelector('.js-remove-question-btn').addEventListener('click', this.#handleRemove.bind(this));
        element.querySelector('.js-move-up-btn').addEventListener('click', () => this.#move(-1));
        element.querySelector('.js-move-down-btn').addEventListener('click', () => this.#move(1));

        return element;
    }

    /**
     * @param {HTMLElement} element
     * @param {number} index
     */
    #applyFieldNames(element, index) {
        const prefix = `questions[${index}]`;

        element.querySelector('.js-field-id').name = `${prefix}[id]`;
        element.querySelector('.js-field-title').name = `${prefix}[title]`;
        element.querySelector('.js-field-artist').name = `${prefix}[artist]`;
        element.querySelector('.js-field-year').name = `${prefix}[year]`;
        element.querySelector('.js-field-source').name = `${prefix}[source]`;
        element.querySelector('.js-field-youtube-id').name = `${prefix}[youtubeId]`;
        element.querySelector('.js-field-mp3-file').name = `${prefix}[mp3File]`;
        element.querySelector('.js-field-start-time').name = `${prefix}[startTime]`;
    }

    /**
     * Préremplit le fieldset avec un morceau existant (mode édition).
     * @param {{id: number, title: string, artist: string, year: ?number, source: string, youtubeId: ?string, mp3Path: ?string, startTime: number}} data
     */
    #fill(data) {
        this.#element.querySelector('.js-field-id').value = data.id;
        this.#element.querySelector('.js-field-title').value = data.title || '';
        this.#element.querySelector('.js-field-artist').value = data.artist || '';
        this.#element.querySelector('.js-field-year').value = data.year || '';
        this.#element.querySelector('.js-field-start-time').value = data.startTime || 0;
        this.#element.querySelector('.js-field-source').value = data.source;

        // D'abord la mise à jour de l'affichage selon la source (elle cache
        // les 2 lecteurs par défaut), ENSUITE on montre le bon — sinon ce
        // dernier écrase ce qu'on vient d'afficher.
        this.#handleSourceChange();

        if ('youtube' === data.source) {
            this.#element.querySelector('.js-field-youtube-id').value = data.youtubeId || '';
            this.#element.querySelector('.js-youtube-preview').hidden = !data.youtubeId;
        } else if (data.mp3Path) {
            this.#element.querySelector('.js-mp3-audio').src = `/${data.mp3Path}`;
            this.#element.querySelector('.js-mp3-preview').hidden = false;
            const fileInputText = this.#element.querySelector('.js-file-input-text');
            fileInputText.textContent = data.mp3Path.split('/').pop();
            fileInputText.classList.add('question-fieldset__file-input__text--filled');
        }

        this.#notifyChanged();
    }

    #handleSourceChange() {
        const isMp3 = this.#element.querySelector('.js-field-source').value === 'mp3';

        this.#element.querySelector('.js-field-youtube-wrapper').hidden = isMp3;
        this.#element.querySelector('.js-field-mp3-wrapper').hidden = !isMp3;
        this.#element.querySelector('.js-mp3-preview').hidden = true;
        this.#element.querySelector('.js-youtube-preview').hidden = true;
    }

    /**
     * @param {Event} event
     */
    #handleMp3FileChange(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        if (this.#objectUrl) {
            URL.revokeObjectURL(this.#objectUrl);
        }
        this.#objectUrl = URL.createObjectURL(file);

        const audioEl = this.#element.querySelector('.js-mp3-audio');
        audioEl.src = this.#objectUrl;

        this.#element.querySelector('.js-mp3-preview').hidden = false;
        const fileInputText = this.#element.querySelector('.js-file-input-text');
        fileInputText.textContent = file.name;
        fileInputText.classList.add('question-fieldset__file-input__text--filled');
        this.#notifyChanged();
    }

    /**
     * @param {Event} event
     */
    #handleYoutubeIdInput(event) {
        const youtubeId = event.target.value.trim();

        this.#element.querySelector('.js-youtube-preview').hidden = '' === youtubeId;
        this.#notifyChanged();
    }

    #handleOpenYoutubeModal() {
        const youtubeId = this.#element.querySelector('.js-field-youtube-id').value.trim();
        if ('' === youtubeId) {
            return;
        }

        this.#element.querySelector('.js-youtube-iframe').src = `https://www.youtube.com/embed/${youtubeId}`;
        this.#element.querySelector('.js-youtube-dialog').showModal();
    }

    #handleCloseYoutubeModal() {
        this.#element.querySelector('.js-youtube-iframe').src = '';
        this.#element.querySelector('.js-youtube-dialog').close();
    }

    #handleUseCurrentTime() {
        const audioEl = this.#element.querySelector('.js-mp3-audio');
        this.#element.querySelector('.js-field-start-time').value = Math.floor(audioEl.currentTime);
    }

    #handleRemove() {
        if (this.#objectUrl) {
            URL.revokeObjectURL(this.#objectUrl);
        }
        const container = this.#element.parentElement;
        this.#element.remove();
        if (container) {
            renumberQuestionFieldsets(container);
        }
        this.#notifyChanged();
    }

    /**
     * @param {1|-1} direction
     */
    #move(direction) {
        const sibling = 1 === direction
            ? this.#element.nextElementSibling
            : this.#element.previousElementSibling;

        if (!sibling) {
            return;
        }

        if (1 === direction) {
            sibling.after(this.#element);
        } else {
            sibling.before(this.#element);
        }

        renumberQuestionFieldsets(this.#element.parentElement);
    }

    /**
     * Prévient le reste de la page (ex. le calcul de durée totale) qu'un
     * morceau vient de gagner ou perdre sa source (fichier/id YouTube).
     */
    #notifyChanged() {
        document.dispatchEvent(new CustomEvent('blindtest:questions-changed'));
    }
}

/**
 * Remet à jour l'étiquette "Extrait n°X" de chaque fieldset selon son
 * ordre actuel dans le conteneur (après ajout, suppression ou déplacement).
 * @param {HTMLElement} container
 */
export function renumberQuestionFieldsets(container) {
    container.querySelectorAll('.admin-card--new-question').forEach((fieldsetElement, index) => {
        const indexEl = fieldsetElement.querySelector('.js-field-index');
        if (indexEl) {
            indexEl.textContent = `Extrait n°${index + 1}`;
        }
    });
}
