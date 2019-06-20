import TabPanel from './ui/tab.js';
import Storage from './storage.js';


const PAGE_SIZE = 50;


const TEMPLATE_PAGINATOR = `\
<nav class="pagination is-centered" role="navigation">
  <a class="pagination-previous">上一页</a>
  <a class="pagination-next">下一页</a>
  <ul class="pagination-list"></ul>
</nav>`;


/**
 * Class Paginator
 */
class Paginator extends EventTarget {
    constructor(currentPage, pageCount, padding = 6) {
        super();
        this.currentPage = currentPage;
        this.pageCount = pageCount;
        this.padding = padding;
        this.load();
    }

    load() {
        let currentPage = this.currentPage;
        let pageCount = this.pageCount;
        let padding = this.padding;
        let $pagination = this.$pagination = $(TEMPLATE_PAGINATOR);
        let relativeBeginPage = pageCount - parseInt(padding / 2) > currentPage ?
            currentPage - parseInt(Math.floor((padding - 1) / 2)) : 
            pageCount - padding + 1;
        let beginPage = relativeBeginPage > 0 ? relativeBeginPage : 1;
        let relativeEndPage = beginPage + padding - 1;
        let endPage = relativeEndPage < pageCount ? relativeEndPage : pageCount;
        
        let $paginationList = $pagination.find('.pagination-list');
        $paginationList.html('');
        if (currentPage == 1) {
            $pagination.find('.pagination-previous').attr('disabled', 'disabled');
            $paginationList.append('<li><a class="pagination-link is-current">1</a></li>');
        } else {
            $paginationList.append('<li><a class="pagination-link">1</a></li>');
        }
        if (beginPage > 2) {
            $paginationList.append('<li><span class="pagination-ellipsis">&hellip;</span></li>');
        }

        for (let i = beginPage + 1; i < endPage; i ++) {
            if (i == currentPage) {
                $paginationList.append('<li><a class="pagination-link is-current">' + i + '</a></li>');
            } else {
                $paginationList.append('<li><a class="pagination-link">' + i + '</a></li>');
            }
        }
        
        if (endPage <= pageCount - 1) {
            $paginationList.append('<li><span class="pagination-ellipsis">&hellip;</span></li>');
        }

        if (currentPage == pageCount) {
            $pagination.find('.pagination-next').attr('disabled', 'disabled');
            $paginationList.append('<li><a class="pagination-link is-current">' + pageCount + '</a></li>');
        } else {
            $paginationList.append('<li><a class="pagination-link">' + pageCount + '</a></li>');
        }

        $pagination.on('click', '.pagination-link', event => {
            this.currentPage = parseInt(event.currentTarget.innerText);
            this.dispatchEvent(new Event('change'));
        });
    }

    appendTo(node) {
        this.$pagination.appendTo(node);
    }
}


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


/**
 * Class Following
 */
class Following extends Panel {
    
}


/**
 * Class Follower
 */
class Follower extends Panel {
    
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
