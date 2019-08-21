import Settings from './settings.js';
import {SERVICE_SETTINGS, Task} from './service.js';
import Notification from './ui/notification.js';
import TabPanel from './ui/tab.js';


class AccountPanel {
    constructor(successSelector, errorSelector) {
        this.panel = document.querySelector(successSelector);
        this.error = document.querySelector(errorSelector);
    }

    async load() {
        const URL_LOGOUT = 'https://www.douban.com/accounts/logout?ck={ck}';

        let cookies = await new Promise(resolve => chrome.cookies.getAll({url: 'https://*.douban.com'}, resolve));
        let uid, ck;
        for (let cookie of cookies) {
            switch (cookie.name) {
                case 'dbcl2':
                    uid = parseInt(cookie.value.match(/^\"(\w*):.+\"$/)[1]);
                    break;
                case 'ck':
                    ck = cookie.value;
                    break;
            }
        }
        if (uid == undefined) {
            this.error.classList.remove('is-hidden');
            return;
        }
        let response = await fetch(`https://m.douban.com/rexxar/api/v2/user/${uid}?ck=${ck}`, {headers: {'X-Override-Referer': 'https://m.douban.com/'}});
        if (response.status != 200) {
            this.error.classList.remove('is-hidden');
            return;
        }
        let userInfo = await response.json();
        this.panel.querySelector('.media-left>.image').innerHTML = `<img src="${userInfo.avatar}">`;
        this.panel.querySelector('.media-content [name="name"]').innerText = userInfo.name;
        this.panel.querySelector('.media-content [name="symbol"]').innerText = '@' + userInfo.uid;
        this.panel.querySelector('.media-content [name="reg-time"]').innerText = userInfo.reg_time;
        this.panel.querySelector('.media-content [name="intro"]').innerText = userInfo.intro;
        let logoutLink = this.panel.querySelector('.button[name="logout"]');
        logoutLink.setAttribute('href', URL_LOGOUT.replace('{ck}', ck));
        logoutLink.addEventListener('click', event => {
            if (!confirm('确定要退出当前账号的登录状态吗？')) {
                event.preventDefault();
            }
        });
        let collectionPanel = this.panel.querySelector('.media-content [name="collection"]');
        let collection = {
            '关注': {key: 'following_count', url: 'https://www.douban.com/contacts/list'},
            '被关注': {key: 'followers_count', url: 'https://www.douban.com/contacts/rlist'},
            '日记': {key: 'notes_count', url: 'https://www.douban.com/mine/notes'},
            '相册': {key: 'photo_albums_count', url: 'https://www.douban.com/mine/photos'},
            '小组': {key: 'joined_group_count', url: 'https://www.douban.com/group/mine'},
            '广播': {key: 'statuses_count', url: 'https://www.douban.com/mine/statuses'},
            '豆列': {key: 'owned_doulist_count', url: 'https://www.douban.com/mine/doulists'},
        };
        for (let item in collection) {
            let column = document.createElement('DIV');
            let url = collection[item].url;
            let key = collection[item].key;
            column.classList.add('column');
            column.innerHTML = `<p class="has-text-centered is-size-7"><a href="${url}" target="_blank">${userInfo[key]}<br>${item}</a></p>`
            collectionPanel.appendChild(column);
        }
        this.panel.classList.remove('is-hidden');
    }

    static async render() {
        let panel = new AccountPanel('#account',
                                     '#account-error');
        let account = await panel.load();
    }
}


class Control {
    constructor(name) {
        this.name = name;
        this.element = document.querySelector(`[name="${name}"]`);
    }

    set value(value) {
        this.element.value = value;
    }

    get value() {
        return this.element.value;
    }
}


class GeneralPanel {
    constructor(selector, settings, defaults) {
        this.panel = document.querySelector(selector);
        this.settings = settings;
        this.defaults = defaults;

        let BoolSwitch = class extends Control {
            constructor(name) {
                super(name);
                new Switchery(this.element);
            }

            set value(value) {
                $(this.element).prop('checked', value).trigger('change');
            }
        
            get value() {
                return this.element.checked;
            }
        };

        let TimeInput = class extends Control {
            set value(value) {
                this.element.value = value / 1000;
            }
        
            get value() {
                return parseInt(parseFloat(this.element.value) * 1000);
            }
        };

        let TextInput = class extends Control {
            set value(value) {
                this.element.value = value;
            }

            get value() {
                return this.element.value || '';
            }
        };

        const CONTROL_METAS = [
            //{name: 'assistant.enable', type: BoolSwitch},
            {name: 'service.debug', type: BoolSwitch},
            {name: 'service.requestInterval', type: TimeInput},
            {name: 'service.cloudinary', type: TextInput},
        ];

        this.controls = new Object();
        for (let {name, type} of CONTROL_METAS) {
            let control = this.controls[name] = new type(name);
            control.value = settings[name];
        }

        this.saveButton = document.querySelector('.button[name="save"]');
        this.resetButton = document.querySelector('.button[name="reset"]');

        this.saveButton.addEventListener('click', async () => {
            for (let name in this.controls) {
                this.settings[name] = this.controls[name].value;
            }
            await this.save(this.settings);
        });

        this.resetButton.addEventListener('click', async () => {
            for (let name in this.controls) {
                this.controls[name].value = this.defaults[name];
            }
            await this.save(this.defaults);
        });
    }

    async save(settings) {
        try {
            await Settings.save(settings);
            Notification.show('保存成功');
        } catch (e) {
            Notification.show('保存失败', {type: 'danger'});
        }
    }

    static async render() {
        let settings = await Settings.load(SERVICE_SETTINGS);
        let defaults = SERVICE_SETTINGS;
        return new GeneralPanel('.page-tab-content[name="general"]', settings, defaults);
    }
}


const TEMPLATE_TASK = `\
<tr>
  <td width="20%" class="task-name"></td>
  <td><progress class="progress is-info"></progress></td>
</tr>`;


/**
 * class ServicePanel
 */
class ServicePanel {
    constructor(selector, service) {
        this.panel = document.querySelector(selector);
        this.service = service;

        let $panel = $(this.panel);
        this.$start = $panel.find('.service-ctrl[name="start"]');
        this.$stop = $panel.find('.service-ctrl[name="stop"]');
        this.$loading = $panel.find('.service-ctrl[name="loading"]');
        this.$logs = $panel.find('.logs');
        this.$job = $panel.find('.job');
        this.$start.click(event => service.start());
        this.$stop.click(event => service.stop());
        service.addEventListener('statechange', event => this.onStateChange(event.target));
        service.addEventListener('progress', event => this.onProgress(event.target));
        if (service.debug) {
            service.logger.addEventListener('log', event => this.onLog(event.detail));
            this.$logs.parent().removeClass('is-hidden');
        }
        this.onStateChange(service);
    }

    onLog(entry) {
        let { time, levelName, message } = entry;
        let datetime = new Date(time).toISOString();
        $('<P>').text(`[${datetime}] ${levelName}: ${message}`).appendTo(this.$logs);
        this.$logs.scrollTop(this.$logs.prop('scrollHeight'));
    }

    onStateChange(service) {
        let $panel = $(this.panel);
        $panel.find('.service-ctrl').addClass('is-hidden');

        let statusName;
        switch (service.status) {
            case service.STATE_STOPPED:
                statusName = '已停止';
                this.$start.removeClass('is-hidden');
                break;
            case service.STATE_START_PENDING:
                this.$stop.removeClass('is-hidden');
                statusName = '等待任务';
                break;
            case service.STATE_STOP_PENDING:
                this.$loading.removeClass('is-hidden');
                statusName = '正在停止';
                break;
            case service.STATE_RUNNING:
                this.$stop.removeClass('is-hidden');
                statusName = '运行中';
                break;
        }
        $panel.find('.service-status')
            .data('status', service.status)
            .text(statusName);
        this.onProgress(service);
    }

    onProgress(service) {
        this.$job.empty();
        let currentJob = service.currentJob;
        if (!currentJob || !currentJob.tasks) {
            return;
        }
        for (let task of currentJob.tasks) {
            let $task = $(TEMPLATE_TASK);
            if (task === currentJob.currentTask) {
                $task.addClass('is-selected');
            }
            $task.find('.progress').val(task.completion).attr('max', task.total);
            $task.find('.task-name').text(task.name);
            $task.appendTo(this.$job);
        }
    }

    static async render() {
        let service = (await new Promise(resolve => {
            chrome.runtime.getBackgroundPage(resolve);
        })).service;
        return new ServicePanel('.page-tab-content[name="service"]', service);
    }
}


TabPanel.render();
GeneralPanel.render();
AccountPanel.render();
ServicePanel.render();
