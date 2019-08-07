'use strict';
import {TaskError, Task} from '../service.js';


const URL_BLACKLIST = 'https://www.douban.com/contacts/blacklist';
const URL_USER_INFO = 'https://m.douban.com/rexxar/api/v2/user/{uid}?ck={ck}&for_mobile=1';


export default class Following extends Task {

    async run() {
        if (this.isOtherUser) {
            throw TaskError('不能备份其他用户的黑名单');
        }
        await this.storage.table('version').put({table: 'blacklist', version: this.jobId, updated: Date.now()});
        let response = await this.fetch(URL_BLACKLIST);
        if (response.status != 200) {
            throw new TaskError('豆瓣服务器返回错误');
        }
        let html =  this.parseHTML(await response.text());
        for (let dl of html.querySelectorAll('.obss.namel>dl')) {
            let avatar = dl.querySelector('.imgg');
            let idMatch = avatar.src.match(/\/icon\/u(\d+)\-(\d+)\.jpg$/), idText;
            let userLink = dl.querySelector('.nbg').href;
            let uid = userLink.match(/https:\/\/www\.douban\.com\/people\/(.+)\//)[1];
            if (idMatch) {
                idText = idMatch[1];
            } else {
                let url = URL_USER_INFO
                    .replace('{ck}', this.session.cookies.ck)
                    .replace('{uid}', uid);
                let response = await this.fetch(url, {headers: {'X-Override-Referer': 'https://m.douban.com/'}});
                if (response.status != 200) {
                    return;
                }
                let json = await response.json();
                idText = json.id;
            }
            let row = {
                version: this.jobId,
                user: {
                    avatar: avatar.src,
                    id: idText,
                    name: avatar.alt,
                    uid: uid,
                    uri: 'douban://douban.com/user/' + idText,
                    url: userLink,
                }
            };
            await this.storage.blacklist.put(row);
        }
        this.complete();
    }

    get name() {
        return '黑名单';
    }
}
