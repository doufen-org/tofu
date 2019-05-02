'use strict';


const ASSISTANT_TEMPLATE = `\
<span class="icon close" title="关闭"></span>
<div class="sprite" style="background-image: url('${chrome.extension.getURL('images/icon-32x32.png')}');"></div>
<div class="dialog">
    <div class="arrow">
        <div class="border"></div>
        <div class="filler"></div>
    </div>
    <div class="message"></div>
</div>
<audio class="speaker"></audio>`;


/**
 * Class Assistant
 */
class Assistant {
    /**
     * constructor
     * @param {boolean} draggable 
     * @param {boolean} closable 
     */
    constructor (draggable = true, closable = true, silent = false) {
        let assistant = this._elementRoot = document.createElement('DIV');
        assistant.id = 'tofu-assistant';
        assistant.innerHTML = ASSISTANT_TEMPLATE;
        assistant.querySelector('.sprite').addEventListener('click', () => {
            window.shortcuts.open();
        })

        this.draggable = draggable;
        this.closable = closable;
        this.silent = silent;

        let dialog = this._elementDialog = assistant.querySelector('.dialog');
        this._elementMessageBox = dialog.querySelector('.message');

        if (!silent) {
            document.addEventListener('visibilitychange', event => {
                this.silent = event.target.hidden;
            });
        }

        this.loadSession();
        if (!this._closed) {
            this.open();
        }
    }

    loadSession() {
        let session = sessionStorage.getItem('tofu.assistant');
        if (session) {
            try {
                session = JSON.parse(session);
            } catch (e) {
                sessionStorage.removeItem('tofu.assistant');
            }
            this._closed = session.closed;
            this._position = session.position;
        }
        return this;
    }

    saveSession() {
        sessionStorage.setItem('tofu.assistant', JSON.stringify({
            closed: this._closed,
            position: this._position
        }));
        return this;
    }

    /**
     * Get property silent
     * @returns {boolean}
     */
    get silent() {
        return this._silent;
    }

    /**
     * Set property silent
     * @param {boolean} value 
     */
    set silent(value) {
        this._silent = value ? true : false;
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

        let onStartDrag = event => {
            if (event.target != this._elementRoot) return false;
            isDragging = true;
            let elementRect = this._elementRoot.getBoundingClientRect();
            elementLeft = event.clientX - elementRect.left;
            elementTop = event.clientY - elementRect.top;
            this._position = {
                top: elementRect.top + 'px',
                left: elementRect.left + 'px'
            };
        };
    
        let onStopDrag = event => {
            isDragging = false;
            this._position = {
                top: this._elementRoot.style.top,
                left: this._elementRoot.style.left
            };
            this.saveSession();
        };

        let onDragging = event => {
            if (!isDragging) return;
            let moveX = event.clientX - elementLeft,
                moveY = event.clientY - elementTop;
            this._elementRoot.style.left = moveX + 'px';
            this._elementRoot.style.top = moveY + 'px';
            event.preventDefault();
        };

        if (value) {
            this._draggable = true;
            this._elementRoot.classList.add('draggable');
            document.addEventListener('mousedown', this._onStartDrag = onStartDrag);
            document.addEventListener('mouseup', this._onStopDrag = onStopDrag);
            document.addEventListener('mousemove', this._onDragging = onDragging);
        } else {
            this._draggable = false;
            this._elementRoot.classList.remove('draggable');
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
            this._elementRoot.classList.add('closable');
            this._elementRoot.querySelector('.icon.close').addEventListener('click', this._onClose = onClose);
        } else {
            this._closable = false;
            this._elementRoot.classList.remove('closable');
            this._elementRoot.querySelector('.icon.close').removeEventListener('click', this._onClose);
        }
    }

    /**
     * Connect to background
     * @returns {Assistant}
     */
    connect() {
        let port = this._port = chrome.runtime.connect({name: 'assistant'});
        port.onMessage.addListener(message => {
            //this.notify(message.text);
            //this.flash(3);
        });
        return this;
    }

    /**
     * Disconnect
     * @returns {Assistant}
     */
    disconnect() {
        if (this._port) {
            this._port.disconnect();
        }
        return this;
    }

    /**
     * Close assistant
     * @returns {Assistant}
     */
    close() {
        this._closed = true;
        this.saveSession();
        if (this._onWindowResize) {
            window.removeEventListener('resize', this._onWindowResize);
        }
        document.body.removeChild(this._elementRoot);
        return this.disconnect();
    }

    /**
     * Open assistant
     * @returns {Assistant}
     */
    open() {
        this._closed = false;
        if (this._position) {
            this._elementRoot.style.left = this._position.left;
            this._elementRoot.style.top = this._position.top;
        }
        document.body.appendChild(this._elementRoot);
        let onWindowResize = event => {
            let elementRect = this._elementRoot.getBoundingClientRect();
            let moved = false,
                x = elementRect.left, y = elementRect.top,
                boundX = document.documentElement.clientWidth - elementRect.width,
                boundY = document.documentElement.clientHeight - elementRect.height;
            if (boundY < y) {
                moved = true;
                y = boundY;
            }
            if (boundX < x) {
                moved = true;
                x = boundX;
            }
            if (moved) {
                this.move(x, y);
            }
        };
        window.addEventListener('resize', this._onWindowResize = onWindowResize);
        return this.connect();
    }

    /**
     * Move to
     * @param {number} x 
     * @param {number} y 
     * @returns {Assistant}
     */
    move(x, y) {
        let elementStyle = this._elementRoot.style;
        this._position = {
            top: elementStyle.top = y + 'px',
            left: elementStyle.left = x + 'px'
        };
        this.saveSession();
        return this;
    }

    /**
     * Show notification
     * @param {string} message 
     * @param {string} direction
     * @param {function} callback
     * @returns {Assistant}
     */
    notify(message, direction = 'auto', callback = null) {
        let dialog = this._elementDialog,
            messageBox = this._elementMessageBox;
        let onClick = event => {
            if (callback) {
                callback();
            }
            this.mute();
        };
        if (this._onMessageBoxClick) {
            messageBox.removeEventListener('click', this._onMessageBoxClick);
        }

        messageBox.style = '';
        dialog.classList.add('show');
        messageBox.style.width = 'auto';
        messageBox.classList.remove('alignment');
        messageBox.innerText = message;
        messageBox.style.width = getComputedStyle(messageBox).width;

        let dirX, dirY;
        let directions = ['east', 'west', 'south', 'north'];
        if (direction == 'auto') {
            let viewportWidth = document.documentElement.clientWidth,
                viewportHeight = document.documentElement.clientHeight;
            let elementRect = this._elementRoot.getBoundingClientRect();
            let elementX = elementRect.left, elementY = elementRect.top;

            if (elementY < viewportHeight / 3) {
                dirY = 'south';
            } else if (elementY > viewportHeight *2 / 3) {
                dirY = 'north';
            }
            if (elementX < viewportWidth / 2) {
                dirX = 'east';
            } else {
                dirX = 'west';
            }
        } else {
            let dirVector = direction.split(',', 2);
            dirX = dirVector[0],
            dirY = dirVector[1];
            if (directions.indexOf(dirX) == -1) {
                dirX = 'east';
            }
        }
        directions.forEach(val => dialog.classList.remove(val));
        dialog.classList.add(dirX);
        messageBox.classList.add('alignment');

        switch (dirX) {
            case 'west':
            switch (dirY) {
                case 'south':
                messageBox.style.margin = `-48px auto auto -${messageBox.clientWidth + 17}px`;
                break;
                case 'north':
                messageBox.style.margin = `-${messageBox.clientHeight + 8}px auto auto -${messageBox.clientWidth + 17}px`;
                break;
                default:
                messageBox.style.margin = `-${parseInt(messageBox.clientHeight / 2) + 8}px auto auto -${messageBox.clientWidth + 17}px`;
            }
            break;

            case 'south':
            switch (dirY) {
                case 'west':
                messageBox.style.margin = `15px auto auto ${-(messageBox.clientWidth - 54)}px`;
                break;
                case 'east':
                messageBox.style.margin = '15px auto auto auto';
                break;
                default:
                messageBox.style.margin = `15px auto auto ${-(parseInt(messageBox.clientWidth / 2) - 27)}px`;
            }
            break;

            case 'north':
            switch (dirY) {
                case 'west':
                messageBox.style.margin = `-${messageBox.clientHeight + 71}px auto auto ${-(messageBox.clientWidth - 54)}px`;
                break;
                case 'east':
                messageBox.style.margin = `-${messageBox.clientHeight + 71}px auto auto auto`;
                break;
                default:
                messageBox.style.margin = `-${messageBox.clientHeight + 71}px auto auto ${-(parseInt(messageBox.clientWidth / 2) - 27)}px`;
            }
            break;

            case 'east':
            switch (dirY) {
                case 'south':
                messageBox.style.margin = '-48px auto auto 69px';
                break;
                case 'north':
                messageBox.style.margin = `-${messageBox.clientHeight + 8}px auto auto 69px`;
                break;
                default:
                messageBox.style.margin = `-${parseInt(messageBox.clientHeight / 2) + 8}px auto auto 69px`;
            }
            break;
        }
        messageBox.addEventListener('click', this._onMessageBoxClick = onClick, {once: true});
        return this;
    }

    /**
     * Close notification
     * @returns {Assistant}
     */
    mute() {
        this._elementDialog.classList.remove('show');
        return this;
    }

    /**
     * Play sounds
     * @param {string} name
     * @returns {Assistant}
     */
    beep(name = 'meow') {
        if (this.silent) return this;
        let audio = `media/${name}.mp3`;
        let speaker = this._elementRoot.querySelector('.speaker');
        speaker.src = chrome.extension.getURL(audio);
        speaker.play();
        return this;
    }

    /**
     * Flash assistant
     * @param {number} times
     * @returns {Assistant} 
     */
    flash(times = Number.MAX_VALUE) {
        this._isFlashing = times;
        let interval = 500;
        let onFlash = () => {
            if (!this._elementRoot.classList.toggle('flash')) {
                if (this._isFlashing -- < 1) {
                    return;
                }
            }
            setTimeout(() => {
                onFlash();
            }, interval);  
        }
        if (times) {
            this._elementRoot.classList.add('flash');
            this._isFlashing --;
            setTimeout(onFlash, interval);
        } else {
            this._elementRoot.classList.remove('flash');
        }
        return this;
    }

    /**
     * Load settings
     * @returns {object}
     */
    static loadSettings() {
        return {};
    }

    /**
     * Get singleton
     * @returns {Assistant}
     */
    static get() {
        if (!Assistant.instance) {
            let settings = Assistant.loadSettings();
            Assistant.instance = new Assistant(
                settings.draggable,
                settings.closable
            );
        }
        return Assistant.instance;
    }
}

window.assistant = Assistant.get();
