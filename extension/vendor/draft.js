'use strict';


const BLOCK_TAGS = {
    h1: 'header-one',
    h2: 'header-two',
    h3: 'header-three',
    h4: 'header-four',
    h5: 'header-five',
    h6: 'header-six',
    blockquote: 'blockquote',
    li: [
        {parent: 'ul', type: 'unordered-list-item'},
        {parent: 'ol', type: 'ordered-list-item'},
    ],
    code: 'code-block',
    p: 'unstyled',
    div: [
        {class: 'separator', type: 'atomic', handle(node) {
            this.block.write(' ');
            let entityId = this.addEntity('SEPARATOR', false, {});
            let range = this.block.addEntityRange(entityId);
            range.length = 1;
            node.innerHTML = '';
        }},
        {class: 'subject-wrapper', type: 'atomic', handle(node) {
            node.innerHTML = '';
        }},
        {class: 'video-wrapper', type: 'atomic', handle(node) {
            node.innerHTML = '';
        }},
        {class: 'image-container', type: 'atomic', handle(node) {
            this.block.write(' ');
            let imageNode = node.querySelector('.image-wrapper>img');
            let imageIdMatch = imageNode.src.match(/.*\D(\d+)\..+$/);
            let imageId = imageIdMatch ? imageIdMatch[1]: '';
            let imageCaption = node.querySelector('.image-caption');
            let imageSrc = imageNode.src;
            let entityId = this.addEntity('IMAGE', false, {
                src: imageSrc,
                url: imageSrc,
                thumb: imageSrc,
                file_name: '',
                caption: imageCaption ? imageCaption.innerText : '',
                is_animated: (imageNode.dataset.renderType == 'gif') ? true : false,
                id: imageId,
                seq: imageId,
            });
            let range = this.block.addEntityRange(entityId);
            range.length = 1;
            node.innerHTML = '';
        }},
        {type: 'unstyled'},
    ],
};

const INLINE_TAGS = {
    b: 'BOLD',
    strong: 'BOLD',
    i: 'ITALIC',
    em: 'ITALIC',
    span: [
        {style: 'font-style: italic;', type: 'ITALIC'},
        {style: 'font-weight: bold;', type: 'STRONG'},
    ],
    code: 'CODE',
    u: 'UNDERLINE',
};

const TEXT_TAGS = {
    br: "\n",
};

const ENTITY_TAGS = {
    a(node) {
        return this.addEntity('LINK', true, {url: node.href});
    },

    img(node) {
        return this.addEntity('IMAGE', false, {
            src: node.src,
            caption: node.alt || node.title || '',
        });
    },

    hr(node) {
        return this.addEntity('SEPARATOR', false, {});
    },
}


class Block {
    constructor(type) {
        this.type = type;
        this.segments = [];
        this.inlineStyleRanges = [];
        this.entityRanges = [];
    }

    write(segment) {
        this.segments.push(segment);
        return this;
    }

    get value() {
        return {
            "key": this.key,
            "text": this.text,
            "type": this.type,
            "depth": 0,
            "inlineStyleRanges": this.inlineStyleRanges,
            "entityRanges": this.entityRanges,
            "data": {}
        }
    }

    get text() {
        return this.segments.join('');
    }

    get key() {
        return '';
    }

    get length() {
        return this.text.length;
    }

    addInlineStyleRange(style) {
        let range = {
            style: style,
            offset: this.length,
        };
        this.inlineStyleRanges.push(range);
        return range;
    }

    addEntityRange(key) {
        let range = {
            key: key,
            offset: this.length,
        };
        this.entityRanges.push(range);
        return range;
    }

    end() {
        let length = this.length, range;

        for (range of this.inlineStyleRanges) {
            if (!range.length) {
                range.length = length - range.offset;
            }
        }

        for (range of this.entityRanges) {
            if (!range.length) {
                range.length = length - range.offset;
            }
        }
    }
}


export default class Draft {
    constructor() {
        this.blocks = [];
        this.entities = {};
        this._entityId = 0;
    }

    get block() {
        if (!this._block) {
            return this.addBlock();
        }
        return this._block;
    }

    addBlock(type = 'unstyled') {
        if (this._block) {
            this._block.end();
        }
        this._block = new Block(type);
        this.blocks.push(this._block);
        return this._block;
    }

    addEntity(type, isMutable, data) {
        this.entities[this._entityId] = {
            type: type,
            mutability: isMutable ? 'MUTABLE' : 'IMMUTABLE',
            data: data,
        };
        return this._entityId ++;
    }

    matchNode(defination, node) {
        for (let rule of defination) {
            if (rule.class && !node.classList.contains(rule.class)) {
                continue;
            }
            if (rule.style && node.attributes.style.value != rule.style) {
                continue;
            }
            if (rule.parent && node.parentNode.tagName.toLowerCase() != rule.parent) {
                continue;
            }
            return [rule.type, rule.handle];
        }
        return ['unstyled', null];
    }

    travelChildren(parentNode, depth = 0) {
        for (let node of parentNode.childNodes) {
            let ignoreRecursive = false;
            switch (node.nodeType) {
                case node.ELEMENT_NODE:
                    // Element
                    let nodeTagName = node.tagName.toLowerCase();
                    if (nodeTagName in BLOCK_TAGS) {
                        // Block element
                        let defination = BLOCK_TAGS[nodeTagName];
                        let blockType = defination, handler;
                        if (defination instanceof Array) {
                            [blockType, handler] = this.matchNode(defination, node);
                        }
                        this.addBlock(blockType);
                        handler && handler.call(this, node);
                    } else if (nodeTagName in INLINE_TAGS) {
                        // Inline styles
                        if (node.childNodes.length > 0) {
                            // Recursive
                            let defination = INLINE_TAGS[nodeTagName];
                            let inlineStyleName = defination;
                            if (defination instanceof Array) {
                                [inlineStyleName] = this.matchNode(defination, node);
                            }
                            if (inlineStyleName != 'unstyled') {
                                let range = this.block.addInlineStyleRange(inlineStyleName);
                                this.travelChildren(node, depth + 1);
                                range.length = this.block.length - range.offset;
                                ignoreRecursive = true;
                            }
                        }
                    } else if (nodeTagName in ENTITY_TAGS) {
                        // Entity
                        let handler = ENTITY_TAGS[nodeTagName];
                        let entityId = handler.call(this, node);
                        let range = this.block.addEntityRange(entityId);
                        this.travelChildren(node, depth + 1);
                        range.length = this.block.length - range.offset;
                        ignoreRecursive = true;
                    } else if (nodeTagName in TEXT_TAGS) {
                        // Text
                        this.block.write(TEXT_TAGS[nodeTagName]);
                    }
                    if (!ignoreRecursive) {
                        // Recursive
                        this.travelChildren(node, depth + 1);
                    }
                    break;
                case node.TEXT_NODE:
                    // Text
                    this.block.write(node.textContent);
                    break;
            }
        }
    }

    feed(html) {
        this.travelChildren(html);
        return this;
    }

    count() {
        let textCount = 0;
        for (let block of this.blocks) {
            textCount += block.text.length;
        }
        return textCount;
    }

    toArray() {
        return {
            blocks: this.blocks.map(block => block.value),
            entityMap: this.entities,
        };
    }
}
