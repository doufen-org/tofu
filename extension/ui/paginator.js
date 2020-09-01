'use strict';

const TEMPLATE_PAGINATOR = `\
<nav class="pagination is-centered" role="navigation">
  <a class="pagination-previous">上一页</a>
  <a class="pagination-next">下一页</a>
  <ul class="pagination-list"></ul>
</nav>`;

const TEMPLATE_GOTO = `\
<li>
    <div class="field has-addons" style="margin: 0.25rem;">
        <div class="control">
            <input class="input pagination-goto" type="text" size="1">
        </div>
        <div class="control">
            <a class="button pagination-goto">跳转</a>
        </div>
    </div>
</li>`;


/**
 * Class Paginator
 */
export default class Paginator extends EventTarget {
    constructor(currentPage, pageCount, padding = 6) {
        super();
        this.currentPage = currentPage;
        this.pageCount = pageCount;
        this.padding = padding;
        this.load();
    }

    load() {
        let currentPage = this.currentPage;
        let pageCount = this.pageCount;
        let padding = this.padding;
        let $pagination = this.$pagination = $(TEMPLATE_PAGINATOR);
        let relativeBeginPage = pageCount - parseInt(padding / 2) > currentPage ?
            currentPage - parseInt(Math.floor((padding - 1) / 2)) : 
            pageCount - padding + 1;
        let beginPage = relativeBeginPage > 0 ? relativeBeginPage : 1;
        let relativeEndPage = beginPage + padding - 1;
        let endPage = relativeEndPage < pageCount ? relativeEndPage : pageCount;
        
        let $paginationList = $pagination.find('.pagination-list');
        $paginationList.html('');
        if (currentPage == 1) {
            $pagination.find('.pagination-previous').attr('disabled', 'disabled');
            $paginationList.append('<li><a class="pagination-link is-current">1</a></li>');
        } else {
            $paginationList.append('<li><a class="pagination-link">1</a></li>');
        }
        if (beginPage > 2) {
            $paginationList.append('<li><span class="pagination-ellipsis">&hellip;</span></li>');
        }

        for (let i = beginPage + 1; i < endPage; i ++) {
            if (i == currentPage) {
                $paginationList.append('<li><a class="pagination-link is-current">' + i + '</a></li>');
            } else {
                $paginationList.append('<li><a class="pagination-link">' + i + '</a></li>');
            }
        }
        
        if (endPage <= pageCount - 1) {
            $paginationList.append('<li><span class="pagination-ellipsis">&hellip;</span></li>');
        }

        if (currentPage == pageCount) {
            $pagination.find('.pagination-next').attr('disabled', 'disabled');
            pageCount > 1 && $paginationList.append('<li><a class="pagination-link is-current">' + pageCount + '</a></li>');
        } else {
            pageCount > 1 && $paginationList.append('<li><a class="pagination-link">' + pageCount + '</a></li>');
        }

        $paginationList.append(TEMPLATE_GOTO);

        $pagination.on('click', '.pagination-link', event => {
            this.currentPage = parseInt(event.currentTarget.innerText);
            this.dispatchEvent(new Event('change'));
        });

        $pagination.on('click', '.pagination-previous', event => {
            let currentPage = parseInt($pagination.find('.pagination-link.is-current').text());
            if (isNaN(currentPage) || currentPage == 1) return false;
            this.currentPage =  currentPage - 1;
            this.dispatchEvent(new Event('change'));
        });

        $pagination.on('click', '.pagination-next', event => {
            let currentPage = parseInt($pagination.find('.pagination-link.is-current').text());
            if (isNaN(currentPage) || currentPage == endPage) return false;
            this.currentPage = currentPage + 1;
            this.dispatchEvent(new Event('change'));
        });

        $pagination.on('click', '.button.pagination-goto', event => {
            let currentPage = parseInt($pagination.find('.input.pagination-goto').val());
            if (isNaN(currentPage) || currentPage < 1 || currentPage > pageCount) return false;
            this.currentPage = currentPage;
            this.dispatchEvent(new Event('change'));
        });
    }

    appendTo(node) {
        this.$pagination.appendTo(node);
    }
}
