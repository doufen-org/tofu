'use strict';
import Storage from './storage.js';


const ACCOUNT_TEMPLATE = `\
<article class="media box">
  <figure class="media-left">
    <p class="image is-64x64">
      <img src="https://bulma.io/images/placeholders/128x128.png">
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <strong>John Smith</strong> <small>@johnsmith</small> <small>31m</small>
        <br>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ornare magna eros, eu pellentesque tortor vestibulum ut. Maecenas non massa sem. Etiam finibus odio quis feugiat facilisis.
      </p>
    </div>
    <nav class="level is-mobile">
      <div class="level-left">
        <a class="level-item">
          <span class="icon is-small"><i class="fas fa-reply"></i></span>
        </a>
        <a class="level-item">
          <span class="icon is-small"><i class="fas fa-retweet"></i></span>
        </a>
        <a class="level-item">
          <span class="icon is-small"><i class="fas fa-heart"></i></span>
        </a>
      </div>
    </nav>
  </div>
  <div class="media-right">
    <button class="delete"></button>
  </div>
</article>`;


class Panel {
    constructor(selector) {
        this.element = document.querySelector(selector);
    }

    clear() {
        this.element.querySelectorAll('.media').forEach(row => {
            row.remove();
        });
    }

    async load() {
        let storage = new Storage();
        await storage.global.open();
        let accounts = await storage.global.account.toArray();
        storage.global.close();

        if (accounts.length > 0) {
            let $panel = $(this.element);
            accounts.forEach(account => {
                $(ACCOUNT_TEMPLATE).appendTo($panel);
            });
        }
    }

    remove() {

    }

    static async setup() {
        let panel = new Panel('#accounts');
        await panel.load();
    }
}

Panel.setup();
