'use strict';
import {TaskError, Task} from '../service.js';


const API_PAGE_SIZE = 50;
const WEB_PAGE_SIZE = 20;
const URL_FOLLOWERS = 'https://m.douban.com/rexxar/api/v2/user/{uid}/followers?start={start}&count=50&ck={ck}&for_mobile=1';
const URL_FOLLOWERS_WEBPAGE = 'https://www.douban.com/contacts/rlist?start={start}';


export default class Follower extends Task {
    async crawlByApi() {
        let baseURL = URL_FOLLOWERS
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.session.userId);

        let pageCount = 1;
        for (let i = 0; i < pageCount; i ++) {
            let response = await this.fetch(baseURL.replace('{start}', i * API_PAGE_SIZE), {headers: {'X-Override-Referer': 'https://m.douban.com/mine/follower'}});
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let json = await response.json();
            pageCount = Math.ceil(json.total / API_PAGE_SIZE);
            for (let user of json.users) {
                let row = {
                    version: this.jobId,
                    user: user,
                };
                await this.storage.follower.put(row);
            }
        }
    }

    async crawlByWebpage() {
        let totalPage = 1;
        for (let i = 0; i < totalPage; i ++) {
            let response = await this.fetch(URL_FOLLOWERS_WEBPAGE.replace('{start}', i * WEB_PAGE_SIZE));
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let html =  this.parseHTML(await response.text());
            try {
                totalPage = parseInt(html.querySelector('.paginator .thispage').dataset.totalPage);
            } catch (e) {}
            for (let li of html.querySelectorAll('.user-list>li')) {
                let idText = li.id.substr(1);
                let avatar = li.querySelector('.face');
                let userLink = li.querySelector('.info>h3>a').href;
                let loc = null;
                let userInfo = li.querySelector('.info>p');
                if (userInfo.childElementCount == 3) {
                    loc = { name: userInfo.firstChild.textContent.trim() };
                }
                let followInfo = userInfo.querySelectorAll('b');
                let followers = followInfo[0].innerText;
                let following = followInfo[1].innerText;

                let row = {
                    version: this.jobId,
                    user: {
                        avatar: avatar.src,
                        id: idText,
                        loc: loc,
                        name: avatar.alt,
                        uid: userLink.match(/https:\/\/www\.douban\.com\/people\/(.+)\//)[1],
                        uri: 'douban://douban.com/user/' + idText,
                        url: userLink,
                        followers_count: followers,
                        following_count: following,
                    }
                };
                await this.storage.follower.put(row);
            }
        }
    }

    async run() {
        await this.storage.table('version').put({table: 'follower', version: this.jobId, updated: Date.now()});
        return this.session.userInfo.followers_count > 5000 ? await this.crawlByWebpage() : await this.crawlByApi();
    }

    get name() {
        return '被关注';
    }
}
