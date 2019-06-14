'use strict';

const ACCOUNT_TEMPLATE = `\
<a class="panel-block">
<span class="panel-icon">
    <i class="fas fa-user"></i>
</span>
marksheet
</a>`;


class Panel {
    constructor(selector) {
        this.element = document.querySelector(selector);
    }

    clear() {

    }

    load() {

    }

    remove() {

    }

    static setup() {
        let panel = new Panel('#acounts');
        panel.load();
    }
}

Panel.setup();
