// popup.js

const URL_OPTIONS = chrome.runtime.getURL('options.html');
const URL_ABOUT = URL_OPTIONS + '#about';
const URL_HELP = URL_OPTIONS + '#help';
const URL_BACKUP = chrome.runtime.getURL('backup.html');


/**
 * Class PopupMenu
 */
class PopupMenu {
    constructor(selector, service) {
        this.element = document.querySelector(selector);
        this.service = service;
    }

    clickNew(event) {
        window.open(URL_BACKUP + '#new-task');
    }

    clickBackup(event) {
        window.open(URL_BACKUP);
    }

    clickStart(event) {
        this.service.start();
    }

    clickStop(event) {
        this.service.stop();
    }

    clickSettings(event) {
        window.open(URL_OPTIONS);
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

    static async render() {
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

PopupMenu.render();
