($ => {
    "use strict";

    /**
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
         * @returns {Promise}
         */
        this.openUrl = (infos, type = "default", active = true) => {
            return new Promise((resolve) => {
                if (infos.url === "about:blank") {
                    return;
                } else if (infos.url.startsWith("javascript:")) {
                    location.href = infos.url;
                }

                ext.helper.model.setData({
                    "u/lastOpened": infos.id,
                    "u/performReopening": active ? (infos.reopenSidebar || false) : false
                });

                if (type === "incognito") {
                    ext.helper.model.call("openLink", {
                        href: infos.url,
                        incognito: true
                    }).then(resolve);
                } else if (type === "newWindow") {
                    ext.helper.model.call("openLink", {
                        href: infos.url,
                        newWindow: true
                    }).then(resolve);
                } else {
                    ext.helper.model.call("openLink", {
                        parentId: infos.parentId,
                        id: infos.id,
                        href: infos.url,
                        newTab: type === "newTab",
                        position: ext.helper.model.getData("b/newTabPosition"),
                        active: active
                    }).then(resolve);
                }
            });
        };

        /**
         * Opens all given bookmarks in new tabs
         *
         * @param {Array} bookmarks
         * @returns {Promise}
         */
        this.openAllBookmarks = async (bookmarks) => {
            const newTabPosition = ext.helper.model.getData("b/newTabPosition");

            if (newTabPosition === "afterCurrent" || newTabPosition === "beforeFirst") { // reverse bookmarks to open them in the correct order
                bookmarks.reverse();
            }

            for (const bookmark of bookmarks) {
                await this.openUrl(bookmark, "newTab", false);
            }
        };

        /**
         * Checks whether the background script is connected
         *
         * @returns {boolean}
         */
        this.isBackgroundConnected = () => {
            try {
                const port = chrome.runtime.connect();
                if (port) {
                    port.disconnect();
                    return true;
                }
            } catch (e) {
                //
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
            const textarea = $("<textarea />").text(text).appendTo(ext.elm.iframeBody);
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
         * Returns the available sortings
         *
         * @returns {object}
         */
        this.getSortList = () => {
            return {
                custom: {
                    dir: "ASC"
                },
                alphabetical: {
                    dir: "ASC"
                },
                mostUsed: {
                    dir: "DESC"
                },
                recentlyUsed: {
                    dir: "DESC"
                },
                recentlyAdded: {
                    dir: "DESC"
                }
            };
        };

        /**
         * Sorts the given bookmarks by the given sorting
         *
         * @param {Array} bookmarks
         * @param {object} sortObj
         */
        this.sortEntries = (bookmarks, sortObj) => {
            if (bookmarks.length > 1) {
                const collator = ext.helper.i18n.getLocaleSortCollator();
                const doSort = (defaultDir, func) => {
                    bookmarks.sort((a, b) => {
                        const aChildren = !!(a.children);
                        const bChildren = !!(b.children);

                        if (sortObj.name !== "custom" && aChildren !== bChildren) {
                            return aChildren ? -1 : 1;
                        } else {
                            return (defaultDir === sortObj.dir ? 1 : -1) * func(a, b);
                        }
                    });
                };

                switch (sortObj.name) {
                    case "custom": {
                        doSort("ASC", (a, b) => {
                            return a.index - b.index;
                        });
                        break;
                    }
                    case "alphabetical": {
                        doSort("ASC", (a, b) => {
                            return collator.compare(a.title, b.title);
                        });
                        break;
                    }
                    case "recentlyAdded": {
                        doSort("DESC", (a, b) => {
                            return b.dateAdded - a.dateAdded;
                        });
                        break;
                    }
                    case "mostUsed": {
                        const mostViewedPerMonth = ext.helper.model.getData("u/mostViewedPerMonth");
                        doSort("DESC", (a, b) => {
                            const aData = ext.helper.entry.getDataById(a.id);
                            const bData = ext.helper.entry.getDataById(b.id);
                            const aViews = aData ? aData.views[mostViewedPerMonth ? "perMonth" : "total"] : 0;
                            const bViews = bData ? bData.views[mostViewedPerMonth ? "perMonth" : "total"] : 0;
                            if (aViews === bViews) {
                                return collator.compare(a.title, b.title);
                            } else {
                                return bViews - aViews;
                            }
                        });
                        break;
                    }
                    case "recentlyUsed": {
                        doSort("DESC", (a, b) => {
                            const aData = ext.helper.entry.getDataById(a.id);
                            const bData = ext.helper.entry.getDataById(b.id);
                            const aLastView = aData ? aData.views.lastView : 0;
                            const bLastView = bData ? bData.views.lastView : 0;
                            if (aLastView === bLastView) {
                                return collator.compare(a.title, b.title);
                            } else {
                                return bLastView - aLastView;
                            }
                        });
                        break;
                    }
                }
            }
        };

        /**
         * Returns whether the browser is windowed or not
         * returns always true if Chrome mobile is used (e.g. when viewing a website in mobile view with devtools)
         *
         * @returns {boolean}
         */
        this.isWindowed = () => {
            const limitX = 100;
            const limitY = 50;
            return window.screenX > limitX ||
                window.screenY > limitY ||
                Math.abs(window.screen.availWidth - window.innerWidth) > limitY ||
                (window.navigator && window.navigator && window.navigator.userAgent && window.navigator.userAgent && window.navigator.userAgent.search(/[/\s-_]mobile[/\s-_]/i) > -1);
        };
    };

})(jsu);