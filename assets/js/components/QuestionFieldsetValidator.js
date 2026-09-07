import { showFieldError, clearFieldError } from '../functions/formError.js';

// Correspondance entre le nom d'un critère (valeur de la case à cocher côté
// blind test, ex. "title") et le sélecteur du champ correspondant sur un
// morceau. Si un nouveau critère est ajouté côté formulaire (ex. "genre"),
// il suffit d'ajouter une ligne ici avec le même nom.
const REQUIRED_FIELD_SELECTORS = {
    title: '.js-field-title',
    artist: '.js-field-artist',
    year: '.js-field-year',
};

export class QuestionFieldsetValidator {
    /** @type {HTMLElement} */
    #element;

    /**
     * @param {HTMLElement} element
     */
    constructor(element) {
        this.#element = element;
    }

    /**
     * @returns {boolean} true si le fieldset est entièrement vide (à retirer silencieusement, pas une erreur)
     */
    isEmpty() {
        return '' === this.#value('.js-field-title')
            && '' === this.#value('.js-field-artist')
            && '' === this.#value('.js-field-year')
            && '' === this.#value('.js-field-youtube-id')
            && 0 === this.#files('.js-field-mp3-file').length;
    }

    /**
     * @param {string[]} requiredFieldNames Les critères cochés au niveau du blind test (ex. ['title', 'year'])
     * @returns {boolean} true si valide
     */
    validate(requiredFieldNames) {
        this.#clearErrors();

        let isValid = true;

        requiredFieldNames.forEach((fieldName) => {
            const selector = REQUIRED_FIELD_SELECTORS[fieldName];
            if (!selector) {
                return;
            }

            if ('' === this.#value(selector)) {
                this.#showError(selector, 'Ce champ est obligatoire pour ce blind test.');
                isValid = false;
            }
        });

        const year = this.#value('.js-field-year');
        if (year && !/^\d{4}$/.test(year)) {
            this.#showError('.js-field-year', 'L\'année doit comporter exactement 4 chiffres.');
            isValid = false;
        }

        const source = this.#value('.js-field-source');

        if ('youtube' === source && '' === this.#value('.js-field-youtube-id')) {
            this.#showError('.js-field-youtube-id', 'L\'identifiant YouTube est obligatoire pour cette source.');
            isValid = false;
        }

        if ('mp3' === source && 0 === this.#files('.js-field-mp3-file').length && !this.#hasExistingMp3()) {
            this.#showError('.js-field-mp3-file', 'Le fichier MP3 est obligatoire pour cette source.');
            isValid = false;
        }

        return isValid;
    }

    /**
     * @returns {boolean} true si un MP3 déjà enregistré est associé à ce morceau (édition)
     */
    #hasExistingMp3() {
        const src = this.#element.querySelector('.js-mp3-audio').getAttribute('src');
        return !!src;
    }

    /**
     * @param {string} selector
     * @returns {string}
     */
    #value(selector) {
        return this.#element.querySelector(selector).value.trim();
    }

    /**
     * @param {string} selector
     * @returns {FileList}
     */
    #files(selector) {
        return this.#element.querySelector(selector).files;
    }

    /**
     * @param {string} selector
     * @param {string} message
     */
    #showError(selector, message) {
        const inputElement = this.#element.querySelector(selector);
        const errorElement = inputElement.closest('.question-fieldset__field').querySelector('.question-fieldset__error');
        showFieldError(inputElement, errorElement, message);
    }

    #clearErrors() {
        this.#element.querySelectorAll('.question-fieldset__field').forEach((fieldElement) => {
            const inputElement = fieldElement.querySelector('input, select');
            const errorElement = fieldElement.querySelector('.question-fieldset__error');
            if (inputElement && errorElement) {
                clearFieldError(inputElement, errorElement);
            }
        });
    }
}
