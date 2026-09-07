import { fetchJSON } from '../functions/api.js';
import { showFieldError, clearFieldError } from '../functions/formError.js';
import { showToast } from '../functions/toast.js';

export class BlindTestRow {
    /** @type {HTMLElement} */
    #element;

    /** @type {string} */
    #id;

    /** @type {string} */
    #csrfToken;

    /**
     * @param {HTMLElement} element
     */
    constructor(element) {
        this.#element = element;
        this.#id = element.dataset.blindtestId;
        this.#csrfToken = element.dataset.csrfEdit;

        this.#element.querySelectorAll('.js-editable-field').forEach((field) => {
            field.addEventListener('click', () => this.#startEditingField(field));
        });

        const durationInput = this.#element.querySelector('.js-duration-input');
        if (durationInput) {
            durationInput.addEventListener('change', this.#handleDurationChange.bind(this));
        }

        const deleteForm = this.#element.querySelector('.js-ajax-delete-blindtest');
        if (deleteForm) {
            deleteForm.addEventListener('submit', this.#handleDeleteSubmit.bind(this));
        }
    }

    /**
     * @param {HTMLElement} field
     */
    #startEditingField(field) {
        if (field.querySelector('input, textarea')) {
            return;
        }

        const isMultiline = 'description' === field.dataset.field;
        const previousValue = field.textContent.trim();
        const input = document.createElement(isMultiline ? 'textarea' : 'input');
        input.value = previousValue;
        input.className = 'admin-inline-edit-input';

        field.textContent = '';
        field.append(input);
        input.focus();

        input.addEventListener('keydown', (event) => this.#handleEditKeydown(event, field, previousValue, isMultiline));
        input.addEventListener('blur', () => this.#saveField(field, previousValue));
    }

    /**
     * @param {KeyboardEvent} event
     * @param {HTMLElement} field
     * @param {string} previousValue
     * @param {boolean} isMultiline
     */
    #handleEditKeydown(event, field, previousValue, isMultiline) {
        if ('Enter' === event.key && !isMultiline) {
            event.preventDefault();
            event.target.blur();
        }
        if ('Escape' === event.key) {
            field.textContent = previousValue;
        }
    }

    /**
     * @param {HTMLElement} field
     * @param {string} previousValue
     */
    async #saveField(field, previousValue) {
        const input = field.querySelector('input, textarea');
        if (!input) {
            return;
        }

        const fieldName = field.dataset.field;
        const newValue = input.value.trim();
        field.textContent = newValue || previousValue;

        if (newValue === previousValue) {
            return;
        }

        const errorElement = field.parentElement.querySelector('.js-field-error');

        try {
            await fetchJSON(`/api/game/${this.#id}`, {
                method: 'PATCH',
                headers: {'X-CSRF-Token': this.#csrfToken, 'Content-Type': 'application/json'},
                body: JSON.stringify({[fieldName]: newValue}),
            });
            if (errorElement) {
                clearFieldError(field, errorElement);
            }
            showToast('success', 'Modification enregistrée.');
        } catch (error) {
            field.textContent = previousValue;
            const message = await this.#extractErrorMessage(error, 'Impossible d\'enregistrer cette valeur.');
            if (errorElement) {
                showFieldError(field, errorElement, message);
            }
            showToast('error', message);
        }
    }

    /**
     * @param {Event} event
     */
    async #handleDurationChange(event) {
        const input = event.target;
        const newDuration = parseInt(input.value, 10);

        try {
            await fetchJSON(`/api/game/${this.#id}`, {
                method: 'PATCH',
                headers: {'X-CSRF-Token': this.#csrfToken, 'Content-Type': 'application/json'},
                body: JSON.stringify({duration: newDuration}),
            });
            this.#updateTotalDuration(newDuration);
            showToast('success', 'Durée mise à jour.');
        } catch (error) {
            const message = await this.#extractErrorMessage(error, 'Durée invalide (entre 5 et 30 secondes).');
            showToast('error', message);
        }
    }

    /**
     * @param {number} duration
     */
    #updateTotalDuration(duration) {
        const questionsCount = parseInt(this.#element.querySelector('.js-questions-count').textContent, 10) || 0;
        const totalCell = this.#element.querySelector('.js-total-duration');
        totalCell.textContent = `${questionsCount * (duration + 5)}s`;
    }

    /**
     * @param {SubmitEvent} event
     */
    async #handleDeleteSubmit(event) {
        event.preventDefault();
        // Empêche confirm.js (posé plus haut sur la page) de redemander une
        // seconde confirmation en double : on gère ça nous-mêmes ici.
        event.stopPropagation();

        const confirmMessage = event.target.dataset.confirm;
        if (confirmMessage && !window.confirm(confirmMessage)) {
            return;
        }

        const token = event.target.querySelector('input[name="_token"]').value;

        try {
            await fetchJSON(`/api/game/${this.#id}`, {
                method: 'DELETE',
                headers: {'X-CSRF-Token': token},
            });
            this.#element.remove();
            showToast('success', 'Blind test supprimé.');
        } catch (error) {
            console.error('Suppression impossible :', error);
            showToast('error', 'La suppression a échoué.');
        }
    }

    /**
     * @param {Error} error
     * @param {string} fallback
     * @returns {Promise<string>}
     */
    async #extractErrorMessage(error, fallback) {
        try {
            const body = await error.cause.json();
            return body.error || fallback;
        } catch {
            return fallback;
        }
    }
}
