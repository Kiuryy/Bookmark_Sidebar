($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.SearchHelper = function (ext) {

        let searchTimeout = null;
        this.searchVal = "";

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
            return ext.elm.bookmarkBox.search.hasClass($.cl.active);
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
                ext.elm.header.removeClass($.cl.sidebar.searchVisible);
                this.update("").then(resolve);
            });
        };

        /**
         * Shows the search field in the header of the sidebar
         *
         * @returns {Promise}
         */
        this.showSearchField = () => {
            ext.helper.contextmenu.close();
            ext.helper.tooltip.close();
            ext.elm.header.addClass($.cl.sidebar.searchVisible);
            ext.elm.header.find("div." + $.cl.sidebar.searchBox + " > input[type='text']")[0].focus();
        };

        /**
         * Handles the view of the search result list
         *
         * @param {string} val
         * @returns {Promise}
         */
        this.update = (val = null) => {
            return new Promise((resolve) => {
                const searchField = ext.elm.header.find("div." + $.cl.sidebar.searchBox + " > input[type='text']");

                if (searchField && searchField.length() > 0) { // search field may be missing when the sidebar is in selection mode
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
                } else {
                    resolve();
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
        const handleSearch = (searchField, val) => {
            return new Promise((resolve) => {
                ext.elm.bookmarkBox.all.removeClass($.cl.active).removeClass($.cl.scrollBox.scrolled);
                ext.elm.bookmarkBox.search.addClass($.cl.active);
                ext.helper.scroll.focus();
                ext.helper.list.updateSortFilter();

                this.searchVal = val;

                if (val !== searchField.data("lastVal")) { // search value is not the same
                    ext.startLoading();
                    searchField.data("lastVal", val);

                    ext.helper.entry.initOnce().then(() => {
                        ext.helper.scroll.setScrollPos(ext.elm.bookmarkBox.search, 0);
                        return getSearchResults(val);
                    }).then((result) => {
                        ext.elm.bookmarkBox.search.children("p").remove();

                        let hasResults = false;
                        const list = ext.elm.bookmarkBox.search.children("ul");
                        list.text("");

                        if (result.length > 0) { // results for your search value
                            hasResults = ext.helper.list.addBookmarkDir(result, list, false);
                        }

                        if (hasResults === false) { // no results
                            $("<p></p>").text(ext.helper.i18n.get("sidebar_search_no_results")).appendTo(ext.elm.bookmarkBox.search);
                        }

                        ext.endLoading(100);
                        resolve();
                    });
                }
            });
        };

        /**
         * Returns all elements matching the given search value,
         * includes bookmarks, directories and elements with matching additional information
         *
         * @param {string} val
         * @returns {Promise}
         */
        const getSearchResults = async (val) => {
            const valLower = val.toLowerCase();
            const idList = [];

            const response = await ext.helper.model.call("searchBookmarks", {searchVal: val});
            const result = response.bookmarks || [];
            result.forEach((entry) => {
                idList.push(entry.id);
            });

            const directories = ext.helper.entry.getAllDataByType("directories");

            directories.forEach((directory, idx) => {
                if (directory.title.toLowerCase().indexOf(valLower) > -1) {
                    directory.index = -1000 + idx;
                    result.push(directory);
                    idList.push(directory.id);
                }
            });

            const additionalInfoList = ext.helper.model.getData("u/additionalInfo");
            Object.entries(additionalInfoList).forEach(([id, info]) => {
                if (info && info.desc && info.desc.toLocaleLowerCase().indexOf(valLower) > -1 && idList.indexOf(id) === -1) { // additional information is matching the search value
                    const data = ext.helper.entry.getDataById(id);
                    if (data) {
                        if (data.isDir) {
                            data.index = -1000 + data.index;
                        }

                        result.push(data);
                    }
                }
            });

            return result;
        };

        /**
         * Resets the search results and shows the normal bookmark list again
         *
         * @param {jsu} searchField
         * @returns {Promise}
         */
        const reset = (searchField) => {
            return new Promise((resolve) => {
                searchField.removeData("lastVal");
                this.searchVal = "";

                if (this.isResultsVisible()) {
                    ext.startLoading();
                    ext.elm.bookmarkBox.all.addClass($.cl.active);
                    ext.elm.bookmarkBox.search.removeClass([$.cl.active, $.cl.scrollBox.scrolled]);
                    ext.elm.bookmarkBox.search.removeAttr($.attr.direction);
                    ext.helper.scroll.restoreScrollPos(ext.elm.bookmarkBox.all);
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
        const initEvents = () => {
            ext.elm.header.on("click", "a." + $.cl.sidebar.search, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showSearchField();
            });

            ext.elm.header.on("click", "a." + $.cl.sidebar.searchClose, (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.clearSearch();
            });

            ext.elm.header.on("keyup", "div." + $.cl.sidebar.searchBox + " > input[type='text']", (e) => {
                e.preventDefault();
                if (searchTimeout) {
                    clearTimeout(searchTimeout);
                    searchTimeout = null;
                }

                searchTimeout = setTimeout(() => {
                    this.update();
                }, 300);
            }).on("keydown", "div." + $.cl.sidebar.searchBox + " > input[type='text']", (e) => { // if there is only one search result, 'enter' will perform a click on this entry
                if (e.key && e.key.toUpperCase() === "ENTER") {
                    const searchResults = ext.elm.bookmarkBox.search.find("> ul > li");

                    if (searchResults.length() === 1) {
                        ext.helper.sidebarEvents.handleEntryClick(searchResults.eq(0).children("a"), {
                            ctrlKey: (e.ctrlKey || e.metaKey)
                        });
                    }
                }
            });
        };
    };

})(jsu);