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
        this.openUrl = async (infos, type = "default", active = true) => {
            const promiseLastOpened = ext.helper.model.setData({"u/lastOpened": infos.id});

            if (type === "incognito") {
                await ext.helper.model.call("openLink", {
                    href: infos.url,
                    incognito: true
                });
            } else if (type === "newWindow") {
                await ext.helper.model.call("openLink", {
                    id: infos.id,
                    href: infos.url,
                    newWindow: true
                });
            } else {
                if (ext.helper.utility.getPageType() === "sidepanel") {
                    Promise.all([
                        promiseLastOpened,
                        $.delay(600)
                    ]).then(() => {
                        ext.helper.toggle.markLastUsed(true);
                    });
                }

                const newtab = type === "newTab";
                if (infos.url.startsWith("javascript:") && newtab === false) {
                    location.href = infos.url;
                } else {
                    await ext.helper.model.call("openLink", {
                        parentId: infos.parentId,
                        id: infos.id,
                        href: infos.url,
                        newTab: type === "newTab",
                        position: ext.helper.model.getData("b/newTabPosition"),
                        active: active
                    });
                }
            }
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
            const textarea = $("<textarea></textarea>").text(text).appendTo(ext.elm.iframeBody);
            textarea[0].select();

            let success = false;
            try {
                success = ext.elm.iframeDocument[0].execCommand("copy");
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
                "javascript:",
                "file://",
                "chrome://",
                "edge://",
                "extension://",
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
                url: {
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
         * Capitalizes the first letter of a string
         *
         * @param {string} str
         * @returns {string}
         */
        this.capitalizeFirstLetter = (str) => {
            return str.charAt(0).toUpperCase() + str.slice(1);
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
                    case "url": {
                        doSort("ASC", (a, b) => {
                            if (!a.url || !b.url) {
                                return a.index - b.index;
                            }
                            const aUrl = a.url.replace(/^https?:\/\//, "").replace(/^www\./, "");
                            const bUrl = b.url.replace(/^https?:\/\//, "").replace(/^www\./, "");
                            return collator.compare(aUrl, bUrl);
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
         * Calls the background script to generate the icon with the given settings and returns it as data url
         *
         * @param opts
         * @returns {Promise<string>}
         */
        this.getIconImageData = async (opts) => {
            const imageData = await ext.helper.model.call("iconImageData", {
                name: opts.shape,
                color: opts.color,
                padding: opts.padding,
                background: opts.background,
            });

            if (imageData) {
                const canvas = document.createElement("canvas");
                canvas.width = 128;
                canvas.height = 128;
                const ctx = canvas.getContext("2d");
                const img = ctx.createImageData(128, 128);

                for (const i in img.data) {
                    img.data[i] = imageData.data[i];
                }
                ctx.putImageData(img, 0, 0);

                return canvas.toDataURL("image/x-icon");
            } else {
                return "";
            }
        };

        /**
         * Returns whether the browser is windowed or not
         * returns always true if Chrome/Edge mobile is used (e.g. when viewing a website in mobile view with devtools)
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

        /**
         * Returns whether the current tab is running in the browser or as webapp
         *
         * @returns {boolean}
         */
        this.isWebapp = () => {
            return window.matchMedia("(display-mode: standalone)").matches;
        };

        /**
         * Returns the type of the current url
         *
         * @returns {string}
         */
        this.getPageType = () => {
            const url = location.href;
            let ret = "other";
            let found = false;

            Object.entries({
                newtab_default: ["https?://www\\.google\\..+/_/chrome/newtab"],
                newtab_fallback: [$.api.runtime.getURL("html/newtab.html") + ".*[?&]type=\\w+"],
                newtab_replacement: [$.api.runtime.getURL("html/newtab.html")],
                sidepanel: [$.api.runtime.getURL("html/sidepanel.html")],
                newtab_website: [".*[?&]bs_nt=1(&|#|$)"],
                website: ["https?://"],
                onboarding: ["chrome\\-extension://.*/intro.html", "extension://.*/intro.html"],
                chrome: ["chrome://", "edge://"],
                extension: ["chrome\\-extension://", "extension://"],
                local: ["file://"]
            }).some(([key, patterns]) => {
                patterns.some((str) => {
                    if (url.search(new RegExp(str, "gi")) === 0) {
                        ret = key;
                        found = true;
                        return true;
                    }
                });
                if (found) {
                    return true;
                }
            });

            return ret;
        };
    };

})(jsu);