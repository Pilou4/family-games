import { QuestionFieldset } from './components/QuestionFieldset.js';
import { QuestionFieldsetValidator } from './components/QuestionFieldsetValidator.js';
import { BlindTestRow } from './components/BlindTestRow.js';
import { showFieldError, clearFieldError } from './functions/formError.js';
import { showToast } from './functions/toast.js';

let nextQuestionIndex = 0;

document.addEventListener('click', handleAddQuestionClick);
document.addEventListener('submit', handleAdminFormSubmit);
document.addEventListener('input', handleDurationInputChange);
document.addEventListener('blindtest:questions-changed', updateTotalDurationDisplay);

dismissFlashMessages();
loadExistingQuestions();
initBlindTestRows();
updateTotalDurationDisplay();

/**
 * @param {Event} event
 */
function handleDurationInputChange(event) {
    if (event.target.matches('[data-field-name="duration"] input')) {
        updateTotalDurationDisplay();
    }
}

/**
 * Recalcule "Durée du blind test" : nombre de morceaux qui ont vraiment une
 * source (fichier MP3 ou id YouTube) x (durée par extrait + 5s de réponse).
 */
function updateTotalDurationDisplay() {
    const box = document.getElementById('total-duration-box');
    if (!box) {
        return;
    }

    const durationInput = document.querySelector('[data-field-name="duration"] input');
    const duration = durationInput ? parseInt(durationInput.value, 10) || 0 : 0;

    const container = document.getElementById('question-fieldset-container');
    const validQuestionsCount = container
        ? Array.from(container.querySelectorAll('.admin-card--new-question')).filter(hasUsableSource).length
        : 0;

    document.getElementById('total-duration-value').textContent = `${validQuestionsCount * (duration + 5)}s`;
}

/**
 * @param {HTMLElement} fieldsetElement
 * @returns {boolean}
 */
function hasUsableSource(fieldsetElement) {
    const hasMp3 = fieldsetElement.querySelector('.js-field-mp3-file').files.length > 0
        || !!fieldsetElement.querySelector('.js-mp3-audio').getAttribute('src');
    const hasYoutube = '' !== fieldsetElement.querySelector('.js-field-youtube-id').value.trim();

    return hasMp3 || hasYoutube;
}

/**
 * Sur la page liste (/admin/game), branche l'édition en ligne, la durée
 * et la suppression pour chaque ligne du tableau.
 */
function initBlindTestRows() {
    document.querySelectorAll('.js-blindtest-row').forEach((rowElement) => {
        new BlindTestRow(rowElement);
    });
}

/**
 * Sur la page de modification, précharge les morceaux déjà enregistrés
 * dans les mêmes fieldsets dynamiques que la création.
 */
function loadExistingQuestions() {
    const dataElement = document.getElementById('existing-questions-data');
    const container = document.getElementById('question-fieldset-container');
    if (!dataElement || !container) {
        return;
    }

    const existingQuestions = JSON.parse(dataElement.textContent);
    existingQuestions.forEach((questionData) => {
        const fieldset = new QuestionFieldset(nextQuestionIndex, questionData);
        nextQuestionIndex += 1;
        fieldset.appendTo(container);
    });
}

/**
 * @param {MouseEvent} event
 */
function handleAddQuestionClick(event) {
    const button = event.target.closest('.js-add-question-btn');
    if (!button) {
        return;
    }

    const container = document.getElementById('question-fieldset-container');
    if (!container) {
        return;
    }

    const fieldset = new QuestionFieldset(nextQuestionIndex);
    nextQuestionIndex += 1;
    fieldset.appendTo(container);
}

/**
 * @param {SubmitEvent} event
 */
function handleAdminFormSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.classList.contains('admin-form')) {
        return;
    }

    // On ne laisse jamais le navigateur soumettre le formulaire lui-même :
    // ça rechargerait la page et viderait les morceaux ajoutés en JS.
    event.preventDefault();

    if (!validateQuestionFieldsets(form)) {
        return;
    }

    clearBlindTestFieldErrors(form);
    submitAdminForm(form);
}

/**
 * @param {HTMLFormElement} form
 * @returns {boolean} true si tous les fieldsets restants sont valides
 */
function validateQuestionFieldsets(form) {
    const container = form.querySelector('#question-fieldset-container');
    if (!container) {
        return true;
    }

    const requiredFieldNames = getCheckedRequiredFieldNames(form);
    let isValid = true;

    container.querySelectorAll('.admin-card--new-question').forEach((fieldsetElement) => {
        const validator = new QuestionFieldsetValidator(fieldsetElement);

        if (validator.isEmpty()) {
            fieldsetElement.remove();
            return;
        }

        if (!validator.validate(requiredFieldNames)) {
            isValid = false;
        }
    });

    return isValid;
}

/**
 * @param {HTMLFormElement} form
 * @returns {string[]}
 */
function getCheckedRequiredFieldNames(form) {
    const group = form.querySelector('#required-fields-group');
    if (!group) {
        return [];
    }

    return Array.from(group.querySelectorAll('input[type="checkbox"]:checked')).map((checkbox) => checkbox.value);
}

/**
 * @param {HTMLFormElement} form
 */
async function submitAdminForm(form) {
    try {
        const response = await fetch(form.action, {
            method: 'POST',
            headers: {'Accept': 'application/json'},
            body: new FormData(form),
        });
        const data = await response.json();

        if (data.success) {
            window.location.href = data.redirectUrl;
            return;
        }

        displayBlindTestFieldErrors(form, data.errors || {});
        showToast('error', 'Merci de corriger les erreurs indiquées ci-dessous.');
    } catch (error) {
        console.error('Impossible d\'enregistrer le blind test :', error);
        showToast('error', 'Une erreur est survenue, réessaie.');
    }
}

/**
 * @param {HTMLFormElement} form
 * @param {Object<string, string>} errors
 */
function displayBlindTestFieldErrors(form, errors) {
    for (const [fieldName, message] of Object.entries(errors)) {
        const fieldWrapper = form.querySelector(`[data-field-name="${fieldName}"]`);
        if (!fieldWrapper) {
            continue;
        }

        const inputElement = fieldWrapper.querySelector('input, select, textarea');
        const errorElement = fieldWrapper.querySelector('.admin-form-field__error');
        if (inputElement && errorElement) {
            showFieldError(inputElement, errorElement, message);
        }
    }
}

/**
 * @param {HTMLFormElement} form
 */
function clearBlindTestFieldErrors(form) {
    form.querySelectorAll('[data-field-name]').forEach((fieldWrapper) => {
        const inputElement = fieldWrapper.querySelector('input, select, textarea');
        const errorElement = fieldWrapper.querySelector('.admin-form-field__error');
        if (inputElement && errorElement) {
            clearFieldError(inputElement, errorElement);
        }
    });
}

function dismissFlashMessages() {
    document.querySelectorAll('[data-auto-dismiss]').forEach((element) => {
        const delay = parseInt(element.dataset.autoDismiss, 10);
        const timeoutId = setTimeout(() => element.remove(), delay);

        const closeBtn = element.querySelector('.js-close-flash');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(timeoutId);
                element.remove();
            });
        }
    });
}
