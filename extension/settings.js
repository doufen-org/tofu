/**
 * Class Settings
 */
export default class Settings {
    static apply(target, settings) {
        for (let key in settings) {
            try {
                let keyPath = key.split('.');
                if (keyPath.shift() !== target.name) {
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
        args.unshift({});
        let defaults = Object.assign.apply(null, args);
        let settings = await new Promise(resolve => {
            chrome.storage.sync.get(Object.keys(defaults), resolve);
        });
        return Object.assign({}, defaults, settings);
    }

    static async save(settings) {
        return await new Promise(resolve => {
            chrome.storage.sync.set(settings, resolve);
        });
    }
}
