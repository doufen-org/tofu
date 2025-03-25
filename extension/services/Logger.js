/**
 * Class Logger
 */
export default class Logger extends EventTarget {
    /**
     * Constructor
     */
    constructor() {
        super();
        Object.assign(this, {
            LEVEL_CRITICAL: 50,
            LEVEL_ERROR: 40,
            LEVEL_WARNING: 30,
            LEVEL_INFO: 20,
            LEVEL_DEBUG: 10,
            LEVEL_NOTSET: 0,
        });
        this._level = this.LEVEL_INFO;
        this.entries = [];
    }

    /**
     * Log error
     * @param {string} message
     * @param {any} context
     * @returns {object}
     */
    error(message, context = null) {
        return this.log(this.LEVEL_ERROR, message, context);
    }

    /**
     * Log warning
     * @param {string} message
     * @param {any} context
     * @returns {object}
     */
    warning(message, context = null) {
        return this.log(this.LEVEL_WARNING, message, context);
    }

    /**
     * Log info
     * @param {string} message
     * @param {any} context
     * @returns {object}
     */
    info(message, context = null) {
        return this.log(this.LEVEL_INFO, message, context);
    }

    /**
     * Log debug info
     * @param {string} message
     * @param {any} context
     * @returns {object}
     */
    debug(message, context = null) {
        return this.log(this.LEVEL_DEBUG, message, context);
    }

    /**
     * Log message
     * @param {number} level
     * @param {string} message
     * @param {any} context
     * @returns {object}
     */
    log(level, message, context = null) {
        if (this._level > level) return;
        let levelName;
        switch (level) {
            case this.LEVEL_DEBUG:
                levelName = 'DEBUG';
                break;
            case this.LEVEL_INFO:
                levelName = 'INFO';
                break;
            case this.LEVEL_WARNING:
                levelName = 'WARNING';
                break;
            case this.LEVEL_ERROR:
                levelName = 'ERROR';
                break;
            case this.LEVEL_CRITICAL:
                levelName = 'CRITICAL';
                break;
            default:
                levelName = 'UNKNOWN';
        }
        let entry = {
            time: Date.now(),
            level: level,
            levelName: levelName,
            message: message,
            context: context,
        };
        let cancelled = !this.dispatchEvent(new CustomEvent('log', {detail: entry}));
        if (cancelled) {
            return entry;
        }
        return this.entries.push(entry);
    }

    /**
     * Get default level
     * @returns {number}
     */
    get level() {
        return this._level;
    }

    /**
     * Set default level
     * @param {number} value
     */
    set level(value) {
        this._level = value;
    }
}