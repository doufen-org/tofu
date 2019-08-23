'use strict';
import TabPanel from './ui/tab.js';
import Paginator from './ui/paginator.js';
import Storage from './storage.js';


const PAGE_SIZE = 50;


/**
 * Class Modal
 */
class Modal {
    constructor(selector) {
        this.modal = document.querySelector(selector);
    }

    static get instance() {
        if (!this._instance) {
            let instance = this._instance = new this();
            instance.modal.querySelector('.modal-close')
                .addEventListener('click', () => this.close());
        }
        return this._instance;
    }

    static show() {
        this.instance.modal.classList.add('is-active');
    }

    static close() {
        let instance = this.instance;
        instance.modal.classList.remove('is-active');
    }
}


/**
 * Class PictureModal
 */
class PictureModal extends Modal {
    constructor() {
        super('#picture-modal');
    }

    static show(src) {
        this.instance.modal.querySelector('.image>img').setAttribute('src', src);
        super.show();
    }
}


/**
 * Class MinorModal
 */
class MinorModal extends Modal {
    constructor() {
        super('#minor-modal');
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
            photo: PhotoAlbum,
            follow: Follow,
            doumail: DoumailContact,
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
    <div class="reshared-status is-hidden" style="margin-bottom: 1rem;"></div>
    <div class="columns is-1 is-multiline images is-hidden"></div>
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
    <div class="content topic is-hidden">
      <p>
      <span class="icon">
        <i class="fas fa-hashtag"></i>
      </span>
        <a class="topic-title" target="_blank" title="前往豆瓣查看"></a>
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


const TEMPLATE_RESHARED_STATUS = `\
<article class="media status box">
  <figure class="media-left">
    <p class="image is-48x48 avatar"><img></p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p class="is-size-7">
        <strong class="author name"></strong> <small class="author uid"></small> <span class="activity"></span>
        <br><small class="created"></small>
      </p>
      <p class="text is-size-7"></p>
    </div>
    <div class="columns is-1 is-multiline images is-hidden"></div>
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
            if (status.parent_status) {
                let parentStatus = status.parent_status;
                let $statusText = $status.find('.text');
                $statusText.append($('<span>').text(status.text))
                    .append('<span class="icon"><i class="fas fa-retweet"></i></span>');
                if (parentStatus.deleted) {
                    $statusText.append(parentStatus.msg);
                } else {
                    $statusText.append($(`<a>`).text(parentStatus.author.name).attr('href', parentStatus.author.url))
                        .append(': ')
                        .append($('<span>').text(parentStatus.text));
                }
            } else {
                $status.find('.text').text(status.text);
            }
            $status.find('.status-url').attr('href', status.sharing_url);
            if (status.images && status.images.length > 0) {
                let $images = $status.find('.images').removeClass('is-hidden');
                status.images.forEach(image => {
                    $images.append(`\
<div class="column is-one-third">
  <figure class="image preview is-128x128">
    <img src="${image.normal.url}" data-src="${image.large.url}">
  </figure>
</div>`
                    );
                });
            }
            $status.find('.likes').text(status.like_count);
            $status.find('.reshares').text(status.reshares_count);
            $status.find('.comments').text(status.comments_count);
            if (status.card) {
                let $card = $status.find('.card').removeClass('is-hidden');
                let card = status.card;
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
            if (status.reshared_status) {
                let $resharedStatus;
                let resharedStatus = status.reshared_status;
                let $container = $status.find('.reshared-status').removeClass('is-hidden');
                if (resharedStatus.deleted) {
                    $resharedStatus = $(`<article class="box">${resharedStatus.msg}</article>`);
                } else {
                    $resharedStatus = $(TEMPLATE_RESHARED_STATUS);
                    $resharedStatus.find('.avatar>img').attr('src', resharedStatus.author.avatar);
                    $resharedStatus.find('.author.name').text(resharedStatus.author.name);
                    $resharedStatus.find('.author.uid').text('@' + resharedStatus.author.uid);
                    $resharedStatus.find('.activity').text(resharedStatus.activity + "：");
                    $resharedStatus.find('.created').text(resharedStatus.create_time);
                    $resharedStatus.find('.text').text(resharedStatus.text);
                    if (resharedStatus.images && resharedStatus.images.length > 0) {
                        let $images = $resharedStatus.find('.images').removeClass('is-hidden');
                        resharedStatus.images.forEach(image => {
                            $images.append(`\
<div class="column is-one-third">
    <figure class="image preview is-128x128">
    <img src="${image.normal.url}" data-src="${image.large.url}">
    </figure>
</div>`
                            );
                        });
                    }
                    if (resharedStatus.card) {
                        let $card = $resharedStatus.find('.card').removeClass('is-hidden');
                        let card = resharedStatus.card;
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
                }
                $container.append($resharedStatus);
            }
            $status.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_INTEREST = `\
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
        <small>我的评分：<span class="my-rating-value is-size-5 has-text-danger"></span></small>
        <small>标签：<span class="my-tags"></span></small>
        <br>
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
        let currentVersion = versionInfo.version;
        let collection = await storage.local.interest
            //.where({ version: currentVersion, type: this.type, status: this.status })
            .where({ type: this.type, status: this.status })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.interest
                //.where({ version: currentVersion, type: this.type, status: this.status })
                .where({ type: this.type, status: this.status })
                .count();
        }
        storage.local.close();
        for (let {interest, version} of collection) {
            let $interest = $(TEMPLATE_INTEREST);
            let subject = interest.subject;
            $interest.find('.subject-cover img').attr('src', subject.pic.normal);
            $interest.find('.title').text(subject.title);
            $interest.find('.subject-url').attr('href', subject.url);
            if (interest.subject.null_rating_reason) {
                $interest.find('.rating').text(subject.null_rating_reason);
            } else {
                $interest.find('.rating-value').text(subject.rating.value.toFixed(1));
                $interest.find('.rating-count').text(subject.rating.count);
            }
            $interest.find('.subtitle').text(subject.card_subtitle);
            $interest.find('.create-time').text(interest.create_time);
            $interest.find('.my-comment').text(interest.comment);
            $interest.find('.my-tags').text(interest.tags);
            interest.rating && $interest.find('.my-rating-value').text(interest.rating.value);
            version < currentVersion && $interest.addClass('is-obsolete');
            $interest.appendTo(this.container);
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
        <a class="review-title review-url is-size-5" target="_blank"></a>
        <small>我的评分：<span class="my-rating is-size-5 has-text-danger"></span></small><br>
        <small><span class="create-time"></span> 发布<span class="type-name"></span></small>
        <span class="tag is-normal useful"></span>
        <span class="tag is-normal useless"></span>
        <span class="tag is-normal comments"></span>
        <span class="tag is-normal reads"></span>
      </p>
      <p class="abstract"></p>
    </div>
  </div>
</article>`;


/**
 * Class Review
 */
class Review extends SegmentsPanel {
    async showReview(reviewId, version) {
        let storage = this.storage;
        storage.local.open();
        let { review } = await storage.local.review.get({ id: reviewId });
        storage.local.close();
        let container = MinorModal.instance.modal.querySelector('.box');
        container.innerHTML = '';
        let $article = $(TEMPLATE_ARTICLE);
        $article.find('.title').text(review.title);
        $article.find('.content').html(review.fulltext);
        $article.appendTo(container);
        MinorModal.show();
    }

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
        let currentVersion = versionInfo.version;
        let collection = await storage.local.review
            //.where({ version: currentVersion, type: this.type })
            .where({ type: this.type })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.review
                //.where({ version: currentVersion, type: this.type })
                .where({ type: this.type })
                .count();
        }
        storage.local.close();
        for (let {id, version, review} of collection) {
            let $review = $(TEMPLATE_REVIEW);
            $review.find('.subject-cover img').attr('src', review.subject.pic.normal);
            $review.find('.subject-url').attr('href', review.subject.url);
            $review.find('.title').text(review.subject.title);
            $review.find('.review-title').text(review.title).click(async event => {
                event.preventDefault();
                await this.showReview(id, currentVersion);
                return false;
            });
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
            $review.find('.type-name').text(review.type_name);
            version < currentVersion && $review.addClass('is-obsolete');
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
        <a class="title is-size-5" target="_blank"></a>
        <br>
        <small class="create-time"></small>
        <span class="tag is-normal comments"></span>
        <span class="tag is-normal reads"></span>
      </p>
      <p class="abstract"></p>
    </div>
  </div>
  <figure class="media-right is-hidden">
    <p class="image cover">
      <img>
    </p>
  </figure>
</article>`;


const TEMPLATE_ARTICLE = `\
<div class="content article">
    <h1 class="title"></h1>
    <div class="content"></div>
</div>`;


/**
 * Class Note
 */
class Note extends Panel {
    async showNote(noteId, version) {
        let storage = this.storage;
        storage.local.open();
        let { note } = await storage.local.note.get({ id: noteId });
        storage.local.close();
        let container = MinorModal.instance.modal.querySelector('.box');
        container.innerHTML = '';
        let $article = $(TEMPLATE_ARTICLE);
        $article.find('.title').text(note.title);
        $article.find('.content').html(note.fulltext);
        $article.appendTo(container);
        MinorModal.show();
    }

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
        let currentVersion = versionInfo.version;
        let collection = await storage.local.note
            //.where({ version: currentVersion })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.note
                //.where({ version: currentVersion })
                .count();
        }
        storage.local.close();
        for (let {id, version, note} of collection) {
            let $note = $(TEMPLATE_NOTE);
            $note.find('.title').text(note.title).attr('href', note.url).click(async event => {
                event.preventDefault();
                await this.showNote(id, version);
                return false;
            });
            $note.find('.create-time').text(note.create_time);
            note.cover_url && $note.find('.media-right .image>img')
                .attr('src', note.cover_url)
                .parents('.media-right').removeClass('is-hidden');
            $note.find('.comments').text(note.comments_count + ' 回应');
            $note.find('.reads').text(note.read_count + ' 阅读');
            $note.find('.abstract').text(note.abstract);
            version < currentVersion && $note.addClass('is-obsolete');
            $note.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_COLUMNS = '<div class="columns is-multiline"></div>';
const TEMPLATE_ALBUM = `\
<div class="column album is-one-quarter">
  <figure class="image is-fullwidth" style="margin-bottom: 0.5rem;">
    <a class="album-url"><img></a>
  </figure>
  <p class="has-text-centered">
    <a class="album-url title is-size-6 has-text-weight-normal"></a>
    (<small class="total"></small>)<br>
    <small class="create-time"></small>
  </p>
  <p class="subtitle is-size-7 description"></p>
</div>`;
const TEMPLATE_PHOTO = `\
<div class="column photo is-one-quarter">
  <figure class="image is-fullwidth" style="margin-bottom: 0.5rem; max-height: 170px; overflow: hidden;">
    <a class="album-url"><img></a>
  </figure>
  <p class="subtitle is-size-7 description"></p>
</div>`;

/**
 * Class PhotoAlbum
 */
class PhotoAlbum extends Panel {
    async showAlbum(albumId) {
        let container = MinorModal.instance.modal.querySelector('.box');
        let panel = new Photo(container, 1, 40);
        MinorModal.show();
        panel.album = albumId;
        panel.total = await panel.load();
        panel.paging();
    }

    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'photo',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let currentVersion = versionInfo.version;
        let collection = await storage.local.album
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.album.count();
        }
        storage.local.close();
        let $albums = $(TEMPLATE_COLUMNS);
        for (let {id, album, version } of collection) {
            let $album = $(TEMPLATE_ALBUM);
            $album.find('.image img').attr('src', album.cover_url);
            $album.find('.title').text(album.title);
            $album.find('.total').text(album.photos_count);
            $album.find('.description').text(album.description);
            $album.find('.create-time').text(album.create_time);
            $album.find('.album-url').attr('href', album.url).click(async event => {
                event.preventDefault();
                await this.showAlbum(id);
                return false;
            });
            version < currentVersion && $album.addClass('is-obsolete');
            $album.appendTo($albums);
        }
        $albums.appendTo(this.container);
        return total;
    }
}


/**
 * Class Photo
 */
class Photo extends Panel {
    async load(total) {
        let albumId = this.album;
        let storage = this.storage;
        storage.local.open();
        let versionInfo = await storage.local.table('version').get({
            table: 'photo',
        });
        if (!versionInfo) {
            storage.local.close();
            return 0;
        }
        let currentVersion = versionInfo.version;
        let collection = await storage.local.photo
            .where({album: albumId})
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.photo
                .where({album: albumId})
                .count();
        }
        storage.local.close();
        let $photos = $(TEMPLATE_COLUMNS);
        for (let { photo, version } of collection) {
            let $photo = $(TEMPLATE_PHOTO);
            $photo.find('.image img').attr('src', photo.cover).click(() => {
                PictureModal.show(photo.raw);
            });
            $photo.find('.description').text(photo.description);
            version < currentVersion && $photo.addClass('is-obsolete');
            $photo.appendTo($photos);
            
        }
        $photos.appendTo(this.container);
        return total;
    }
}


const TEMPLATE_USER_INFO = `\
<article class="media user">
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
                this.target = new Following(this.container, 1, this.pageSize);
                break;
            case 'follower':
                this.target = new Follower(this.container, 1, this.pageSize);
                break;
            case 'blacklist':
                this.target = new Blacklist(this.container, 1, this.pageSize);
                break;
        }
    }

    get page() {
        return this.target.page;
    }

    set page(value) {
        this.target && (this.target.page = value);
    }

    constructor(container, page, pageSize) {
        super(container, page, pageSize);
        this.target = new Following(this.container, page, pageSize);
    }

    async load(total) {
        return await this.target.load(total);
    }
}


const TEMPLATE_DOUMAIL_CONTACT = `\
<article class="media contact">
  <figure class="media-left">
    <p class="image is-48x48 avatar">
      <a class="doumail-url" target="_blank" title="前往豆瓣查看"><img></a>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="doumail-url username" target="_blank"></a>
        <br>
        <span class="abstract"></span>
      </p>
    </div>
    <div class="columns user-data"></div>
  </div>
  <div class="media-right">
    <span class="time"></span>
  </div>
</article>`;


/**
 * Class DoumailContact
 */
class DoumailContact extends Panel {
    async showDoumail(contactId) {
        let container = MinorModal.instance.modal.querySelector('.box');
        let panel = new Doumail(container, 1, PAGE_SIZE);
        MinorModal.show();
        panel.contact = contactId;
        panel.total = await panel.load();
        panel.paging();
    }

    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let collection = await storage.local.doumailContact
            .orderBy('rank').reverse()
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
        if (!total) {
            total = await storage.local.doumailContact.count();
        }
        storage.local.close();
        for (let {id, contact, abstract, time, url} of collection) {
            let $contact = $(TEMPLATE_DOUMAIL_CONTACT);
            contact.avatar && $contact.find('.avatar img').attr('src', contact.avatar);
            $contact.find('.doumail-url').attr('href', url).click(async event => {
                event.preventDefault();
                await this.showDoumail(id);
                return false;
            });
            $contact.find('.username').text(contact.name);
            $contact.find('.abstract').text(abstract);
            $contact.find('.time').text(time);
            $contact.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_DOUMAIL = `\
<article class="media doumail">
  <figure class="media-left">
    <p class="image is-48x48 avatar">
      <a class="sender-url" target="_blank" title="前往豆瓣查看"><img></a>
    </p>
  </figure>
  <div class="media-content">
    <a class="sender-url sender" target="_blank"></a><br>
    <small class="datetime"></small>
    <div class="content"></div>
  </div>
  <div class="media-right">
  </div>
</article>`;


/**
 * Class Doumail
 */
class Doumail extends Panel {
    async load(total) {
        let contactId = this.contact;
        let storage = this.storage;
        storage.local.open();
        let collection = await storage.local.doumail
            .where({contact: contactId})
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
        if (!total) {
            total = await storage.local.doumail
                .where({contact: contactId})
                .count();
        }
        storage.local.close();
        for (let mail of collection) {
            let $mail = $(TEMPLATE_DOUMAIL);
            $mail.find('.avatar img').attr('src', mail.sender.avatar);
            $mail.find('.datetime').text(mail.datetime);
            $mail.find('.sender').text(mail.sender.name);
            $mail.find('.content').html(mail.content);
            $mail.find('.sender-url').attr('href', mail.sender.url);
            $mail.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_DOULIST = `\
<article class="media doulist">
  <figure class="media-left">
    <p class="image cover">
      <img>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="title is-size-6" target="_blank"></a>
        <span class="is-private icon is-hidden">
          <i class="fas fa-lock"></i>
        </span>
        <small>(<span class="items-count"></span>)</small><br>
        <small>作者：<a class="author" target="_blank"></a></small>
        <small>创建于 <span class="create-time"></span></small>
        <small>更新于 <span class="update-time"></span></small><br>
        <small>标签：<span class="doulist-tags"></span></small>
        <small>分类：<span class="category"></span></small>
      </p>
      <p class="description is-size-7"></p>
    </div>
  </div>
</article>`;


/**
 * Class Doulist
 */
class Doulist extends SegmentsPanel {
    onToggle($target) {
        this.type = $target.data('type');
    }

    constructor(container, page, pageSize) {
        super(container, page, pageSize);
        this.type = 'owned';
    }

    async showDoulist(doulistId) {
        let container = MinorModal.instance.modal.querySelector('.box');
        let panel = new DoulistItem(container, 1, PAGE_SIZE);
        MinorModal.show();
        panel.doulist = doulistId;
        panel.total = await panel.load();
        panel.paging();
    }

    async load(total) {
        let storage = this.storage;
        storage.local.open();
        let collection = await storage.local.doulist
            .where({ type: this.type })
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.doulist
                .where({ type: this.type })
                .count();
        }
        storage.local.close();
        for (let {id, doulist} of collection) {
            let $doulist = $(TEMPLATE_DOULIST);
            $doulist.find('.cover img').attr('src', doulist.cover_url);
            $doulist.find('.title').text(doulist.title).attr('href', doulist.url).click(async event => {
                event.preventDefault();
                await this.showDoulist(id);
                return false;
            });
            $doulist.find('.author').text(doulist.owner.name).attr('href', doulist.owner.url);
            $doulist.find('.create-time').text(doulist.create_time);
            doulist.is_private && $doulist.find('.is-private').removeClass('is-hidden');
            $doulist.find('.update-time').text(doulist.update_time);
            $doulist.find('.doulist-tags').text(doulist.tags);
            $doulist.find('.items-count').text(doulist.items_count);
            $doulist.find('.description').text(doulist.desc);
            $doulist.find('.category').text(doulist.category);
            $doulist.appendTo(this.container);
        }
        return total;
    }
}


const TEMPLATE_DOULIST_ITEM = `\
<article class="media doulist-item">
  <figure class="media-left is-hidden">
    <p class="image picture">
      <img>
    </p>
  </figure>
  <div class="media-content">
    <div class="content">
      <p>
        <a class="title is-size-6" target="_blank"></a>
        <small>来源：<span class="source"></span></small>
      </p>
      <p class="abstract is-size-7"></p>
      <p class="status-text is-size-7"></p>
      <div class="status-images columns is-multiline is-hidden"></div>
      <blockquote class="comment is-hidden"></blockquote>
    </div>
  </div>
</article>`;


/**
 * Class DoulistItem
 */
class DoulistItem extends Panel {
    async load(total) {
        let doulistId = this.doulist;
        let storage = this.storage;
        storage.local.open();
        let collection = await storage.local.doulistItem
            .where({doulist: doulistId})
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .reverse()
            .toArray();
        if (!total) {
            total = await storage.local.doulistItem
                .where({doulist: doulistId})
                .count();
        }
        storage.local.close();
        for (let {item} of collection) {
            let $item = $(TEMPLATE_DOULIST_ITEM);
            item.picture && $item.find('.picture>img').attr('src', item.picture)
                .parents('.media-left').removeClass('is-hidden');
            $item.find('.title').text(item.title).attr('href', item.url);
            $item.find('.abstract').text(item.abstract);
            $item.find('.source').text(item.source);
            item.comment && $item.find('.comment').text(item.comment).removeClass('is-hidden');
            if (item.extra.status) {
                $item.find('.status-text').text(item.extra.status.text);
                let $images = $item.find('.status-images').removeClass('is-hidden');
                for (let src of item.extra.status.images) {
                    $images.append(`\
<div class="column is-one-quarter">
  <figure class="image preview is-128x128">
    <img src="${src}" data-src="${src}" style="overflow: hidden;">
  </figure>
</div>`
                    )
                }
            }
            $item.appendTo(this.container);
        }
        return total;
    }
}


/**
 * Class ExporModal
 */
class ExportModal {
    constructor(selector) {
        this.element = document.querySelector(selector);
    }

    static init() {
        let modal = new ExportModal('#export-modal');
        ExportModal.instance = modal;
        modal.element.querySelectorAll('.cancel').forEach(item => {
            item.addEventListener('click', () => modal.close());
        });
        $('.button[name="export"]').click(() => modal.open());
        modal.element.querySelector('.select-all').addEventListener('change', event => {
            modal.element.querySelectorAll('input[name="item"]').forEach(item => {
                item.checked = event.target.checked;
            });
        });
        modal.element.querySelector('.button[name="export"]').addEventListener('click', async () => {
            modal.close();
            let checkedItems = modal.element.querySelectorAll('input[name="item"]:checked');
            if (!checkedItems.length) return false;
            let items = new Array(checkedItems.length);
            for (let i = 0; i < checkedItems.length; i ++) {
                items[i] = checkedItems[i].value;
            }
            let $loading = $(`\
<div class="modal is-active">
  <div class="modal-background"></div>
  <div class="modal-content" style="width: 6rem;">
    <a class="button is-loading is-fullwidth is-large">Loading</a>
  </div>
</div>`
            );
            $loading.appendTo(document.body);
            let exporter = new Exporter();
            await exporter.export(items);
            exporter.save();
            $loading.remove();
        });
        return modal;
    }

    open() {
        this.element.classList.add('is-active');
    }

    close() {
        this.element.classList.remove('is-active');
    }
}


/**
 * Class Exporter
 */
class Exporter {
    constructor() {
        this.userId = parseInt(location.search.substr(1));
        this.workbook = XLSX.utils.book_new();
    }

    async exportInterest(storage) {
        let sheetNames = {
            'movie/done': '看过',
            'movie/doing': '在看',
            'movie/mark': '想看',
            'music/done': '听过',
            'music/doing': '在听',
            'music/mark': '想听',
            'book/done': '读过',
            'book/doing': '在读',
            'book/mark': '想读',
            'game/done': '玩过',
            'game/doing': '在玩',
            'game/mark': '想玩',
            'drama/done': '看过的舞台剧',
            'drama/mark': '想看的舞台剧',
        };
        for (let type of ['movie', 'music', 'book', 'game', 'drama']) {
            for (let status of ['done', 'doing', 'mark']) {
                let sheetName = sheetNames[`${type}/${status}`];
                if (!sheetName) continue;

                let collection = storage.local.interest
                    .where({ type: type, status: status })
                    .reverse();
                let data = [['标题', '简介', '豆瓣评分', '链接', '创建时间', '我的评分', '标签', '评论']];
                await collection.each(row => {
                    let {
                        subject,
                        tags,
                        rating,
                        comment,
                        create_time
                    } = row.interest;
                    data.push([
                        subject.title,
                        subject.card_subtitle,
                        subject.rating.value.toFixed(1),
                        subject.url,
                        create_time,
                        rating ? rating.value : '',
                        tags.toString(),
                        comment,
                    ]);
                });
                let worksheet = XLSX.utils.aoa_to_sheet(data);
                XLSX.utils.book_append_sheet(this.workbook, worksheet, sheetName);
            }
        }
    }

    async exportReview(storage) {
        let sheetNames = {'movie': '影评', 'music': '乐评', 'book': '书评', 'drama': '剧评', 'game': '游戏评论&攻略'};
        for (let type in sheetNames) {
            let collection = storage.local.review
                .where({ type: type })
                .reverse();
            let data = [['标题', '评论对象', '链接', '创建时间', '我的评分', '类型', '内容']];
            await collection.each(row => {
                let {
                    subject,
                    url,
                    rating,
                    fulltext,
                    title,
                    create_time,
                    type_name
                } = row.review;
                data.push([
                    title,
                    `《${subject.title}》`,
                    url,
                    create_time,
                    rating ? rating.value : '',
                    type_name,
                    fulltext,
                ]);
            });
            let worksheet = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(this.workbook, worksheet, sheetNames[type]);
        }
    }

    async exportStatus(storage) {
        let formatStatus = (status) => {
            if (status.deleted) {
                return status.msg;
            }
            let text = `${status.author.name}(@${status.author.uid})`;
            if (status.activity) {
                text += ` ${status.activity}`;
            }
            text += `: ${status.text}`;
            if (status.card) {
                text += `[推荐]:《${status.card.title}》(${status.card.url})`;
            }
            if (status.images && status.images.length > 0) {
                let images = [];
                status.images.forEach(image => {
                    images.push(image.large.url);
                });
                text += ` ${images}`;
            }
            if (status.parent_status) {
                text += `//${formatStatus(status.parent_status)}...`;
            }
            if (status.reshared_status) {
                text += `//${formatStatus(status.reshared_status)}`;
            }
            return text;
        };

        let collection = await storage.local.status
            .orderBy('id')
            .reverse();
        let data = [['创建时间', '链接', '内容', '话题']];
        await collection.each(row => {
            let {
                sharing_url,
                create_time,
                topic,
            } = row.status;
            data.push([
                create_time,
                sharing_url,
                formatStatus(row.status),
                topic ? [topic.title, topic.url].toString() : '',
            ]);
        });
        let worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, '广播');
    }

    async exportFollowing(storage) {
        let collection = storage.local.following;
        let data = [['用户名', '用户ID', '链接', '所在地', '备注']];
        await collection.each(row => {
            let {
                name,
                uid,
                url,
                loc,
                remark
            } = row.user;
            data.push([
                name,
                uid,
                url,
                loc ? loc.name : '',
                remark,
            ]);
        });
        let worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, '我关注的');
    }

    async exportFollower(storage) {
        let collection = storage.local.follower;
        let data = [['用户名', '用户ID', '链接', '所在地']];
        await collection.each(row => {
            let {
                name,
                uid,
                url,
                loc
            } = row.user;
            data.push([
                name,
                uid,
                url,
                loc ? loc.name : '',
            ]);
        });
        let worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, '关注我的');
    }

    async exportBlacklist(storage) {
        let collection = storage.local.blacklist;
        let data = [['用户名', '用户ID', '链接']];
        await collection.each(row => {
            let {
                name,
                uid,
                url
            } = row.user;
            data.push([
                name,
                uid,
                url
            ]);
        });
        let worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, '黑名单');
    }

    async exportNote(storage) {
        let collection = storage.local.note.reverse();
        let data = [['标题', '链接', '创建时间', '修改时间', '内容']];
        await collection.each(row => {
            let {
                title,
                url,
                fulltext,
                create_time,
                update_time
            } = row.note;
            data.push([
                title,
                url,
                create_time,
                update_time,
                fulltext,
            ]);
        });
        let worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, '日记');
    }

    async exportPhoto(storage) {
        let data = [['相册名称', '相册链接', '相册描述', '相册创建时间', '照片描述', '照片链接']];
        let albums = await storage.local.album.toArray();
        for (let {id, album} of albums) {
            data.push([album.title, album.url, album.description, album.create_time]);
            let photos = storage.local.photo.where({album: id});
            await photos.each(photo => {
                let {url, description} = photo.photo;
                data.push([null, null, null, null, description, url]);
            });
        }
        let worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, '相册');
    }

    async exportDoumail(storage) {
        let data = [['用户', '链接', '发件人', '发送时间', '正文']];
        let contacts = await storage.local.doumailContact
            .orderBy('rank')
            .reverse()
            .toArray();
        for (let {id, contact, url} of contacts) {
            data.push([
                contact.name,
                url,
            ]);
            let doumails = storage.local.doumail.where({contact: id});
            await doumails.each(doumail => {
                let {content, sender, datetime} = doumail;
                data.push([null, null, sender.name, datetime, content]);
            });
        }
        let worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(this.workbook, worksheet, '豆邮');
    }

    async exportDoulist(storage) {
        let sheetNames = {'owned': '创建的豆列', 'following': '收藏的豆列'};
        for (let type in sheetNames) {
            let data = [['豆列名称', '豆列链接', '豆列简介', '豆列创建时间', '豆列更新时间', '内容名称', '内容链接', '来源', '评语']];
            let doulists = await storage.local.doulist.where({type: type}).toArray();
            for (let {id, doulist} of doulists) {
                data.push([
                    doulist.title,
                    doulist.url,
                    doulist.desc,
                    doulist.create_time,
                    doulist.update_time,
                ]);
                let items = storage.local.doulistItem.where({doulist: id});
                await items.each(item => {
                    let {url, title, source, comment} = item.item;
                    data.push([null, null, null, null, null, title, url, source, comment]);
                });
            }
            let worksheet = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(this.workbook, worksheet, sheetNames[type]);
        }
    }

    async export(items) {
        let storage = new Storage(this.userId);
        storage.local.open();
        for (let item of items) {
            switch (item) {
                case 'Interest':
                    await this.exportInterest(storage);
                    break;
                case 'Review':
                    await this.exportReview(storage);
                    break;
                case 'Status':
                    await this.exportStatus(storage);
                    break;
                case 'Following':
                    await this.exportFollowing(storage);
                    break;
                case 'Follower':
                    await this.exportFollower(storage);
                    break;
                case 'Blacklist':
                    await this.exportBlacklist(storage);
                    break;
                case 'Note':
                    await this.exportNote(storage);
                    break;
                case 'Photo':
                    await this.exportPhoto(storage);
                    break;
                case 'Doumail':
                    await this.exportDoumail(storage);
                    break;
                case 'Doulist':
                    await this.exportDoulist(storage);
                    break;
            }
        }
        storage.local.close();
    }

    save() {
        let filename = `豆伴(${this.userId}).xlsx`;
        XLSX.writeFile(this.workbook, filename);
    }
}


let tab = TabPanel.render();
tab.addEventListener('toggle', async event => await Panel.render(event.target.activeTab));
Panel.render(tab.activeTab);
ExportModal.init();
