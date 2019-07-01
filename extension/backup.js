'use strict';
import Storage from './storage.js';


const ACCOUNT_TEMPLATE = `\
<article class="media box account">
  <figure class="media-left">
    <p class="image is-64x64 avatar">
      <img src="">
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <strong class="username"></strong>
        <small class="user-symbol"></small><br>
        <small><span class="reg-time"></span> 加入</small><br>
        <small>备份数据更新于 <span class="backup-time"></span></small>
        <br>
      </p>
    </div>
    <div class="columns user-data"></div>
  </div>
  <div class="media-right">
    <button class="delete" title="删除备份数据"></button>
  </div>
</article>`;


class AccountList {
    constructor(selector) {
        this.element = document.querySelector(selector);
    }

    async load() {
        let storage = new Storage();
        await storage.global.open();
        let accounts = await storage.global.account.toArray();
        storage.global.close();

        if (accounts.length > 0) {
            let $list = $(this.element);
            accounts.forEach(account => {
                let $account = $(ACCOUNT_TEMPLATE);
                $account.find('.image.avatar>img').attr('src', account.userInfo.avatar);
                $account.find('.username').text(account.username);
                $account.find('.user-symbol').text('@' + account.userSymbol);
                $account.find('.reg-time').text(account.userInfo.reg_time);
                $account.find('.backup-time').text(new Date(account.updated).toLocaleString());
                $account.data('user-id', account.userId);
                $account.appendTo($list);
            });
        }
    }

    async remove(userId) {
        let storage = new Storage();
        try {
            return await storage.drop(userId);
        } catch (e) {
            return false;
        }
    }

    static async render() {
        let list = new AccountList('#accounts');
        await list.load();
        $('#accounts').on('click', '.delete', async event => {
            let $account = $(event.target).parents('.account');
            let username = $account.find('.username').text();
            let userId = $account.data('user-id');
            if (!confirm(`是否要删除账号"${username}"的备份数据？`)) return false;
            if (await list.remove(userId)) {
                $account.fadeOut();
            } else {
                alert('删除失败。请在刷新页面后重试。');
                location.reload();
            }
        }).on('click', '.account .media-left, .account .media-content', event => {
            let userId = $(event.currentTarget).parents('.account').data('user-id');
            location = 'explorer.html?' + userId;
        });
    }
}


class TaskModal {
    constructor(selector) {
        this.element = document.querySelector(selector);
    }

    static init() {
        let modal = new TaskModal('#task-modal');
        TaskModal.instance = modal;
        if (location.hash == '#new-task') {
            modal.open();
        }
        modal.element.querySelectorAll('.cancel').forEach(item => {
            item.addEventListener('click', () => modal.close());
        });
        modal.element.querySelector('.select-all').addEventListener('change', event => {
            modal.element.querySelectorAll('input[name="task"]').forEach(item => {
                item.checked = event.target.checked;
            });
        });
        modal.element.querySelector('.button.new').addEventListener('click', async () => {
            await modal.createJob();
            modal.close();
            window.open(chrome.extension.getURL('options.html#task'));
        });

        return modal;
    }

    async createJob() {
        let service = (await new Promise(resolve => {
            chrome.runtime.getBackgroundPage(resolve);
        })).service;
        let checkedTasks = this.element.querySelectorAll('input[name="task"]:checked');
        let tasks = new Array(checkedTasks.length);
        for (let i = 0; i < checkedTasks.length; i ++) {
            tasks[i] = {
                name: checkedTasks[i].value,
            };
        }
        let job = await service.createJob.apply(service, tasks);
        return job;
    }

    open() {
        this.element.classList.add('is-active');
    }

    close() {
        this.element.classList.remove('is-active');
    }
}


class Toolbar {
    reload() {
        location.hash = '';
        location.reload();
    }

    newTask() {
        TaskModal.instance.open();
    }

    static render() {
        let toolbar = new Toolbar();
        $('#reload').click(() => toolbar.reload());
        $('#new-task').click(() => toolbar.newTask());
    }
}

TaskModal.init();
AccountList.render();
Toolbar.render();
