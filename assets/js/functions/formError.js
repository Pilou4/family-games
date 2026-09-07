const ERROR_DISPLAY_DURATION_MS = 5000;

/**
 * @param {HTMLElement} inputElement
 * @param {HTMLElement} errorElement
 * @param {string} message
 */
export function showFieldError(inputElement, errorElement, message) {
    inputElement.classList.add('is-invalid');
    errorElement.textContent = message;
    errorElement.hidden = false;

    setTimeout(() => {
        inputElement.classList.remove('is-invalid');
        errorElement.hidden = true;
        errorElement.textContent = '';
    }, ERROR_DISPLAY_DURATION_MS);
}

/**
 * @param {HTMLElement} inputElement
 * @param {HTMLElement} errorElement
 */
export function clearFieldError(inputElement, errorElement) {
    inputElement.classList.remove('is-invalid');
    errorElement.hidden = true;
    errorElement.textContent = '';
}
