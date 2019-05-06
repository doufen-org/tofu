'use strict';

import Task from "./task.js";


/**
 * Service status code
 */
export const SERVICE_STATUS = {
    STOPPED: 1,
    START_PENDING: 2,
    STOP_PENDING: 3,
    RUNNING: 4,
    RESUME_PENDING: 5,
    PAUSE_PENDING: 6,
    PAUSED: 7
};


/**
 * Class AsyncBlockingQueue
 */
class AsyncBlockingQueue {
    constructor() {
        this.resolves = [];
        this.promises = [];
    }

    _add() {
        this.promises.push(
            new Promise(resolve => {
                this.resolves.push(resolve);
            })
        );
    }

    enqueue(t) {
        if (!this.resolves.length) this._add();
        let resolve = this.resolves.shift();
        resolve(t);
    }

    dequeue() {
        if (!this.promises.length) this._add();
        return this.promises.shift();
    }

    isEmpty() {
        return !this.promises.length; // this.length == 0
    }

    isBlocked() {
        return !!this.resolves.length; // this.length < 0
    }

    get length() {
        return (this.promises.length - this.resolves.length);
    }
}


/**
 * Class StateChangeEvent
 */
class StateChangeEvent extends Event {
    constructor(originalState, currentState) {
        this.type = 'statechange';
        this.originalState = originalState;
        this.currentState = currentState;
    }
}


/**
 * Class Service
 */
export default class Service extends EventTarget {
    constructor() {
        this._ports = new Map();
        this._taskQueue = new AsyncBlockingQueue();
        this._task = null;
        this._status = SERVICE_STATUS.STOPPED;
        this.requestInterval = 1000;
        this.lastRequest = 0;
        chrome.runtime.onConnect.addListener(port => this.onConnect(port));
    }

    /**
     * Get all service statuses
     * @returns {object}
     */
    get statuses() {
        return SERVICE_STATUS;
    }

    /**
     * Load settings
     * @param {object} settings
     */
    loadSettings(settings) {
        if (settings['service.request.interval']) {
            this.requestInterval = settings['service.request.interval'];
        }
    }

    /**
     * Get port unique name
     * @param {chrome.runtime.Port} port 
     * @returns {string}
     */
    getPortName(port) {
        let tab = port.sender.tab;
        return `${port.name}-${tab.windowId}-${tab.id}`;
    }

    /**
     * On connect
     * @param {chrome.runtime.Port} port 
     */
    onConnect(port) {
        this._ports.set(this.getPortName(port), port);
        port.onMessage.addListener(message => this.onMessage(port, message));
        port.onDisconnect.addListener(port => this.onDisconnect(port));
    }

    /**
     * On disconnect
     * @param {chrome.runtime.Port} port 
     */
    onDisconnect(port) {
        this._ports.delete(this.getPortName(port));
    }

    /**
     * On receive message
     * @param {chrome.runtime.Port} port 
     * @param {any} message 
     */
    onMessage(port, message) {
        switch (message.type) {
            case 'syscall':
            let retVal = this[message.method].apply(this, message.args);
            port.postMessage({
                type: message.type,
                id: message.id,
                return: retVal
            });
            break;
        }
    }

    /**
     * Post message
     * @param {chrome.runtime.Port} port 
     * @param {any} message 
     */
    postMessage(port, message) {
        try {
            return port.postMessage(message);
        } catch (e) {
            return false;
        }
    }

    /**
     * Broadcast message
     * @param {any} message 
     */
    broadcast(message) {
        for (let port of this._ports.values()) {
            this.postMessage(port, message);
        }
    }

    /**
     * Ping test
     * @param {any} payload 
     * @returns {string}
     */
    ping(payload) {
        return {'pang': payload};
    }

    /**
     * Get status code
     * @return {number}
     */
    get status() {
        return this._status;
    }

    /**
     * Start service
     */
    start() {
        let originalState = this._status, currentState = SERVICE_STATUS.START_PENDING;
        if (originalState != SERVICE_STATUS.STOPPED) return false;
        this._status = currentState;
        this.dispatchEvent(new StateChangeEvent(originalState, currentState));
    }

    /**
     * Pause service
     */
    pause() {
        if (this._status != SERVICE_STATUS.RUNNING || this.status != SERVICE_STATUS.START_PENDING) return false;
        this._status = SERVICE_STATUS.PAUSE_PENDING;
    }

    /**
     * Resume service
     */
    resume() {
        if (this._status != SERVICE_STATUS.PAUSED) return false;
        this._status = SERVICE_STATUS.RESUME_PENDING;
    }

    /**
     * Stop service
     */
    stop() {
        if (this._status != SERVICE_STATUS.RUNNING) return false;
        this._status = SERVICE_STATUS.STOP_PENDING;
    }

    /**
     * Schedule a task
     * @param {string} task 
     * @param {Array | null} args 
     * @returns {Service}
     */
    schedule(task, args = null) {
        this._taskQueue.enqueue({
            name: task,
            args: Array.isArray(args) ? args : []
        });
    }

    /**
     * Startup service
     * @returns {Service}
     */
    static async startup() {
        if (!Service.instance) {
            let instance = Service.instance = new Service();
            instance.loadSettings(await new Promise(resolve => {
                chrome.storage.sync.get([
                    'service.request.interval'
                ], resolve);    
            }));
        }
        /*
        let taskArgs;
        while (taskArgs = await this._taskQueue.dequeue()) {
            let task = this._task = await Task.create(taskArgs.name, taskArgs.args);
            this._status = SERVICE_STATUS.RUNNING;
            console.log(task);
            //let retVal = await task.run();
            this._status = SERVICE_STATUS.START_PENDING;
        }
        */
    }
}
