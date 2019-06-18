import TabPanel from './ui/tab.js';


/**
 * Class Status
 */
class Status {

}

let tab = TabPanel.render();
tab.addEventListener('toggle', event => {
    console.log(event.target.activeTab);
});
console.log(tab.activeTab);
