($ => {
    "use strict";

    window.SearchHelper = function (ext) {


        let searchInProgress = {};

        /**
         * Initializes the helper
         */
        this.init = () => {
            let data = ext.helper.model.getData(["b/rememberSearch", "u/searchValue"]);

            if (data.rememberSearch) { // restore search result
                if (data.searchValue && data.searchValue.length > 0) { // search value is not empty -> restore
                    ext.elements.header.addClass(ext.opts.classes.sidebar.searchVisible);
                    handleSearchValChanged(data.searchValue);
                    setTimeout(() => {
                        ext.helper.scroll.restoreScrollPos(ext.elements.bookmarkBox["search"]);
                    }, 0);
                }
            }

            initEvents();
        };

        /**
         * Adds a loading mask over the sidebar
         */
        let addSearchLoading = () => {
            ext.elements.sidebar.addClass(ext.opts.classes.sidebar.searchLoading);

            if (searchInProgress.timeout) {
                clearTimeout(searchInProgress.timeout);
            }
            if (typeof searchInProgress.loader === "undefined" || searchInProgress.loader.length() === 0) {
                searchInProgress.loader = ext.getLoaderHtml().appendTo(ext.elements.sidebar);
            }
        };

        /**
         * Removes the loading mask after the given time
         *
         * @param {int} timeout in ms
         */
        let removeSearchLoading = (timeout = 500) => {
            searchInProgress.timeout = setTimeout(() => {
                ext.elements.sidebar.removeClass(ext.opts.classes.sidebar.searchLoading);
                searchInProgress.loader && searchInProgress.loader.remove();
                searchInProgress = {};
            }, timeout);
        };

        /**
         * Handles the view of the search result list
         *
         * @param val
         */
        let handleSearchValChanged = (val = null) => {
            let searchField = ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']");
            if (val === null) {
                val = searchField[0].value;
                ext.helper.scroll.updateScrollbox(ext.elements.bookmarkBox["search"], 0);
            } else {
                searchField[0].value = val;
            }

            if (val && val.length > 0) { // search field is not empty
                handleSearch(searchField, val);
            } else { // empty search field -> reset list
                handleSearchReset(searchField);
            }
        };

        /**
         * Updates the search results if search value is not the same as currently visible
         *
         * @param {jsu} searchField
         * @param {string} val
         */
        let handleSearch = (searchField, val) => {
            ext.elements.bookmarkBox["all"].removeClass(ext.opts.classes.sidebar.active);
            ext.elements.bookmarkBox["search"].addClass(ext.opts.classes.sidebar.active);

            if (val !== searchField.data("lastVal")) { // search value is not the same
                searchField.data("lastVal", val);
                ext.helper.model.setData({"u/searchValue": val});
                addSearchLoading();

                ext.helper.model.call("searchBookmarks", {searchVal: val}, (response) => {
                    ext.elements.bookmarkBox["search"].children("p").remove();
                    let list = ext.elements.bookmarkBox["search"].children("ul");
                    list.text("");

                    if (response.bookmarks && response.bookmarks.length > 0) { // results for your search value
                        ext.addBookmarkDir(response.bookmarks, list);
                    } else { // no results
                        $("<p />").text(chrome.i18n.getMessage("sidebar_search_no_results")).prependTo(ext.elements.bookmarkBox["search"]);
                    }

                    ext.helper.scroll.update(ext.elements.bookmarkBox["search"]);
                    removeSearchLoading();
                });
            }
        };

        /**
         * Resets the search results and shows the normal bookmark list again
         *
         * @param {jsu} searchField
         */
        let handleSearchReset = (searchField) => {
            searchField.removeData("lastVal");

            ext.helper.model.setData({"u/searchValue": null});

            if (ext.elements.bookmarkBox["search"].hasClass(ext.opts.classes.sidebar.active)) {
                addSearchLoading();
                ext.elements.bookmarkBox["all"].addClass(ext.opts.classes.sidebar.active);
                ext.elements.bookmarkBox["search"].removeClass(ext.opts.classes.sidebar.active);
                ext.helper.scroll.restoreScrollPos(ext.elements.bookmarkBox["all"]);
                removeSearchLoading();
            }
        };


        /**
         * Initializes the events for the search field
         */
        let initEvents = () => {

            ext.elements.header.on("click", "a." + ext.opts.classes.sidebar.search, (e) => {
                e.preventDefault();
                e.stopPropagation();
                ext.helper.contextmenu.close();
                ext.elements.header.addClass(ext.opts.classes.sidebar.searchVisible);
                ext.elements.header.find("div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']")[0].focus();
            });

            ext.elements.header.on("keyup", "div." + ext.opts.classes.sidebar.searchBox + " > input[type='text']", (e) => {
                e.preventDefault();
                handleSearchValChanged();
            });

            ext.elements.header.on("click", "a." + ext.opts.classes.sidebar.searchClose, (e) => {
                e.preventDefault();
                e.stopPropagation();
                ext.helper.contextmenu.close();
                ext.elements.header.removeClass(ext.opts.classes.sidebar.searchVisible);
                handleSearchValChanged("");
            });

        };
    };

})(jsu);