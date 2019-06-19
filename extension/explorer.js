import TabPanel from './ui/tab.js';
import Storage from './storage.js';


const PAGE_SIZE = 50;

/**
 * Class Panel
 */
class Panel {
    clear() {
        this.container.innerHTML = '';
    }

    async load() {
        throw new Error('Not implemented');
    }

    constructor(container, page, pageSize) {
        this.container = container;
        this.page = page;
        this.pageSize = pageSize;
        this.clear();
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
        await panel.load();
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
      <div class="columns images"></div>
      <p class="video"></p>
    </div>
  </div>
</article>`;


/**
 * Class Status
 */
class Status extends Panel {
    async load() {
        storage.local.open();
        let collection = await storage.local.status
            .orderBy('id').reverse()
            .offset(this.pageSize * (this.page - 1)).limit(this.pageSize)
            .toArray();
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
                $images.append(`<div class="column"><figure class="image is-128x128"><img src="${image.normal.url}"></figure></div>`);
            });
            $status.appendTo(this.container);
            console.log(status);
        }
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
