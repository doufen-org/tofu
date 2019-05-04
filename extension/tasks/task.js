'use strict';


const URL_MINE = 'https://m.douban.com/mine/';


/**
 * Class TaskEvent
 */
class TaskEvent extends CustomEvent {

}


/**
 * Class Task
 */
class Task extends EventTarget {
    constructor() {
        super();
    }

    createEvent(type) {
        return new TaskEvent(type);
    }

    getCurrentUser() {
        fetch(URL_MINE).then(
            response => response.text()
        ).then(html => {
            let elementRoot = document.createElement('DIV');
            elementRoot.innerHTML = html;
            let cancelled = !this.dispatchEvent(this.createEvent('progress'));
        });
    }
}
