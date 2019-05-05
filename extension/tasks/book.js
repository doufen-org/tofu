'use strict';


export default async function task(service) {
    let response = await new Promise(resolve => {
        setTimeout(resolve, 5000, 'delay 5000ms');
    });
    console.log(response);
    response = await new Promise(resolve => {
        window.resume = resolve;
    });
    console.log(response);
}
