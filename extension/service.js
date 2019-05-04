'use strict';


/**
 * Service status code
 */
const SERVICE_STATUS = {
    STOPPED: 1,
    START_PENDING: 2,
    STOP_PENDING: 3,
    RUNNING: 4,
    RESUME_PENDING: 5,
    PAUSE_PENDING: 6,
    PAUSED: 7
};


/**
 * Class Service
 */
class Service {
    constructor() {
        this._ports = new Map();
        this._tasks = [];
        this._status = SERVICE_STATUS.STOPPED;
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
     */
    loadSettings() {
        //
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

    start() {
        if (this.status != SERVICE_STATUS.STOPPED) return false;
    }

    pause() {
        if (this.status != SERVICE_STATUS.RUNNING) return false;
    }

    resume() {
        if (this.status != SERVICE_STATUS.PAUSED) return false;
        
    }

    stop() {
        if (this.status != SERVICE_STATUS.RUNNING) return false;
        
    }

    get isBusy() {
        
    }

    /**
     * Schedule a task
     * @param {Task} task 
     * @returns {Service}
     */
    schedule(task) {

    }

    /**
     * Startup service
     * @returns {Service}
     */
    static startup() {
        if (!Service.instance) {
            let instance = Service.instance = new Service();
            chrome.storage.sync.get([
            ], items => {
                instance.loadSettings(
                );
            });
        }
        return Service.instance;
    }
}

window.service = Service.startup();
