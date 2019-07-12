'use strict';
import {TaskError, Task} from '../service.js';


const PAGE_SIZE = 20;
const URL_DOUMAIL = 'https://www.douban.com/doumail/?start={start}';
const URL_DOUMAIL_LOAD_MORE = 'https://www.douban.com/j/doumail/loadmore';


export default class Photo extends Task {
    async run() {
        let pageCount = 1;
        for (let i = 0; i < pageCount; i ++) {
            let response = await this.fetch(URL_DOUMAIL.replace('{start}', i * PAGE_SIZE));
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let html =  this.parseHTML(await response.text());
            try {
                pageCount = parseInt(html.querySelector('.paginator .thispage').dataset.totalPage);
            } catch (e) {}
            this.total = pageCount * PAGE_SIZE;
            for (let contact of html.querySelectorAll('.doumail-list>ul>li')) {
                let operationAnchor = contact.querySelector('.operations>.post_link.report');
                let userId = parseInt(operationAnchor.dataset.id);
                isNaN(userId) && (userId = 0);
                let contactName = operationAnchor.dataset.sname;
                let contactUrl = operationAnchor.dataset.slink;
                let contactAvatarImg = contact.querySelector('.pic img');
                let contactAvatar = contactAvatarImg ? contactAvatarImg.src : null;
                let time = contact.querySelector('.title>.sender>.time').innerText;
                let abstract = contact.querySelector('.title>p').innerText;
                let doumailUrl = contact.querySelector('.title .url').href;
                let doumailContact = {
                    id: userId,
                    contact: {
                        id: userId,
                        name: contactName,
                        url: contactUrl,
                        avatar: contactAvatar,
                    },
                    time: time,
                    url: doumailUrl,
                    abstract: abstract,
                    rank: new Date(time).getTime(),
                };
                let readMore = true;
                for (let start = 0; readMore; start += PAGE_SIZE) {
                    let postData = new FormData();
                    postData.append('start', start);
                    postData.append('target_id', userId);
                    postData.append('ck', this.session.cookies.ck);
                    let response = await this.fetch(URL_DOUMAIL_LOAD_MORE, {
                        headers: {'X-Override-Referer': doumailUrl},
                        method: 'POST',
                        body: postData,
                    });
                    if (response.status != 200) {
                        throw new TaskError('豆瓣服务器返回错误');
                    }
                    let json = await response.json();
                    readMore = json.more;
                    if (json.err) {
                        this.logger.warning(json.err);
                    }
                    let doumailList = document.createElement('DIV');
                    doumailList.innerHTML = json.html;
                    let lastDate = null;
                    for (let div of doumailList.children) {
                        if (div.className == 'split-line') {
                            lastDate = div.innerText.trim();
                        } else if (div.className == 'chat') {
                            let chatId = parseInt(div.getAttribute('data'));
                            let time = div.querySelector('.info>.time').innerText;
                            let datetime = `${lastDate} ${time}`;
                            let senderAvatarImg = div.querySelector('.pic img');
                            let senderAvatar = senderAvatarImg.src;
                            let senderName = senderAvatarImg.alt;
                            let senderAnchor = div.querySelector('.pic>a');
                            let senderUrl = senderAnchor ? senderAnchor.href : null;
                            let content = div.querySelector('.content');
                            let contentSender = content.querySelector('div.sender');
                            contentSender && contentSender.remove();
                            let doumail = {
                                id: chatId,
                                contact: userId,
                                sender: {
                                    avatar: senderAvatar,
                                    name: senderName,
                                    url: senderUrl,
                                },
                                datetime: datetime,
                                content: content.innerHTML,
                            };
                            await this.storage.doumail.put(doumail);
                        }
                    }
                }
                await this.storage.doumailContact.put(doumailContact);
                this.step();
            }
        }
        this.complete();
    }

    get name() {
        return '豆邮';
    }
}
