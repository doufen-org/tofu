/**
 * Class Settings
 */
export default class Settings {
    constructor (settings, defaults) {
        return Object.assign(defaults, settings);
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
        return new Settings(settings, defaults);
    }
}
