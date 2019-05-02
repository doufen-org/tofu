'use strict';


const SHORTCUTS_TEMPLATE = `\
<div class="modal-background"></div>
<div class="modal-content">
    <p><a href="${chrome.extension.getURL('index.html')}">后台</a></p>
</div>
<button class="modal-close"></button>
`;


/**
 * Class Shortcuts
 */
class Shortcuts {
    constructor() {
        let shortcuts = this._elementRoot = document.createElement('DIV');
        shortcuts.id = 'tofu-shortcuts';
        shortcuts.innerHTML = SHORTCUTS_TEMPLATE;

        this._closed = true;
        shortcuts.querySelector('.modal-close').addEventListener('click', e => {
            this.close();
        });
        document.addEventListener('keydown', event => {
            if (event.keyCode == 27) {
                this.close();
            }
        });
    }

    /**
     * Close shortcuts
     * @returns {Shortcuts}
     */
    close() {
        this._closed = true;
        document.body.removeChild(this._elementRoot);
        document.documentElement.classList.remove('is-clipped');
        return this;
    }

    /**
     * Open shortcuts
     * @returns {Shortcuts}
     */
    open() {
        this._closed = false;
        document.body.appendChild(this._elementRoot);
        document.documentElement.classList.add('is-clipped');
        return this;
    }

    /**
     * Get singleton
     * @returns {Shortcuts}
     */
    static get() {
        if (!Shortcuts.instance) {
            Shortcuts.instance = new Shortcuts();
        }
        return Shortcuts.instance;
    }
}

window.shortcuts = Shortcuts.get();
