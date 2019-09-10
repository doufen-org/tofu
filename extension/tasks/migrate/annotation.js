'use strict';
import {Task, TaskError} from '../../service.js';
import Draft from '../../vendor/draft.js';


const URL_ANNOTATION_PUBLISH = 'https://book.douban.com/j/annotation/{nid}/publish';
const URL_ANNOTATION_CREATE_REFERER = 'https://book.douban.com/annotation/write?sid={subject}';
const URL_ANNOTATION_IMAGE_UPLOAD = 'https://book.douban.com/j/annotation/{nid}/upload';
const PAGE_SIZE = 100;
const WORD_COUNT_LIMIT = 10;


export default class Annotation extends Task {
    async getInitialData(createURL) {
        let response = await this.fetch(createURL);
        let html = this.parseHTML(await response.text());
        let input = html.querySelector('#review-editor-form>input[name="nid"]');
        if (!input) {
            throw new TaskError('Cannot find "nid" value.');
        }
        
        let script = html.querySelectorAll('script')[2];
        let match = script.text.match(/name: 'upload_auth_token',\s    value: '([\s\S]*?)'/m);
        if (!match) {
            throw new TaskError('Cannot find upload auth token.');
        }

        return {
            nid: input.value,
            uploadAuthToken: match[1],
        };
    }

    async uploadImages(draft, uploadAuthToken, uploadURL) {
        let uploadForm = new FormData();
        uploadForm.append('ck', this.session.cookies.ck);
        uploadForm.append('upload_auth_token', uploadAuthToken);

        for (let i in draft.entities) {
            let entity = draft.entities[i];
            if (entity.type != 'IMAGE') continue;
            let entityData = entity.data;
            let imageResponse = await this.fetch(entityData.src, {
                'X-Override-Referer': 'https://www.douban.com/',
            }, true);
            let imageBlob = await imageResponse.blob();
            let imageURL = new URL(entityData.src);
            let filename = imageURL.pathname.split('/').pop();
            uploadForm.set('image', imageBlob, filename);
            let uploadResponse = await this.fetch(uploadURL, {method: 'POST', body: uploadForm}, true);
            let uploadedImage = await uploadResponse.json();
            entity.data = uploadedImage.photo;
            entity.data.src = entity.data.url;
        }
    }

    async run() {
        this.total = await this.storage.annotation.count();
        if (this.total == 0) {
            return;
        }

        let postData = new URLSearchParams();
        postData.append('ck', this.session.cookies.ck);
        postData.append('is_rich', '1');

        let pageCount = Math.ceil(this.total / PAGE_SIZE);
        for (let i = 0; i < pageCount; i ++) {
            let rows = await this.storage.annotation
                .offset(PAGE_SIZE * i).limit(PAGE_SIZE)
                .toArray();
            for (let row of rows) {
                let createURL = URL_ANNOTATION_CREATE_REFERER.replace('{subject}', row.subject);
                let {nid, uploadAuthToken} = await this.getInitialData(createURL);
                let annotation = row.annotation;
                let html = this.parseHTML(annotation.fulltext);
                let body = html.querySelector('body');

                let draft = new Draft();
                draft.feed(body);
                let wordPadding = WORD_COUNT_LIMIT - draft.count();
                if (wordPadding > 0) {
                    draft.addBlock('unstyled').write(''.padEnd(wordPadding, '=')).end();
                }
                await this.uploadImages(draft, uploadAuthToken, URL_ANNOTATION_IMAGE_UPLOAD.replace('{nid}', nid));

                postData.set('chapter', annotation.chapter);
                postData.set('page', annotation.page || 1);
                postData.set('content', JSON.stringify(draft.toArray()));

                let response = await this.fetch(URL_ANNOTATION_PUBLISH.replace('{nid}', nid), {
                    headers: {
                        'X-Override-Referer': createURL,
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-Override-Origin': 'https://www.douban.com',
                    },
                    method: 'POST',
                    body: postData,
                });
                let result = await response.json();
                if (result.r == 0) {
                    this.logger.info('Success to publish annotation:' + annotation.title);
                } else {
                    this.logger.warning('Fail to publish annotation:' + annotation.title);
                }
                this.step();
            }
        }
        this.complete();
    }

    get name() {
        return '发布笔记';
    }
}
