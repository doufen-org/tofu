// popup.js

const URL_ABOUT = 'https://blog.doufen.org/about';
const URL_HELP = 'https://blog.doufen.org/help';


/**
 * Class PopupMenu
 */
class PopupMenu {
    constructor(selector, service) {
        this.element = document.querySelector(selector);
        this.service = service;
    }

    clickNew(event) {

    }

    clickStart(event) {
        this.service.start();
    }

    clickStop(event) {
        this.service.stop();
    }

    clickSettings(event) {
        window.open(chrome.runtime.getURL('options.html'));
    }

    clickHelp(event) {
        window.open(URL_HELP);
    }

    clickAbout(event) {
        window.open(URL_ABOUT);
    }

    getItem(name) {
        return this.element.querySelector(`[name="${name}"]`);
    }

    disable(name) {
        this.getItem(name).setAttribute('disabled');
    }

    enable(name) {
        this.getItem(name).removeAttribute('disabled');
    }

    static async setup() {
        let service = (await new Promise(resolve => {
            chrome.runtime.getBackgroundPage(resolve);
        })).service;
        let menu = new PopupMenu('.menu', service);
        switch (service.status) {
            case service.STATE_STOPPED:
            menu.enable('Start');
            break;

            case service.STATE_START_PENDING:
            case service.STATE_RUNNING:
            menu.enable('Stop');
            break;

            default:
            break;
        }
        $('.menu').on('click', '.menu-item', event => {
            if (event.currentTarget.hasAttribute('disbaled')) return false;
            let handle = menu['click' + event.currentTarget.getAttribute('name')];
            if (!handle) return false;
            handle.apply(menu, event);
            window.close();
        });
    }
}

PopupMenu.setup();
