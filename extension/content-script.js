"use strict";

class Assistant {
    constructor () {
        const ELEMENT_STYLE = '\
            position: fixed; \
            margin: 0; \
            padding: 8px; \
            top: 40px; \
            left: 8px; \
            border: 3px solid gray; \
            width: 32px; \
            height: 32px; \
            border-radius: 27px; \
            background-color: #eee; \
            z-index: 999;';
        let assistant = this.element = document.createElement('div');
        assistant.id = 'doufen-assistant';
        assistant.style = ELEMENT_STYLE;
        assistant.innerHTML = `<img src="${chrome.extension.getURL('images/icon-32x32.png')}">`;
        document.body.appendChild(assistant);

        this._dragable = false;
    }

    get dragable() {
        return this._dragable;
    }

    set dragable(value) {
        let isDragging = false,
            elementLeft,
            elementTop;

        let onStartDrag = (event) => {
            if (event.target != this.element) return false;
            isDragging = true;
            let elementRect = this.element.getBoundingClientRect();
            elementLeft = event.clientX - elementRect.left;
            elementTop = event.clientY - elementRect.top;
        };
    
        let onStopDrag = (event) => {
            isDragging = false;
        };

        let onDragging = (event) => {
            if (!isDragging) return;
            let moveX = event.clientX - elementLeft,
                moveY = event.clientY - elementTop;
            this.element.style.left = moveX + 'px';
            this.element.style.top = moveY + 'px';
        };

        if (value) {
            this._dragable = true;
            document.addEventListener('mousedown', onStartDrag);
            document.addEventListener('mouseup', onStopDrag);
            document.addEventListener('mousemove', onDragging);
        } else {
            this._dragable = false;
            document.removeEventListener('mousedown', onStartDrag);
            document.removeEventListener('mouseup', onStopDrag);
            document.removeEventListener('mousemove', onDragging);
        }
    }

    say (message) {
        //
    }

    static get() {
        if (!Assistant.instance) {
            Assistant.instance = new Assistant();
        }
        return Assistant.instance;
    }
}

let assistant = Assistant.get();
assistant.dragable = true;

let notes = window.indexedDB.open('notes', 1);

notes.onerror = event => {
    console.log('数据库打开报错');
};
notes.onsuccess = e => {
    console.log('数据库打开');
}
