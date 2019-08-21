/**
 * Class Settings
 */
export default class Settings extends EventTarget {
    clear() {
        for (let name in this) {
            delete this[name];
        }
        return this;
    }

    assign(settings) {
        Object.assign(this, settings);
        return this;
    }

    static get instance() {
        if (!Settings._instance) {
            Settings._instance = new Settings();
        }
        return Settings._instance;
    }

    static apply(target, settings) {
        for (let key in settings) {
            try {
                let keyPath = key.split('.');
                if (keyPath.shift() != target.name) {
                    continue;
                }
                let lastNode = keyPath.pop();
                for (let node of keyPath) {
                    target = target[node];
                }
                target[lastNode] = settings[key];
            } catch (e) {}
        }
    }

    static async load(...args) {
        args.unshift(new Object());
        let defaults = Object.assign.apply(null, args);
        let settings = await new Promise(resolve => {
            chrome.storage.sync.get(Object.keys(defaults), resolve);
        });
        let instance = Settings.instance.clear().assign(defaults).assign(settings);
        instance.dispatchEvent(new Event('load'));
        return instance;
    }

    static async save(settings) {
        await new Promise(resolve => {
            chrome.storage.sync.set(settings, resolve);
        });
        let instance = Settings.instance.assign(settings);
        instance.dispatchEvent(new Event('load'));
        return instance;
    }

    static attachLoadEvent(listener) {
        return Settings.instance.addEventListener('load', listener);
    }

    static detachLoadEvent(listener) {
        return Settings.instance.removeEventListener('load', listener);
    }
}
