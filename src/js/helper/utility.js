($ => {
    "use strict";

    /**
     * @requires helper: model
     * @param {object} ext
     * @constructor
     */
    $.UtilityHelper = function (ext) {

        /**
         * Opens the url of the given bookmark
         *
         * @param {object} infos
         * @param {string} type
         * @param {boolean} active
         */
        this.openUrl = (infos, type = "default", active = true) => {
            if (infos.url === "about:blank") {
                return;
            }

            ext.helper.model.setData({
                "u/lastOpened": infos.id,
                "u/performReopening": active ? (infos.reopenSidebar || false) : false
            });

            if (type === "incognito") {
                ext.helper.model.call("openLink", {
                    href: infos.url,
                    incognito: true
                });
            } else if (type === "newWindow") {
                ext.helper.model.call("openLink", {
                    href: infos.url,
                    newWindow: true
                });
            } else {
                ext.helper.model.call("openLink", {
                    parentId: infos.parentId,
                    id: infos.id,
                    href: infos.url,
                    newTab: type === "newTab",
                    position: ext.helper.model.getData("b/newTabPosition"),
                    active: active
                });
            }
        };

        /**
         * Opens all given bookmarks in new tabs
         *
         * @param {Array} bookmarks
         */
        this.openAllBookmarks = (bookmarks) => {
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
                this.openUrl(bookmark, "newTab", false);
            });
        };

        /**
         * Checks whether the background script is connected
         *
         * @returns {boolean}
         */
        this.isBackgroundConnected = () => {
            let port = chrome.runtime.connect();
            if (port) {
                port.disconnect();
                return true;
            }
            return false;
        };

        /**
         * Triggers an event with the given name
         *
         * @param {string} name
         * @param {object} data
         * @param {Element} scope
         */
        this.triggerEvent = (name, data = {}, scope = null) => {
            (scope || document).dispatchEvent(new CustomEvent($.opts.events[name], {
                detail: data,
                bubbles: true,
                cancelable: false
            }));
        };

        /**
         * Copies the given text to the clipboard
         *
         * @param {string} text
         * @returns {boolean}
         */
        this.copyToClipboard = (text) => {
            let textarea = $("<textarea />").text(text).appendTo(ext.elm.iframeBody);
            textarea[0].select();

            let success = false;
            try {
                success = ext.elm.iframe[0].contentDocument.execCommand("copy");
            } catch (err) {
                //
            }

            textarea.remove();
            return success;
        };

        /**
         * Returns true if the given url matches the list of blacklisted urls,
         * this is useful to prevent checking the existence of non existing urls or trying to retrieve thumbnails for them
         *
         * @param {string} url
         * @returns {boolean}
         */
        this.isUrlOnBlacklist = (url) => {
            if (!url || url.trim().length === 0) {
                return true;
            }

            let ret = false;

            [
                "about:",
                "https?://192\.168\.",
                "192\.168\.",
                "https?://localhost",
                "localhost",
                "https?://127\.0\.0\.",
                "127\.0\.0\.",
                "file://",
                "chrome://",
                "chrome\-extension://"
            ].some((str) => {
                if (url.search(new RegExp(str, "gi")) === 0) {
                    ret = true;
                    return true;
                }
            });

            return ret;
        };

        /**
         * Returns whether the browser is windowed or not
         * returns always true if Chrome mobile is used (e.g. when viewing a website in mobile view with devtools)
         *
         * @returns {boolean}
         */
        this.isWindowed = () => {
            let limit = 12;
            return window.screenX > limit ||
                window.screenY > limit ||
                Math.abs(window.screen.availWidth - window.innerWidth) > limit ||
                (window.navigator && window.navigator && window.navigator.userAgent && window.navigator.userAgent && window.navigator.userAgent.search(/[/\s-_]mobile[/\s-_]/i) > -1);
        };
    };

})(jsu);