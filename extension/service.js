'use strict';


/**
 * Class Service
 */
class Service {
    constructor() {
        this.ports = [];
        chrome.runtime.onConnect.addListener(port => this.onConnect(port));
    }

    onConnect(port) {
        if (port.name != 'assistant') return;
        port.onMessage.addListener(message => this.onMessage(message));
        port.postMessage({text: '喵喵喵'});
    }

    onMessage(message) {

    }

    /**
     * Load settings
     * @returns {object}
     */
    static loadSettings() {
        return {};
    }

    /**
     * Run service
     * @returns {Service}
     */
    static run() {
        if (!Service.instance) {
            let settings = Service.loadSettings();
            Service.instance = new Service();
        }
        return Service.instance;
    }
}

Service.run();
