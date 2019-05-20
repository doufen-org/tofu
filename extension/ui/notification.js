/**
 * Class Notification
 */
export default class Notification {
    constructor(message, type) {
        let notification = document.createElement('DIV');
        notification.classList.add('notification');
        notification.classList.add('has-text-centered');
        notification.classList.add('is-' + type);
        notification.innerText = message;

        return notification;
    }

    static show(message, {duration = 1000, type = 'warning'} = {}) {
        let $notification = $(new Notification(message, type));
        $notification.appendTo('.notification-cascading');

        setTimeout(() => {
            $notification.fadeOut('slow', () => {
                $notification.remove();
            });    
        }, duration);
    }
}

$(`\
<style scoped>
.notification-cascading {
    position: fixed;
    top: 0;
    z-index: 999;
    max-width: 16rem;
    left: 0;
    right: 0;
    margin: 0 auto;
}

.notification {
    padding: 1rem;
    margin-bottom: 2px!important;
}
</style>
<div class="notification-cascading"></div>
`).appendTo(document.body);