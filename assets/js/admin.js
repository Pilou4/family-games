import { QuestionFieldset, renumberQuestionFieldsets } from './components/QuestionFieldset.js';
import { QuestionFieldsetValidator } from './components/QuestionFieldsetValidator.js';
import { BlindTestRow } from './components/BlindTestRow.js';
import { showFieldError, clearFieldError } from './functions/formError.js';
import { showToast } from './functions/toast.js';

let nextQuestionIndex = 0;
let draggedFieldset = null;

document.addEventListener('click', handleAddQuestionClick);
document.addEventListener('submit', handleAdminFormSubmit);
document.addEventListener('input', handleDurationInputChange);
document.addEventListener('blindtest:questions-changed', updateTotalDurationDisplay);
document.addEventListener('dragstart', handleQuestionDragStart);
document.addEventListener('dragover', handleQuestionDragOver);
document.addEventListener('dragend', handleQuestionDragEnd);

dismissFlashMessages();
loadExistingQuestions();
initBlindTestRows();
initThemeSlugAutofill();
updateTotalDurationDisplay();

/**
 * @param {DragEvent} event
 */
function handleQuestionDragStart(event) {
    const card = event.target.closest('.admin-card--new-question');
    if (!card || !event.target.closest('.question-fieldset__drag-handle')) {
        return;
    }
    draggedFieldset = card;
    event.dataTransfer.effectAllowed = 'move';
    card.classList.add('is-dragging');
}

/**
 * @param {DragEvent} event
 */
function handleQuestionDragOver(event) {
    if (!draggedFieldset) {
        return;
    }
    const card = event.target.closest('.admin-card--new-question');
    if (!card || card === draggedFieldset) {
        return;
    }
    event.preventDefault();

    const rect = card.getBoundingClientRect();
    const isAfter = event.clientY - rect.top > rect.height / 2;
    if (isAfter) {
        card.after(draggedFieldset);
    } else {
        card.before(draggedFieldset);
    }
}

function handleQuestionDragEnd() {
    if (!draggedFieldset) {
        return;
    }
    draggedFieldset.classList.remove('is-dragging');
    renumberQuestionFieldsets(draggedFieldset.parentElement);
    draggedFieldset = null;
}

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
    renumberQuestionFieldsets(container);
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
    renumberQuestionFieldsets(container);
}

/**
 * @param {SubmitEvent} event
 */
function handleAdminFormSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.classList.contains('admin-form')) {
        return;
    }
    // Seul le formulaire du blind test a des morceaux ajoutés/modifiés en
    // JS — c'est ce qui justifie de passer par une soumission JSON plutôt
    // que le rechargement de page normal. Les autres formulaires admin
    // (comme celui des thèmes) gardent le style "admin-form" mais doivent
    // se soumettre normalement.
    if (!form.querySelector('#question-fieldset-container')) {
        return;
    }

    // On ne laisse jamais le navigateur soumettre le formulaire lui-même :
    // ça rechargerait la page et viderait les morceaux ajoutés en JS.
    event.preventDefault();

    // Toujours effacer les erreurs d'une tentative précédente en premier,
    // sinon un message resté affiché (ex: "titre obligatoire") peut donner
    // l'impression d'une erreur actuelle qui n'existe plus.
    clearBlindTestFieldErrors(form);

    if (!validateQuestionFieldsets(form)) {
        return;
    }

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

/**
 * @param {string} value
 * @returns {string}
 */
function slugify(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // retire les accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Sur le formulaire d'un thème (nom + slug), remplit le slug
 * automatiquement pendant la frappe dans le nom — tant que l'utilisateur
 * n'a pas lui-même modifié le slug à la main (dans ce cas on arrête de
 * l'écraser, pour ne pas défaire une modification volontaire).
 */
function initThemeSlugAutofill() {
    const nameInput = document.querySelector('[data-field-name="name"] input');
    const slugInput = document.querySelector('[data-field-name="slug"] input');
    if (!nameInput || !slugInput) {
        return;
    }

    let slugTouchedManually = slugInput.value.length > 0;

    slugInput.addEventListener('input', () => {
        slugTouchedManually = true;
    });

    nameInput.addEventListener('input', () => {
        if (!slugTouchedManually) {
            slugInput.value = slugify(nameInput.value);
        }
    });
}
