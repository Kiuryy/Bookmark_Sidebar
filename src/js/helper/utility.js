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
         * Copies the given text to the clipboard
         *
         * @param {string} text
         * @returns {boolean}
         */
        this.copyToClipboard = (text) => {
            let textarea = $("<textarea />").text(text).appendTo(ext.elements.iframeBody);
            textarea[0].select();

            let success = false;
            try {
                success = ext.elements.iframe[0].contentDocument.execCommand('copy');
            } catch (err) {
            }

            textarea.remove();
            return success;
        };

        /**
         * Checks whether the browser is maximized or windowed
         *
         * @returns {boolean}
         */
        this.isWindowed = () => {
            return window.screenX !== 0 || window.screenY !== 0 || window.screen.availWidth !== window.innerWidth;
        };
    };

})(jsu);