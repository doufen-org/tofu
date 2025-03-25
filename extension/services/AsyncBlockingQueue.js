/**
 * Class AsyncBlockingQueue
 */
export default class AsyncBlockingQueue {
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

    enqueue(item) {
        if (!this.resolves.length) this._add();
        let resolve = this.resolves.shift();
        resolve(item);
    }

    dequeue() {
        if (!this.promises.length) this._add();
        return this.promises.shift();
    }

    isEmpty() {
        return !this.promises.length;
    }

    isBlocked() {
        return !!this.resolves.length;
    }

    clear() {
        this.promises.length = 0;
    }

    get length() {
        return (this.promises.length - this.resolves.length);
    }
}