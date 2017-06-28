($ => {
    "use strict";

    window.UtilityHelper = function (ext) {

        /**
         * Opens the url of the given bookmark
         *
         * @param {object} infos
         * @param {string} type
         * @param {boolean} active
         */
        this.openUrl = (infos, type = "default", active = true) => {
            if (type === "incognito") {
                ext.helper.model.call("openLink", {
                    href: infos.url,
                    incognito: true
                });
            } else {
                ext.helper.model.call("openLink", {
                    parentId: infos.parentId,
                    id: infos.id,
                    href: infos.url,
                    newTab: type === "newTab",
                    afterLast: ext.helper.model.getData("b/newTabPosition") === "afterLast",
                    active: active
                });
            }
        };

        /**
         * Opens all given bookmarks in new tabs
         *
         * @param {Array} bookmarks
         * @param {boolean} active
         */
        this.openAllBookmarks = (bookmarks, active = true) => {
            ext.helper.model.call("trackEvent", {
                category: "url",
                action: "open",
                label: "new_tab_all_children",
                value: bookmarks.length
            });

            if (ext.helper.model.getData("b/newTabPosition") === "afterCurrent") { // reverse bookmarks to open them in the correct order
                bookmarks.reverse();
            }

            bookmarks.forEach((bookmark) => {
                this.openUrl(bookmark, "newTab", active);
            });
        };

        /**
         * Returns the type of the current url
         *
         * @returns {string}
         */
        this.getPageType = () => {
            let url = location.href;
            let ret = "other";

            let types = {
                newtab: "https?://www.google\..+/_/chrome/newtab",
                website: "https?://",
                onboarding: "chrome\-extension://.*/intro.html",
                chrome: "chrome://",
                extension: "chrome\-extension://",
                local: "file://"
            };

            Object.keys(types).some((key) => {
                if (url.search(new RegExp(types[key], "gi")) === 0) {
                    ret = key;
                    return true;
                }
            });

            return ret;
        };

        /**
         * Returns whether the the sidebar mask should be visible or not
         *
         * @returns {boolean}
         */
        this.sidebarHasMask = () => {
            let pageType = ext.helper.utility.getPageType();
            return pageType !== "newtab" && pageType !== "onboarding";
        };

        /**
         * Triggers an event with the given name
         *
         * @param {string} name
         * @param {object} data
         * @param {Element} scope
         */
        this.triggerEvent = (name, data = {}, scope = null) => {
            (scope || document).dispatchEvent(new CustomEvent(ext.opts.events[name], {
                detail: data,
                bubbles: true,
                cancelable: false
            }));
        };

        /**
         * Adds a separator to the given directory
         *
         * @param {object} data
         * @param {function} callback
         */
        this.addSeparator = (data, callback) => {
            let separators = ext.helper.model.getData("u/separators");

            if (typeof separators[data.id] === "undefined") {
                separators[data.id] = [];
            }

            separators[data.id].push({index: (data.index || 0)});

            ext.helper.model.setData({
                "u/separators": separators
            }, () => {
                if (typeof callback === "function") {
                    callback();
                }
            });
        };

        /**
         * Removes the separator from the given directory
         *
         * @param {object} data
         * @param {function} callback
         */
        this.removeSeparator = (data, callback) => {
            let separators = ext.helper.model.getData("u/separators");

            separators[data.id].some((entry, i) => {
                if (entry.index === data.index) {
                    separators[data.id].splice(i, 1);
                    return true;
                }
            });

            ext.helper.model.setData({
                "u/separators": separators
            }, () => {
                if (typeof callback === "function") {
                    callback();
                }
            });
        };
    };

})(jsu);