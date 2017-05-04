($ => {
    "use strict";

    window.SearchHelper = function (ext) {

        /**
         * Initializes the helper
         */
        this.init = () => {
            let data = ext.helper.model.getData(["b/rememberSearch", "u/searchValue"]);

            if (data.rememberSearch) { // restore search result
                if (data.searchValue && data.searchValue.length > 0) { // search value is not empty -> restore
                    ext.elements.header.addClass(ext.opts.classes.sidebar.searchVisible);
                    handleSearchValChanged(data.searchValue);
                }
            }

            initEvents();
        };

        /**
         * Clears the search field and shows the normal bookmark list again
         */
        this.clearSearch = () => {
            ext.helper.contextmenu.close();
            ext.elements.header.removeClass(ext.opts.classes.sidebar.searchVisible);
            handleSearchValChanged("");
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
                ext.startLoading();
                ext.helper.scroll.setScrollPos(ext.elements.bookmarkBox["search"], 0);

                ext.helper.model.call("searchBookmarks", {searchVal: val}, (response) => {
                    ext.elements.bookmarkBox["search"].children("p").remove();

                    let hasResults = false;
                    let list = ext.elements.bookmarkBox["search"].children("ul");
                    list.text("");

                    if (response.bookmarks && response.bookmarks.length > 0) { // results for your search value
                        hasResults = ext.helper.list.addBookmarkDir(response.bookmarks, list, false);
                    }

                    if (hasResults === false) { // no results
                        $("<p />").text(ext.helper.i18n.get("sidebar_search_no_results")).appendTo(ext.elements.bookmarkBox["search"]);
                    }

                    ext.helper.scroll.update(ext.elements.bookmarkBox["search"]);
                    ext.endLoading();
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
                ext.startLoading();
                ext.elements.bookmarkBox["all"].addClass(ext.opts.classes.sidebar.active);
                ext.elements.bookmarkBox["search"].removeClass(ext.opts.classes.sidebar.active);
                ext.helper.scroll.restoreScrollPos(ext.elements.bookmarkBox["all"]);
                ext.endLoading();
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
                this.clearSearch();
            });

        };
    };

})(jsu);