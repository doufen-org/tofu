'use strict';
import {TaskError, Task} from '../service.js';


const API_PAGE_SIZE = 50;
const WEB_PAGE_SIZE = 20;
const OTHER_USER_PAGE_SIZE = 70;
const URL_FOLLOWERS = 'https://m.douban.com/rexxar/api/v2/user/{uid}/followers?start={start}&count=50&ck={ck}&for_mobile=1';
const URL_FOLLOWERS_WEBPAGE = 'https://www.douban.com/contacts/rlist?start={start}';
const URL_FOLLOWERS_OTHER_USER = 'https://www.douban.com/people/{uid}/rev_contacts?start={start}';


export default class Follower extends Task {
    async crawlByApi() {
        let baseURL = URL_FOLLOWERS
            .replace('{ck}', this.session.cookies.ck)
            .replace('{uid}', this.targetUser.id);

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
                this.step();
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
                this.step();
            }
        }
    }

    async crawlOtherUserByWebpage() {
        let totalPage = 1;
        for (let i = 0; i < totalPage; i ++) {
            let response = await this.fetch(
                URL_FOLLOWERS_OTHER_USER
                    .replace('{uid}', this.targetUser.id)
                    .replace('{start}', i * OTHER_USER_PAGE_SIZE)
            );
            if (response.status != 200) {
                throw new TaskError('豆瓣服务器返回错误');
            }
            let html =  this.parseHTML(await response.text());
            try {
                totalPage = parseInt(html.querySelector('.paginator .thispage').dataset.totalPage);
            } catch (e) {}
            for (let anchor of html.querySelectorAll('.obu .nbg')) {
                let avatar = anchor.querySelector('img');
                let userLink = anchor.href;
                let matches = avatar.src.match(/\/icon\/u(\d+)-\d+.jpg$/);
                let idText = matches ? matches[1] : null;
                let uid = userLink.match(/https:\/\/www\.douban\.com\/people\/(.+)\//)[1];

                let row = {
                    version: this.jobId,
                    user: {
                        avatar: avatar.src,
                        id: idText,
                        name: avatar.alt,
                        uid: uid,
                        uri: 'douban://douban.com/user/' + (idText || uid),
                        url: userLink,
                    }
                };
                await this.storage.follower.put(row);
                this.step();
            }
        }
    }

    async run() {
        this.total = this.targetUser.followers_count;
        await this.storage.table('version').put({table: 'follower', version: this.jobId, updated: Date.now()});
        if (this.total > 5000) {
            this.isOtherUser ?
                await this.crawlOtherUserByWebpage() :
                await this.crawlByWebpage();
        } else {
            await this.crawlByApi();
        }
        this.complete();
    }

    get name() {
        return '被关注';
    }
}
