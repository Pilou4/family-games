const TOAST_DURATIONS_MS = {
    success: 5000,
    error: 10000,
};

/**
 * @param {'success'|'error'} type
 * @param {string} message
 */
export function showToast(type, message) {
    const container = getOrCreateContainer();

    const toast = document.createElement('div');
    toast.className = `admin-toast admin-toast--${type}`;

    const messageEl = document.createElement('span');
    messageEl.className = 'admin-toast__message';
    messageEl.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'admin-toast__close';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.textContent = '✕';

    toast.append(messageEl, closeBtn);
    container.append(toast);

    const timeoutId = setTimeout(() => toast.remove(), TOAST_DURATIONS_MS[type] || 5000);
    closeBtn.addEventListener('click', () => {
        clearTimeout(timeoutId);
        toast.remove();
    });
}

/**
 * @returns {HTMLElement}
 */
function getOrCreateContainer() {
    let container = document.getElementById('admin-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'admin-toast-container';
        container.className = 'admin-toast-container';
        document.body.append(container);
    }
    return container;
}
