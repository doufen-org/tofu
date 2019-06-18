/**
 * Class Notification
 */
export default class TabPanel extends EventTarget {
    constructor(tabSelector, contentSelector) {
        super();
        this.$tabs = $(tabSelector);
        this.$contents = $(contentSelector);

        window.addEventListener('hashchange', e => {
            if (location.hash) {
                this.toggle(location.hash.substr(1));
            }
        }, false);

        if (location.hash) {
            this.toggle(location.hash.substr(1));
        } else {
            this.dispatchEvent(new CustomEvent('toggle', {
                detail: $(tabSelector + '.is-active').data('tab')
            }));
        }
    }

    toggle(tabName, tab) {
        if (!tab) {
            tab = this.$tabs.find('[href="#' + tabName + '"]').parent('li')[0];
        }
        this.$tabs.removeClass('is-active');
        this.$contents.addClass('is-hidden');
        tab.classList.add('is-active');
        this.$contents.each((_, el) => {
            if (el.getAttribute('name') == tabName) {
                el.classList.remove('is-hidden');
            }
        });
        this.dispatchEvent(new CustomEvent('toggle', {detail: tabName}));
    }

    static render() {
        return new TabPanel('.page-tab-link',
                            '.page-tab-content');
    }
}
