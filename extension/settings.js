/**
 * Class Settings
 */
export default class Settings {
    constructor (settings, defaults) {
        return Object.assign(defaults, settings);
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
