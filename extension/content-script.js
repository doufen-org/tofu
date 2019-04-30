"use strict";


const ASSISTANT_TEMPLATE = `\
<span class="icon close" title="关闭"></span>
<div class="sprite" style="background-image: url('${chrome.extension.getURL('images/icon-32x32.png')}');"></div>
<div class="dialog">
    <div class="arrow border"></div>
    <div class="arrow background"></div>
    <div class="message">asdvd asdvd</div>
</div>
<audio class="speaker"></audio>`;


class Assistant {
    /**
     * constructor
     * @param {boolean} draggable 
     * @param {boolean} closable 
     */
    constructor (draggable = true, closable = true) {
        let assistant = this.element = document.createElement('DIV');
        assistant.id = 'doufen-assistant';
        assistant.innerHTML = ASSISTANT_TEMPLATE;
        assistant.querySelector('.sprite').addEventListener('click', () => {

        })

        this.draggable = draggable;
        this.closable = closable;
    }

    /**
     * Get property draggable
     * @returns {boolean}
     */
    get draggable() {
        return this._draggable;
    }

    /**
     * Set property draggable
     * @param {boolean} value 
     */
    set draggable(value) {
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
            event.preventDefault();
        };

        if (value) {
            this._draggable = true;
            this.element.classList.add('draggable');
            document.addEventListener('mousedown', this._onStartDrag = onStartDrag);
            document.addEventListener('mouseup', this._onStopDrag = onStopDrag);
            document.addEventListener('mousemove', this._onDragging = onDragging);
        } else {
            this._draggable = false;
            this.element.classList.remove('draggable');
            document.removeEventListener('mousedown', this._onStartDrag);
            document.removeEventListener('mouseup', this._onStopDrag);
            document.removeEventListener('mousemove', this._onDragging);
        }
    }

    /**
     * Get property closable
     * @returns {boolean}
     */
    get closable() {
        return this._closable;
    }

    /**
     * Set property closable
     * @param {boolean} value 
     */
    set closable(value) {
        let onClose = (event) => {
            this.close();
        };

        if (value) {
            this._closable = true;
            this.element.classList.add('closable');
            this.element.querySelector('.icon.close').addEventListener('click', this._onClose = onClose);
        } else {
            this._closable = false;
            this.element.classList.remove('closable');
            this.element.querySelector('.icon.close').removeEventListener('click', this._onClose);
        }
    }

    /**
     * Close assistant
     */
    close() {
        document.body.removeChild(this.element);
    }

    /**
     * Open assistant
     */
    open() {
        document.body.appendChild(this.element);
    }

    /**
     * Show notification
     * @param {string} message 
     * @param {string} direction
     */
    notify(message, direction = 'auto') {
        const MESSAGE_BOX_MAX_WIDTH = 400;
        let dialog = this.element.querySelector('.dialog'),
            messageBox = dialog.querySelector('.message'),
            arrowBorder = dialog.querySelector('.arrow.border'),
            arrowBackground = dialog.querySelector('.arrow.background');
        let directions = ['left', 'right', 'top', 'bottom'];
        directions.forEach(dir => dialog.classList.remove(dir));
        if (directions.indexOf(direction) == -1) {
            direction = 'right';
        }
        dialog.style = arrowBorder.style = arrowBackground.style = '';
        messageBox.style.width = 'auto';
        messageBox.classList.remove('alignment');
        messageBox.innerText = message;
        dialog.classList.add(direction);
        messageBox.style.width = getComputedStyle(messageBox).width;

        switch (direction) {
            case 'left':
                dialog.style.marginLeft = `-${messageBox.offsetWidth + 20}px`;
                arrowBorder.style.marginLeft = `${messageBox.offsetWidth}px`;
                arrowBackground.style.marginLeft = `${messageBox.offsetWidth - 1}px`;
                break;
            case 'right':
                break;
            case 'top':
                dialog.style.marginTop = `-${messageBox.offsetHeight + 74}px`;
                arrowBorder.style.marginTop = `${messageBox.offsetHeight}px`;
                arrowBackground.style.marginTop = `${messageBox.offsetHeight - 1}px`;
                break;
            case 'bottom':
                break;
        }
        messageBox.classList.add('alignment');
    }

    /**
     * Play sounds
     */
    beep(name = 'meow') {
        let audio = `media/${name}.mp3`;
        let speaker = this.element.querySelector('.speaker');
        speaker.src = chrome.extension.getURL(audio);
        speaker.play();
    }

    /**
     * Flash assistant
     * @param {number} times 
     */
    flash(times = Number.MAX_VALUE) {
        this._isFlashing = times;
        let interval = 500;
        let onFlash = () => {
            if (!this.element.classList.toggle('flash')) {
                if (this._isFlashing -- < 1) {
                    return;
                }
            }
            setTimeout(() => {
                onFlash();
            }, interval);  
        }
        if (times) {
            this.element.classList.add('flash');
            this._isFlashing --;
            setTimeout(onFlash, interval);
        } else {
            this.element.classList.remove('flash');
        }
    }

    /**
     * Get instance of singleton
     * @returns {Assistant}
     */
    static get() {
        if (!Assistant.instance) {
            Assistant.instance = new Assistant();
        }
        return Assistant.instance;
    }
}

let assistant = Assistant.get(true, true);
assistant.open();

window.assistant = assistant;

