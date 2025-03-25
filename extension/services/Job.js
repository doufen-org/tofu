import Service from '../service.js';
import Task from "./Task.js";
import TaskError from "./TaskError.js";
import AsyncBlockingQueue from "./AsyncBlockingQueue.js";
import Storage from "../storage.js";

import {taskFromJSON} from "./task_deserialize.js";

/**
 * Class Job
 */
export default class Job extends EventTarget {
    /**
     * Constructor
     * @param {Service} service
     * @param {string|null} targetUserId
     * @param {string|null} localUserId
     * @param {boolean} isOffline
     */
    constructor(service, targetUserId, localUserId, isOffline) {
        super();
        this._service = service;
        this._targetUserId = targetUserId;
        this._localUserId = localUserId;
        this._tasks = [];
        this._isRunning = false;
        this._currentTask = null;
        this._id = null;
        this._session = null;
        this._isOffline = isOffline;
    }

    /**
     * Get user info
     * @param {Object} cookies
     * @param {string} userId
     */
    async getUserInfo(cookies, userId) {
        const URL_USER_INFO = 'https://m.douban.com/rexxar/api/v2/user/{uid}?ck={ck}&for_mobile=1';

        let userInfoURL = URL_USER_INFO
            .replace('{uid}', userId)
            .replace('{ck}', cookies.ck);
        let fetch = await Service.getFetchURL(this._service);
        return await (
            await fetch(userInfoURL, {headers: {'X-Override-Referer': 'https://m.douban.com/'}})
        ).json();
    }

    /**
     * Checkin account
     * @returns {object}
     */
    async checkin() {
        const URL_MINE = 'https://m.douban.com/mine/';

        let response = await fetch(URL_MINE);
        if (response.redirected) {
            window.open(response.url);
            throw new TaskError('未登录豆瓣');
        }
        let bodyElement = Task.parseHTML(await response.text(), URL_MINE);
        let inputElement = bodyElement.querySelector('#user');
        let username = inputElement.getAttribute('data-name');
        let uid = inputElement.getAttribute('value');
        let homepageLink = bodyElement.querySelector('.profile .detail .basic-info>a');
        let homepageURL = homepageLink.getAttribute('href');
        let userSymbol = homepageURL.match(/\/people\/(.+)/).pop();
        let cookiesNeeded = {
            'ue': '',
            'bid': '',
            'frodotk_db': '',
            'ck': '',
            'dbcl2': '',
        };
        let cookies = await new Promise(
            resolve => chrome.cookies.getAll({url: 'https://*.douban.com'}, resolve)
        );
        for (let cookie of cookies) {
            if (cookie.name in cookiesNeeded) {
                cookiesNeeded[cookie.name] = cookie.value;
            }
        }

        let userInfo = await this.getUserInfo(cookiesNeeded, uid);

        return this._session = {
            userId: parseInt(uid),
            username: username,
            userSymbol: userSymbol,
            cookies: cookiesNeeded,
            userInfo: userInfo,
            updated: Date.now(),
            isOther: false
        }
    }

    /**
     * Add a task
     * @param {Task} task
     */
    addTask(task) {
        this._tasks.push(task);
    }

    /**
     * Run the job
     */
    async run() {
        let logger = this._service.logger
        this._isRunning = true;

        let userId, account, targetUser, isOtherUser = false;

        if (this._isOffline) {
            userId = this._targetUserId;
            isOtherUser = true;
        } else {
            let session = await this.checkin();
            if (this._targetUserId) {
                let userInfo = await this.getUserInfo(session.cookies, this._targetUserId);
                this._targetUserId = userId = parseInt(userInfo.id);
                account = {
                    userId: userId,
                    username: userInfo.name,
                    userSymbol: userInfo.uid,
                    cookies: null,
                    userInfo: userInfo,
                    updated: Date.now(),
                    isOther: true
                };
                targetUser = userInfo;
                isOtherUser = true;
            } else {
                userId = session.userId;
                account = session;
                targetUser = session.userInfo;
            }
        }

        let storage = new Storage(this._localUserId || userId);
        await storage.global.open();
        logger.debug('Open global database');
        if (this._isOffline) {
            let account = await storage.global.account.get({userId: userId});
            if (!account) {
                logger.debug('The account does not exist');
                storage.global.close();
                return;
            }
            targetUser = account.userInfo;
        } else {
            await storage.global.account.put(account);
        }
        logger.debug('Create the account');
        let jobId = await storage.global.job.add({
            userId: userId,
            created: Date.now(),
            progress: {},
            tasks: JSON.parse(JSON.stringify(this._tasks)),
        });
        logger.debug('Create the job');
        storage.global.close();
        logger.debug('Close global database');

        await storage.local.open();
        logger.debug('Open local database');
        this._id = jobId;

        // 设置最大并发数
        const maxConcurrency = 3;  // 控制最大并发任务数
        const taskQueue = new AsyncBlockingQueue();

        let fetch = Service.getFetchURL(this._service);
        // 将任务添加到队列中
        for (let task of this._tasks) {
            this._currentTask = task;
            task.init(
                fetch,
                logger,
                jobId,
                this._session,
                storage.local,
                targetUser,
                isOtherUser
            );

            taskQueue.enqueue(task);
        }

        // 处理任务，确保并发执行数不超过 maxConcurrency
        let activePromises = [];
        for (let i = 0; i < maxConcurrency; i++) {
            activePromises.push(this.runTaskQueue(taskQueue, logger));
        }

        // 等待所有任务完成
        await Promise.all(activePromises);

        storage.local.close();
        logger.debug('Close local database');
        this._currentTask = null;
        this._isRunning = false;
    }

    /**
     * 处理任务队列中的任务
     */
    async runTaskQueue(queue, logger) {
        while (!queue.isEmpty()) {
            let task = await queue.dequeue();
            try {
                await task.run();
            } catch (e) {
                console.error(e)
                logger.error('Fail to run task:' + e);
            }
        }
    }

    /**
     * Whether the job is running
     * @returns {boolean}
     */
    get isRunning() {
        return this._isRunning;
    }

    /**
     * Get current task
     * @returns {Task|null}
     */
    get currentTask() {
        return this._currentTask;
    }

    /**
     * Get tasks
     * @returns {Array}
     */
    get tasks() {
        return this._tasks;
    }

    /**
     * Get job id
     * @returns {number|null}
     */
    get id() {
        return this._id;
    }

    /**
     * Convert to JSON string
     * @returns {string}
     */
    toJSON() {
        return {
            targetUserId: this._targetUserId,
            localUserId: this._localUserId,
            tasks: this._tasks.map(task => task.toJSON()), // 保存任务
            isOffline: this._isOffline,
            _id: this._id,
            _session: this._session,
            _isRunning: this._isRunning,
            _currentTask: this._currentTask ? this._currentTask.toJSON() : null,
        };
    }

    /**
     * Restore job from JSON
     * @param {Object} json
     * @param {Service} service
     * @param storage
     * @returns {Job}
     */
    static fromJSON(json, service, storage) {
        let fetch = Service.getFetchURL(service);
        const job = new Job(service, json.targetUserId, json.localUserId, json.isOffline);
        job._id = json._id;
        job._session = json._session;
        job._isRunning = json._isRunning;
        job._currentTask = json._currentTask ? taskFromJSON(json._currentTask, fetch, service.logger, storage) : null;

        // 恢复任务
        for (let taskJson of json.tasks) {
            const task = taskFromJSON(
                taskJson,
                fetch, // 传入 fetch
                service.logger, // 传入 logger
                storage // 传入 storage
            );
            job.addTask(task);
        }

        return job;
    }

}