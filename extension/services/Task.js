import TaskError from "./TaskError.js";
import Storage  from "../storage.js";

export default class Task {
    /**
     * Parse HTML
     * @param {string} html
     * @param {string} url
     * @returns {Document}
     */
    static parseHTML(html, url) {
        let context = document.implementation.createHTMLDocument('');
        context.documentElement.innerHTML = html;
        let base = context.createElement('base');
        base.href = url;
        context.head.appendChild(base);
        return context;
    }

    /**
     * Initialize the task
     * @param {callback} fetch
     * @param {Logger} logger
     * @param {number} jobId
     * @param {Object} session
     * @param {Storage} localStorage
     * @param {Object} targetUser
     * @param {boolean} isOtherUser
     */
    init(fetch, logger, jobId, session, localStorage, targetUser, isOtherUser) {
        this.fetch = fetch;
        this.logger = logger;
        this.jobId = jobId;
        this.session = session;
        this.storage = localStorage;
        this.targetUser = targetUser;
        this.isOtherUser = isOtherUser;
        this.total = 1;
        this.completion = 0;
        this.parseHTML = Task.parseHTML
    }

    /**
     * Run task
     */
    async run() {
        throw new TaskError('Not implemented.');
    }

    toJSON() {
        return {
            taskType: this.constructor.name, // 存储类名
            jobId: this.jobId,
            session: this.session,
            targetUser: this.targetUser,
            isOtherUser: this.isOtherUser,
            total: this.total,
            completion: this.completion,
            // 忽略不可序列化的成员变量：fetch、logger、parseHTML、storage
        };
    }

    /**
     * Get task name
     * @returns {string}
     */
    get name() {
        throw new TaskError('Not implemented.');
    }

    /**
     * Task completed
     */
    complete() {
        this.completion = this.total;
    }

    /**
     * Progress step
     */
    step() {
        this.completion += 1;
    }
}