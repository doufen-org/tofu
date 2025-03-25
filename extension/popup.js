import Service from "./service.js";

const URL_OPTIONS = chrome.runtime.getURL('options.html');
const URL_ABOUT = URL_OPTIONS + '#about';
const URL_HELP = URL_OPTIONS + '#help';
const URL_BACKUP = chrome.runtime.getURL('backup.html');

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

    async clickStart(event) {
        await this.service.start();
    }

    async clickStop(event) {
        await this.service.stop();
    }

    clickSettings(event) {
        window.open(URL_OPTIONS);
    }

    clickHelp(event) {
        window.open(URL_HELP);
    }

    clickAbout(event) {
        console.log("clickAbout");
        window.open(URL_ABOUT);
    }

    getItem(name) {
        return this.element.querySelector(`[name="${name}"]`);
    }

    disable(name) {
        this.getItem(name).setAttribute('disabled', true);
    }

    enable(name) {
        this.getItem(name).removeAttribute('disabled');
    }

    static async render() {
        let service = await Service.getInstance();
        let menu = new PopupMenu('.menu', service);

        // 根据状态启用/禁用按钮
        switch (service.status) {
            case Service.STATE_STOPPED:
                menu.enable('Start');
                menu.disable('Stop');
                break;

            case Service.STATE_START_PENDING:
            case Service.STATE_RUNNING:
                menu.disable('Start');
                menu.enable('Stop');
                break;

            default:
                break;
        }

        // 绑定点击事件
        Zepto('.menu').on('click', '.menu-item', event => {
            console.log('Button clicked:', event.currentTarget.getAttribute('name'));
            if (event.currentTarget.hasAttribute('disabled')) return false;
            let handle = menu['click' + event.currentTarget.getAttribute('name')];
            if (!handle) return false;
            handle.apply(menu, [event]);
            setTimeout(() => {
                window.close();
            }, 100);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    PopupMenu.render();
});