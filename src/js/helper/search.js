($ => {
    "use strict";

    window.SearchHelper = function (ext) {

        let searchTimeout = null;

        /**
         * Initializes the helper
         */
        this.init = () => {
            initEvents();
        };

        /**
         * Returns whether the search results are currently displayed or not
         *
         * @returns {bool}
         */
        this.isResultsVisible = () => {
            return ext.elements.bookmarkBox.search.hasClass(ext.cl.sidebar.active);
        };

        /**
         * Clears the search field and shows the normal bookmark list again
         *
         * @returns {Promise}
         */
        this.clearSearch = () => {
            return new Promise((resolve) => {
                ext.helper.contextmenu.close();
                ext.helper.tooltip.close();
                ext.elements.header.removeClass(ext.cl.sidebar.searchVisible);
                this.update("").then(resolve);
            });
        };

        /**
         * Handles the view of the search result list
         *
         * @param {string} val
         * @returns {Promise}
         */
        this.update = (val = null) => {
            return new Promise((resolve) => {
                let searchField = ext.elements.header.find("div." + ext.cl.sidebar.searchBox + " > input[type='text']");
                if (val === null) {
                    val = searchField[0].value;
                } else {
                    searchField[0].value = val;
                }

                if (val && val.length > 0) { // search field is not empty
                    handleSearch(searchField, val).then(resolve);
                } else { // empty search field -> reset list
                    reset(searchField).then(resolve);
                }
            });
        };

        /**
         * Updates the search results if search value is not the same as currently visible
         *
         * @param {jsu} searchField
         * @param {string} val
         * @returns {Promise}
         */
        let handleSearch = (searchField, val) => {
            return new Promise((resolve) => {
                let isFirstRun = ext.firstRun;
                ext.elements.bookmarkBox.all.removeClass(ext.cl.sidebar.active).removeClass(ext.cl.scrollBox.scrolled);
                ext.elements.bookmarkBox.search.addClass(ext.cl.sidebar.active);
                ext.helper.scroll.focus();
                ext.helper.list.updateSortFilter();

                if (val !== searchField.data("lastVal")) { // search value is not the same
                    ext.startLoading();
                    searchField.data("lastVal", val);

                    ext.helper.entry.initOnce().then(() => {
                        ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox.search, 0);
                        return getSearchResults(val);
                    }).then((result) => {
                        ext.elements.bookmarkBox.search.children("p").remove();

                        let hasResults = false;
                        let list = ext.elements.bookmarkBox.search.children("ul");
                        list.text("");

                        if (result.length > 0) { // results for your search value
                            hasResults = ext.helper.list.addBookmarkDir(result, list, false);
                        }

                        if (hasResults === false) { // no results
                            $("<p />").text(ext.helper.i18n.get("sidebar_search_no_results")).appendTo(ext.elements.bookmarkBox.search);
                        }

                        if (!isFirstRun) {
                            ext.helper.model.call("trackEvent", {
                                category: "search",
                                action: "search",
                                label: "search",
                                value: val.length
                            });
                        }

                        ext.endLoading(500);
                        resolve();
                    });
                }
            });
        };

        let getSearchResults = (val) => {
            return new Promise((resolve) => {
                ext.helper.model.call("searchBookmarks", {searchVal: val}).then((response) => {
                    let result = response.bookmarks || [];
                    let directories = ext.helper.entry.getAllDataByType("directories");

                    directories.forEach((directory, idx) => {
                        if (directory.title.toLowerCase().search(val.toLowerCase()) > -1) {
                            directory.index = -1000 + idx;
                            result.push(directory);
                        }
                    });

                    resolve(result);
                });
            });
        };

        /**
         * Resets the search results and shows the normal bookmark list again
         *
         * @param {jsu} searchField
         * @returns {Promise}
         */
        let reset = (searchField) => {
            return new Promise((resolve) => {
                searchField.removeData("lastVal");

                if (this.isResultsVisible()) {
                    ext.startLoading();
                    ext.elements.bookmarkBox.all.addClass(ext.cl.sidebar.active);
                    ext.elements.bookmarkBox.search.removeClass(ext.cl.sidebar.active);
                    ext.helper.scroll.restoreScrollPos(ext.elements.bookmarkBox.all);
                    ext.helper.scroll.focus();
                    ext.endLoading();
                }

                ext.helper.list.updateSortFilter();
                resolve();
            });
        };


        /**
         * Initializes the events for the search field
         */
        let initEvents = () => {
            ext.elements.header.on("click", "a." + ext.cl.sidebar.search, (e) => {
                e.preventDefault();
                e.stopPropagation();
                ext.helper.contextmenu.close();
                ext.helper.tooltip.close();
                ext.elements.header.addClass(ext.cl.sidebar.searchVisible);
                ext.elements.header.find("div." + ext.cl.sidebar.searchBox + " > input[type='text']")[0].focus();
            });

            ext.elements.header.on("keyup", "div." + ext.cl.sidebar.searchBox + " > input[type='text']", (e) => {
                e.preventDefault();
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                    searchTimeout = null;
                }

                searchTimeout = setTimeout(() => {
                    this.update();
                }, 500);
            });

            ext.elements.header.on("click", "a." + ext.cl.sidebar.searchClose, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.clearSearch();
            });
        };
    };

})(jsu);