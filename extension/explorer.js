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

/**
 * Class Status
 */
class Status extends Panel {
    async load() {
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


let tab = TabPanel.render();
tab.addEventListener('toggle', async event => await Panel.render(event.target.activeTab));
Panel.render(tab.activeTab);
