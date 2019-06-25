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
        this.userId = parseInt(location.search.substr(1));
        this.clear();
        $(container).on(
            'click',
            '.image.preview>img',
            event => PictureModal.show(event.currentTarget.dataset.src)
        );
    }

    get storage() {
        return new Storage(this.userId);
    }

    paging() {
        let page = this.page;
        let total = this.total;
        let pageSize = this.pageSize;
        let panel = this;

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

    static async render(tab, page = 1, pageSize = PAGE_SIZE) {
        const PANEL_CLASSES = {
            status: Status,
            interest: Interest,
            review: Review,
            note: Note,
            photo: Photo,
            follow: Follow,
            doumail: Doumail,
            doulist: Doulist,
        };
        let name = tab.getAttribute('name');
        let panel = new (PANEL_CLASSES[name])(tab, page, pageSize);
        panel.total = await panel.load();
        panel.paging();
    }
}


/**
 * Class SegmentsPanel
 */
class SegmentsPanel extends Panel {
    onToggle($target) {
        throw new Error('Not implemented');
    }

    constructor(container, page, pageSize) {
        let segments = container.querySelector('.segments.tabs');
        container = container.querySelector('.sub-container');
        super(container, page, pageSize);
        this.segments = segments;
        let $segmentLinks = $(this.segments).find('ul>li a');
        $segmentLinks.parent().removeClass('is-active');
        this.segments.querySelector('ul>li').classList.add('is-active');
        $segmentLinks.off('click');
        $segmentLinks.on('click', async event => {
            let $target = $(event.currentTarget);
            $segmentLinks.parent().removeClass('is-active');
            $target.parent().addClass('is-active');
            this.onToggle($target);
            this.clear();
            this.total = await this.load();
            this.paging();
        });
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
    <div class="box content topic is-hidden">
      <p>
        话题：<a class="topic-title" target="_blank" title="前往豆瓣查看"></a>
        <small class="topic-subtitle"></small>
      </p>
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
      <div class="level-right">
        <div class="level-item">
          <a class="status-url" target="_blank" title="前往豆瓣查看">
            <span class="icon">
              <i class="fas fa-external-link-alt"></i>
            </span>
          </a>
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
        let storage = this.storage;
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
            $status.find('.status-url').attr('href', status.sharing_url);
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
            if (status.topic) {
                let $topic = $status.find('.topic');
                let topic = status.topic;
                $topic.find('.topic-title').text(topic.title).attr('href', topic.url);
                $topic.find('.topic-subtitle').text(topic.card_subtitle);
                $topic.removeClass('is-hidden');
            }
            $status.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_ENTRY = `\
<article class="media subject">
  <figure class="media-left">
    <p class="image subject-cover">
      <a class="subject-url" target="_blank" title="前往豆瓣查看"><img></a>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="subject-url title is-size-5" target="_blank" title="前往豆瓣查看"></a>
        <span class="rating">
          <label><span class="rating-count"></span>人评价</label>
          <label>豆瓣评分：<span class="rating-value is-size-4 has-text-danger"></span></label>
        </span>
      </p>
      <p class="subtitle is-size-6"></p>
    </div>
    <div class="box content my-rating">
      <p>
        <small class="create-time"></small>
        <small>标签：<span class="my-tags"></span></small><br>
        <span class="my-comment"></span>
      </p>
    </div>
  </div>
</article>`;


/**
 * Class Interest
 */
class Interest extends SegmentsPanel {
    onToggle($target) {
        this.type = $target.data('type');
        this.status = $target.data('status');
    }

    constructor(container, page, pageSize) {
        super(container, page, pageSize);
        this.type = 'movie';
        this.status = 'done';
    }

    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'interest',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.interest
            .where({ version: version, type: this.type, status: this.status })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.interest
                .where({ version: version, type: this.type, status: this.status })
                .count();
        }
        storage.local.close();
        for (let entry of collection) {
            let $entry = $(TEMPLATE_ENTRY);
            $entry.find('.subject-cover img').attr('src', entry.subject.pic.normal);
            $entry.find('.title').text(entry.subject.title);
            $entry.find('.subject-url').attr('href', entry.subject.url);
            if (entry.subject.null_rating_reason) {
                $entry.find('.rating').text(entry.subject.null_rating_reason);
            } else {
                $entry.find('.rating-value').text(entry.subject.rating.value.toFixed(1));
                $entry.find('.rating-count').text(entry.subject.rating.count);
            }
            $entry.find('.subtitle').text(entry.subject.card_subtitle);
            $entry.find('.create-time').text(entry.create_time);
            $entry.find('.my-comment').text(entry.comment);
            $entry.find('.my-tags').text(entry.tags);
            $entry.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_REVIEW = `\
<article class="media subject">
  <figure class="media-left">
    <p class="image subject-cover">
      <a class="subject-url" target="_blank" title="前往豆瓣查看"><img></a>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="subject-url title is-size-5" target="_blank" title="前往豆瓣查看"></a>
        <span class="rating">
          <label><span class="rating-count"></span>人评价</label>
          <label>豆瓣评分：<span class="rating-value is-size-4 has-text-danger"></span></label>
        </span>
      </p>
      <p class="subtitle is-size-6"></p>
    </div>
    <div class="box content review">
      <p>
        <a class="review-title review-url is-size-5" target="_blank" title="前往豆瓣查看"></a>
        <small>我的评分：<span class="my-rating is-size-5 has-text-danger"></span></small><br>
        <small class="create-time"></small>
        <span class="tag is-normal useful"></span>
        <span class="tag is-normal useless"></span>
        <span class="tag is-normal comments"></span>
        <span class="tag is-normal reads"></span>
      </p>
      <p class="abstract"></p>
      <p class="has-text-centered"><a class="button">查看全部</a></p>
    </div>
  </div>
</article>`;


/**
 * Class Review
 */
class Review extends SegmentsPanel {
    onToggle($target) {
        this.type = $target.data('type');
    }

    constructor(container, page, pageSize) {
        super(container, page, pageSize);
        this.type = 'movie';
    }

    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'review',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.review
            .where({ version: version, type: this.type })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.review
                .where({ version: version, type: this.type })
                .count();
        }
        storage.local.close();
        for (let {review} of collection) {
            let $review = $(TEMPLATE_REVIEW);
            $review.find('.subject-cover img').attr('src', review.subject.pic.normal);
            $review.find('.subject-url').attr('href', review.subject.url);
            $review.find('.title').text(review.subject.title);
            $review.find('.review-title').text(review.title);
            $review.find('.review-url').attr('href', review.url);
            $review.find('.subtitle').text(review.subject.card_subtitle);
            if (review.subject.null_rating_reason) {
                $review.find('.rating').text(review.subject.null_rating_reason);
            } else {
                $review.find('.rating-value').text(review.subject.rating.value.toFixed(1));
                $review.find('.rating-count').text(review.subject.rating.count);
            }
            $review.find('.create-time').text(review.create_time);
            if (review.rating) {
                $review.find('.my-rating').text(review.rating.value);
            } else {
                $review.find('.my-rating').parent().addClass('is-hidden');
            }
            $review.find('.useful').text('有用 ' + review.useful_count);
            $review.find('.useless').text('没用 ' + review.useless_count);
            $review.find('.comments').text(review.comments_count + ' 回应');
            $review.find('.reads').text(review.read_count + ' 阅读');
            $review.find('.abstract').text(review.abstract);
            $review.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_NOTE = `\
<article class="media note">
  <div class="media-content">
    <div class="content">
      <p>
        <a class="title is-size-5" target="_blank" title="前往豆瓣查看"></a>
        <br>
        <small class="create-time"></small>
        <span class="tag is-normal comments"></span>
        <span class="tag is-normal reads"></span>
      </p>
      <p class="abstract"></p>
      <p><a class="button">查看全部</a></p>
    </div>
  </div>
  <figure class="media-right is-hidden">
    <p class="image cover">
      <img>
    </p>
  </figure>
</article>
`;


/**
 * Class Note
 */
class Note extends Panel {
    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'note',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.note
            .where({ version: version })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.note
                .where({ version: version })
                .count();
        }
        storage.local.close();
        for (let {note} of collection) {
            let $note = $(TEMPLATE_NOTE);
            $note.find('.title').text(note.title).attr('href', note.url);
            $note.find('.create-time').text(note.create_time);
            note.cover_url && $note.find('.media-right .image>img')
                .attr('src', note.cover_url)
                .parents('.media-right').removeClass('is-hidden');
            $note.find('.comments').text(note.comments_count + ' 回应');
            $note.find('.reads').text(note.read_count + ' 阅读');
            $note.find('.abstract').text(note.abstract);
            $note.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_ALBUMS = '<div class="columns is-multiline"></div>';
const TEMPLATE_ALBUM = `\
<div class="column album is-one-quarter">
  <figure class="image is-fullwidth" style="margin-bottom: 0.5rem;">
    <img>
  </figure>
  <p class="has-text-centered">
    <span class="title is-size-6 has-text-weight-normal"></span>
    (<small class="total"></small>)<br>
    <small class="create-time"></small>
  </p>
  <p class="subtitle is-size-7 description"></p>
</div>`;

/**
 * Class Photo
 */
class Photo extends Panel {
    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let collection = await storage.local.album
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.album.count();
        }
        storage.local.close();
        let $albums = $(TEMPLATE_ALBUMS);
        for (let {album} of collection) {
            let $album = $(TEMPLATE_ALBUM);
            $album.find('.image>img').attr('src', album.cover_url);
            $album.find('.title').text(album.title);
            $album.find('.total').text(album.photos_count);
            $album.find('.description').text(album.description);
            $album.find('.create-time').text(album.create_time);
            $album.appendTo($albums);
        }
        $albums.appendTo(this.container);
        return total;
    }
}


const TEMPLATE_USER_INFO = `\
<article class="media">
  <figure class="media-left">
    <p class="image is-64x64 avatar">
      <a class="user-url" target="_blank" title="前往豆瓣查看"><img></a>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="user-url" target="_blank" title="前往豆瓣查看"><strong class="username"></strong></a>
        <small class="user-symbol"></small>
        <small class="is-hidden">(<span class="remark"></span>)</small>
        <small class="is-hidden"><br>常居：<span class="loc"></span></small>
        <small class="is-hidden"><br>签名：<span class="signature"></span></small>
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
        let storage = this.storage;
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
        let storage = this.storage;
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
 * Class Blacklist
 */
class Blacklist extends Panel {
    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'blacklist',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let version = versionInfo.version;
        let collection = await storage.local.blacklist.where({ version: version })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
        if (!total) {
            total = await storage.local.blacklist.where({ version: version }).count();
        }
        storage.local.close();

        for (let {user} of collection) {
            let $userInfo = $(TEMPLATE_USER_INFO);
            $userInfo.find('.avatar img').attr('src', user.avatar);
            $userInfo.find('.user-url').attr('href', user.url);
            $userInfo.find('.username').text(user.name);
            $userInfo.find('.user-symbol').text('@' + user.uid);
            $userInfo.appendTo(this.container);
        }

        return total;
    }
}


/**
 * Class Follow
 */
class Follow extends SegmentsPanel {
    onToggle($target) {
        switch ($target.data('type')) {
            case 'following':
                this.target = new Following(this.container, this.page, this.pageSize);
                break;
            case 'follower':
                this.target = new Follower(this.container, this.page, this.pageSize);
                break;
            case 'blacklist':
                this.target = new Blacklist(this.container, this.page, this.pageSize);
                break;
        }
    }

    constructor(container, page, pageSize) {
        super(container, page, pageSize);
        this.target = new Following(this.container, page, pageSize);
    }

    async load(total) {
        return await this.target.load(total);
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


let tab = TabPanel.render();
tab.addEventListener('toggle', async event => await Panel.render(event.target.activeTab));
Panel.render(tab.activeTab);
