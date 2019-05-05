'use strict';


const URL_MINE = 'https://m.douban.com/mine/';

export default async function task(service) {
    let response = await fetch(URL_MINE);
    console.log(response.text());
    await service.requestInterval;
    response = await fetch('https://m.douban.com/mine/');
    console.log(response.text());
}