import TabPanel from './ui/tab.js';

let tab = TabPanel.render();
tab.addEventListener('toggle', event => {
    console.log(event.detail);
})