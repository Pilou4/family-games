export function createElement(tagname, attributes = {}, text = '') {
    const element = document.createElement(tagname);
    for (const [attribute, value] of Object.entries(attributes)) {
        if (value !== null) {
            element.setAttribute(attribute, value);
        }
    }
    element.innerText = text;
    return element;
}

/**
 *
 * @param {string} id
 * @returns {DocumentFragment}
 */
export function cloneTemplate(id) {
    return document.getElementById(id).content.cloneNode(true);
}
