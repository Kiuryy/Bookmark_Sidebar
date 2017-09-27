($ => {
    "use strict";

    window.PortHelper = function (b) {

        /**
         * Updates the shareUserdata-Flag
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let updateShareUserdataFlag = (opts) => {
            return new Promise((resolve) => {
                chrome.storage.sync.set({
                    shareUserdata: opts.share
                }, () => {
                    b.helper.model.init().then(resolve);
                });
            });
        };

        /**
         * Checks whether the website is available
         *
         * @returns {Promise}
         */
        let checkWebsiteStatus = () => {
            return new Promise((resolve) => {
                $.xhr(b.urls.checkStatus, {
                    method: "HEAD",
                    timeout: 5000
                }).then(() => {
                    resolve({status: "available"});
                }, () => {
                    resolve({status: "unavailable"});
                });
            });
        };

        /**
         * Returns whether the ShareUserdata-Mask should be shown or not
         *
         * @returns {Promise}
         */
        let shareUserdataMask = () => {
            return new Promise((resolve) => {
                let showMask = false;
                let installationDate = b.helper.model.getData("installationDate");

                if (b.helper.model.shareUserdata() === null && (+new Date() - installationDate) / 86400000 > 5) { // show mask after 5 days using the extension
                    showMask = true;
                }
                resolve({showMask: showMask});
            });
        };


        /**
         * Determines the real url for the given url via ajax call,
         * if abort parameter is specified, all pending ajax calls will be aborted
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let checkUrls = (opts) => {
            return new Promise((resolve) => {
                if (opts.abort && opts.abort === true) {
                    $.cancelXhr(b.urls.checkUrls);
                } else {
                    $.xhr(b.urls.checkUrls, {
                        method: "POST",
                        data: {
                            urlList: opts.urls,
                            ua: navigator.userAgent,
                            lang: chrome.i18n.getUILanguage()
                        }
                    }).then((xhr) => {
                        let response = JSON.parse(xhr.responseText);
                        resolve(response);
                    }, () => {
                        resolve({error: true});
                    });
                }
            });
        };

        /**
         * Updates the given bookmark or directory with the given values (title, url)
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let updateBookmark = (opts) => {
            return new Promise((resolve) => {
                let values = {
                    title: opts.title
                };

                if (opts.url) {
                    values.url = opts.url;
                }

                b.helper.bookmarkApi.func.update(opts.id, values).then(() => {
                    resolve({updated: opts.id});
                }, (error) => {
                    resolve({error: error});
                });
            });
        };

        /**
         * Creates a bookmark or directory with the given values (title, url)
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let createBookmark = (opts) => {
            return new Promise((resolve) => {
                let values = {
                    parentId: opts.parentId,
                    index: opts.index || 0,
                    title: opts.title,
                    url: opts.url ? opts.url : null
                };

                b.helper.bookmarkApi.func.create(values).then(() => {
                    resolve({created: opts.id});
                }, (error) => {
                    resolve({error: error});
                });
            });
        };

        /**
         * Removes the given bookmark or directory recursively
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let deleteBookmark = (opts) => {
            return new Promise((resolve) => {
                b.helper.bookmarkApi.func.removeTree(opts.id).then(() => {
                    resolve({deleted: opts.id});
                });
            });
        };

        /**
         * Updates the position of the given bookmark
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let moveBookmark = (opts) => {
            return new Promise((resolve) => {
                let dest = {
                    parentId: "" + opts.parentId,
                    index: opts.index
                };

                b.helper.bookmarkApi.func.move(opts.id, dest).then(() => {
                    resolve({moved: opts.id});
                });
            });
        };

        /**
         * Returns all bookmarks under the given id
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let getBookmarks = (opts) => {
            return new Promise((resolve) => {
                b.helper.bookmarkApi.func.getSubTree(opts.id).then((bookmarks) => {
                    resolve({bookmarks: bookmarks});
                });
            });
        };

        /**
         * Returns all bookmarks matching the given search val
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let getBookmarksBySearchVal = (opts) => {
            return new Promise((resolve) => {
                b.helper.bookmarkApi.func.search(opts.searchVal).then((bookmarks) => {
                    resolve({bookmarks: bookmarks});
                });
            });
        };

        /**
         * Opens the given url in the current tab or in a new tab
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let openLink = (opts) => {
            return new Promise((resolve) => {
                b.helper.viewAmount.addByEntry(opts);

                if (opts.newTab && opts.newTab === true) { // new tab
                    let createTab = (idx = null) => {
                        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                            chrome.tabs.create({
                                url: opts.href,
                                active: typeof opts.active === "undefined" ? true : !!(opts.active),
                                index: idx === null ? tabs[0].index + 1 : idx,
                                openerTabId: tabs[0].id
                            }, (tab) => {
                                b.helper.model.setData("openedByExtension", tab.id).then(resolve);
                            });
                        });
                    };

                    if (opts.position === "afterLast") {
                        chrome.tabs.query({}, (tabs) => {
                            createTab(tabs[tabs.length - 1].index + 1);
                        });
                    } else if (opts.position === "beforeFirst") {
                        createTab(0);
                    } else {
                        createTab();
                    }
                } else if (opts.incognito && opts.incognito === true) { // incognito window
                    chrome.windows.create({url: opts.href, state: "maximized", incognito: true});
                    resolve();
                } else { // current tab
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        chrome.tabs.update(tabs[0].id, {url: opts.href}, (tab) => {
                            b.helper.model.setData("openedByExtension", tab.id).then(resolve);
                        });
                    });
                }
            });
        };

        this.init = () => {
            return new Promise((resolve) => {
                let mapping = {
                    checkUrls: checkUrls,
                    bookmarks: getBookmarks,
                    searchBookmarks: getBookmarksBySearchVal,
                    moveBookmark: moveBookmark,
                    updateBookmark: updateBookmark,
                    createBookmark: createBookmark,
                    deleteBookmark: deleteBookmark,
                    reload: b.reload,
                    reinitialize: b.reinitialize,
                    shareUserdata: updateShareUserdataFlag,
                    shareUserdataMask: shareUserdataMask,
                    languageInfos: b.helper.language.getAll,
                    langvars: b.helper.language.getVars,
                    favicon: b.helper.image.getFavicon,
                    thumbnail: b.helper.image.getThumbnail,
                    openLink: openLink,
                    getCache: b.helper.cache.get,
                    setCache: b.helper.cache.set,
                    removeCache: b.helper.cache.remove,
                    websiteStatus: checkWebsiteStatus,
                    trackPageView: b.helper.analytics.trackPageView,
                    trackEvent: b.helper.analytics.trackEvent,
                    updateIcon: b.helper.icon.set,
                    reloadIcon: b.helper.icon.init,
                    addViewAmount: b.helper.viewAmount.addByUrl,
                    viewAmounts: b.helper.viewAmount.getAll,
                    updateEntries: b.helper.entries.update,
                    entries: b.helper.entries.getEntries
                };

                chrome.runtime.onConnect.addListener((port) => {
                    if (port.name && port.name === "background") {
                        port.onMessage.addListener((message, info) => {
                            if (mapping[message.type]) { // function for message type exists
                                message.tabInfo = info.sender.tab;
                                mapping[message.type](message).then((result) => {
                                    port.postMessage({
                                        uid: message.uid,
                                        result: result
                                    });
                                });
                            }
                        });
                    }
                });
                resolve();
            });
        };
    };

})(jsu);