"use strict";

class Assistant {
    constructor () {
        const TEMPLATE = `\
<div class="panel-head">
    <span class="close">
        <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="times" class="svg-inline--fa fa-times fa-w-11" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 512"><path fill="currentColor" d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path></svg>
    </span>
</div>
<div class="panel-body">
</div>`;
        let assistant = this.element = document.createElement('div');
        assistant.id = 'doufen-assistant';
        //assistant.innerHTML = `<img src="${chrome.extension.getURL('images/icon-32x32.png')}">`;
        assistant.innerHTML = TEMPLATE;
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
