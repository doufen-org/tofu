'use strict';
import TabPanel from './ui/tab.js';
import Paginator from './ui/paginator.js';
import Storage from './storage.js';


const PAGE_SIZE = 50;


/**
 * Class PictureModal
 */
class PictureModal {
    constructor() {
        this.modal = document.querySelector('#picture-modal');
    }

    static get instance() {
        if (!PictureModal._instance) {
            let instance = PictureModal._instance = new PictureModal();
            instance.modal.querySelector('.modal-close')
                .addEventListener('click', () => PictureModal.close());
        }
        return PictureModal._instance;
    }

    static show(src) {
        let instance = PictureModal.instance;
        instance.modal.querySelector('.image>img').setAttribute('src', src);
        instance.modal.classList.add('is-active');
    }

    static close() {
        let instance = PictureModal.instance;
        instance.modal.classList.remove('is-active');
    }
}

/**
 * Class Panel
 */
class Panel {
    clear() {
        this.container.innerHTML = '';
    }

    async load(total) {
        throw new Error('Not implemented');
    }

    constructor(container, page, pageSize) {
        this.container = container;
        this.page = page;
        this.pageSize = pageSize;
        this.clear();
        $(container).on(
            'click',
            '.image.preview>img',
            event => PictureModal.show(event.currentTarget.dataset.src)
        );
    }

    static async render(tab, page = 1, pageSize = PAGE_SIZE) {
        const PANEL_CLASSES = {
            status: Status,
            interest: Interest,
            review: Review,
            note: Note,
            photo: Photo,
            following: Following,
            follower: Follower,
            doumail: Doumail,
            doulist: Doulist,
        };
        let name = tab.getAttribute('name');
        let panel = new (PANEL_CLASSES[name])(tab, page, pageSize);
        let total = await panel.load();
        let paginator = new Paginator(page, Math.ceil(total / pageSize));
        paginator.addEventListener('change', async event => {
            panel.clear();
            paginator.currentPage = panel.page = event.target.currentPage;
            await panel.load(total);
            paginator.load();
            paginator.appendTo(panel.container);
        })
        paginator.appendTo(panel.container);
    }
}


const TEMPLATE_STATUS = `\
<article class="media status">
  <figure class="media-left">
    <p class="image is-64x64 avatar"><img></p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <strong class="author name"></strong> <small class="author uid"></small> <span class="activity"></span>
        <br><small class="created"></small>
      </p>
      <p class="text"></p>
    </div>
    <div class="columns is-1 is-multiline images"></div>
    <div class="media box card is-hidden">
      <figure class="media-left">
        <p class="image"><img></p>
      </figure>
      <div class="media-content">
        <div class="content">
          <p class="title is-size-6"><a></a></p>
          <p class="subtitle is-size-7"></p>
        </div>
      </div>
    </div>
    <div class="level stat">
      <div class="level-left">
        <div class="level-item">
          <span class="icon">
            <i class="far fa-thumbs-up"></i>
          </span>
          <small class="likes"></small>
        </div>
        <div class="level-item">
          <span class="icon">
            <i class="fas fa-retweet"></i>
          </span>
          <small class="reshares"></small>
        </div>
        <div class="level-item">
          <span class="icon">
            <i class="far fa-comment-alt"></i>
          </span>
          <small class="comments"></small>
        </div>
        </div>
    </div>
  </div>
</article>`;


/**
 * Class Status
 */
class Status extends Panel {
    async load(total) {
        storage.local.open();
        let collection = await storage.local.status
            .orderBy('id').reverse()
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
        if (!total) {
            total = await storage.local.status.count();
        }
        storage.local.close();
        for (let {status, comments} of collection) {
            let $status = $(TEMPLATE_STATUS);
            $status.find('.avatar>img').attr('src', status.author.avatar);
            $status.find('.author.name').text(status.author.name);
            $status.find('.author.uid').text('@' + status.author.uid);
            $status.find('.activity').text(status.activity + "：");
            $status.find('.created').text(status.create_time);
            $status.find('.text').text(status.text);
            let $images = $status.find('.images');
            status.images.forEach(image => {
                $images.append(`\
<div class="column is-one-third">
  <figure class="image preview is-128x128">
    <img src="${image.normal.url}" data-src="${image.large.url}">
  </figure>
</div>`
                );
            });
            $status.find('.likes').text(status.like_count);
            $status.find('.reshares').text(status.reshares_count);
            $status.find('.comments').text(status.comments_count);
            if (status.card) {
                let $card = $status.find('.card');
                let card = status.card;
                $card.removeClass('is-hidden');
                if (card.card_style == 'obsolete') {
                    $card.find('.subtitle').text(card.obsolete_msg);
                } else {
                    if (card.image) {
                        $card.find('.image>img').attr('src', card.image.normal.url);
                    }
                    let $title = $card.find('.title>a');
                    $title.text(card.title);
                    $title.attr('href', card.url);
                    $card.find('.subtitle').text(card.subtitle);
                }
            }
            $status.appendTo(this.container);
        }
        return total;
    }
}


/**
 * Class Interest
 */
class Interest extends Panel {
    
}


/**
 * Class Review
 */
class Review extends Panel {
    
}


/**
 * Class Note
 */
class Note extends Panel {
    
}


/**
 * Class Photo
 */
class Photo extends Panel {
    
}


const TEMPLATE_USER_INFO = `\
<article class="media">
  <figure class="media-left">
    <p class="image is-64x64 avatar">
      <a class="user-url" target="_blank"><img></a>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="user-url" target="_blank"><strong class="username"></strong></a>
        <small class="user-symbol"></small>
        <small class="is-hidden">(<span class="remark"></span>)</small>
        <br>
        <small class="is-hidden">常居：<span class="loc"></span></small>
        <br>
        <small class="is-hidden">签名：<span class="signature"></span></small>
        <br>
        <small class="is-hidden">被 <span class="followers"></span> 人关注</small>
        <small class="is-hidden">关注 <span class="following"></span> 人</small>
        <small class="followed is-hidden">已关注</small>
      </p>
    </div>
    <div class="columns user-data"></div>
  </div>
</article>`;


/**
 * Class Following
 */
class Following extends Panel {
    async load(total) {
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'following',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.following.where({ version: version })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
        if (!total) {
            total = await storage.local.following.where({ version: version }).count();
        }
        storage.local.close();

        for (let {user} of collection) {
            let $userInfo = $(TEMPLATE_USER_INFO);
            $userInfo.find('.avatar img').attr('src', user.avatar);
            $userInfo.find('.user-url').attr('href', user.url);
            $userInfo.find('.username').text(user.name);
            $userInfo.find('.user-symbol').text('@' + user.uid);
            user.following_count && $userInfo.find('.following').text(user.following_count).parent().removeClass('is-hidden');
            user.followers_count && $userInfo.find('.followers').text(user.followers_count).parent().removeClass('is-hidden');
            user.loc && $userInfo.find('.loc').text(user.loc.name).parent().removeClass('is-hidden');
            user.remark && $userInfo.find('.remark').text(user.remark).parent().removeClass('is-hidden');
            user.signature && $userInfo.find('.signature').text(user.signature).parent().removeClass('is-hidden');
            $userInfo.appendTo(this.container);
        }

        return total;
    }
}


/**
 * Class Follower
 */
class Follower extends Panel {
    async load(total) {
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'follower',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.follower.where({ version: version })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
        if (!total) {
            total = await storage.local.follower.where({ version: version }).count();
        }
        storage.local.close();

        for (let {user} of collection) {
            let $userInfo = $(TEMPLATE_USER_INFO);
            $userInfo.find('.avatar img').attr('src', user.avatar);
            $userInfo.find('.user-url').attr('href', user.url);
            $userInfo.find('.username').text(user.name);
            $userInfo.find('.user-symbol').text('@' + user.uid);
            user.loc && $userInfo.find('.loc').text(user.loc.name).parent().removeClass('is-hidden');
            user.following_count && $userInfo.find('.following').text(user.following_count).parent().removeClass('is-hidden');
            user.followers_count && $userInfo.find('.followers').text(user.followers_count).parent().removeClass('is-hidden');
            user.signature && $userInfo.find('.signature').text(user.signature).parent().removeClass('is-hidden');
            $userInfo.appendTo(this.container);
        }

        return total;
    }
}


/**
 * Class Doumail
 */
class Doumail extends Panel {
    
}


/**
 * Class Doulist
 */
class Doulist extends Panel {
    
}

let storage = new Storage(location.search.substr(1));
let tab = TabPanel.render();
tab.addEventListener('toggle', async event => await Panel.render(event.target.activeTab));
Panel.render(tab.activeTab);
