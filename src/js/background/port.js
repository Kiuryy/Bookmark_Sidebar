($ => {
    "use strict";

    $.PortHelper = function (b) {

        /**
         * Checks whether the website is available
         *
         * @returns {Promise}
         */
        const checkWebsiteStatus = () => {
            return new Promise((resolve) => {
                $.xhr(b.urls.checkStatus, {
                    method: "POST",
                    responseType: "json",
                    data: {
                        version: b.isDev ? "9.9.9" : b.manifest.version
                    }
                }).then((xhr) => {
                    if (xhr.response && xhr.response.available) {
                        resolve({status: "available"});
                    } else {
                        resolve({status: "unavailable"});
                    }
                }, () => {
                    resolve({status: "unavailable"});
                });
            });
        };

        /**
         * Determines the real url for the given url via ajax call,
         * if abort parameter is specified, all pending ajax calls will be aborted
         *
         * @param {object} opts
         * @returns {Promise}
         */
        const checkUrls = (opts) => {
            return new Promise((resolve) => {
                if (opts.abort && opts.abort === true) {
                    $.cancelXhr(b.urls.checkUrls);
                } else {
                    Promise.all([
                        $.xhr(b.urls.checkUrls, {
                            method: "POST",
                            data: {
                                urlList: opts.urls,
                                ua: navigator.userAgent,
                                lang: chrome.i18n.getUILanguage()
                            }
                        }),
                        getDuplicateInfo(opts.urls)
                    ]).then(([xhr, duplicates]) => {
                        const response = JSON.parse(xhr.responseText);
                        resolve({
                            xhr: response,
                            duplicates: duplicates
                        });
                    }, () => {
                        resolve({error: true});
                    });
                }
            });
        };

        /**
         * Checks whether the given urls are used by multiple bookmarks and returns information about all duplicate bookmarks for the given url list
         *
         * @param {object} urls
         * @returns {Promise}
         */
        const getDuplicateInfo = async (urls) => {
            const ret = {};
            const urlList = Object.values(urls);

            const getFilteredUrl = (url) => { // filters the given url -> e.g. https://www.google.com/?q=123 -> google.com
                url = url.split("?")[0];
                url = url.split("#")[0];
                url = url.replace(/^https?:\/\//, "");
                url = url.replace(/^www\./, "");
                return url;
            };

            for (const url of urlList) {
                const filteredUrl = getFilteredUrl(url);
                const result = await b.helper.bookmarks.api.search(filteredUrl); // will return some false positive (e.g. 'google.com/' will also return all subdomains of google.com and all subdirectories)

                if (result.length > 1) {
                    const realResults = [];

                    result.forEach((bookmark) => { // filter the result array and only add real duplicates to the final result list
                        if (getFilteredUrl(bookmark.url) === filteredUrl) {
                            realResults.push(bookmark);
                        }
                    });

                    if (realResults.length > 1) { // there are real duplicates -> add to object
                        ret[filteredUrl] = {
                            url: url,
                            duplicates: realResults
                        };
                    }
                }
            }

            return ret;
        };

        /**
         * Opens the given url while regarding the specified parameters
         *
         * @param {object} opts
         * @returns {Promise}
         */
        const openLink = (opts) => {
            return new Promise((resolve) => {
                b.helper.viewAmount.addByEntry(opts);

                if (opts.newTab && opts.newTab === true) { // new tab
                    const createTab = (idx = null) => {
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
                        chrome.tabs.query({currentWindow: true}, (tabs) => {
                            let idx = 0;
                            tabs.forEach((tab) => {
                                idx = Math.max(idx, tab.index);
                            });
                            createTab(idx + 1);
                        });
                    } else if (opts.position === "beforeFirst") {
                        createTab(0);
                    } else {
                        createTab();
                    }
                } else if (opts.newWindow && opts.newWindow === true) { // new normal window
                    chrome.windows.create({url: opts.href, state: "maximized"});
                    resolve();
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
                let c = 0;
                const mapping = {
                    checkUrls: checkUrls,
                    bookmarks: b.helper.bookmarks.getById,
                    searchBookmarks: b.helper.bookmarks.getBySearchVal,
                    moveBookmark: b.helper.bookmarks.move,
                    updateBookmark: b.helper.bookmarks.update,
                    createBookmark: b.helper.bookmarks.create,
                    deleteBookmark: b.helper.bookmarks.remove,
                    reload: b.reload,
                    reinitialize: b.reinitialize,
                    updateShareInfo: b.helper.model.setShareInfo,
                    infoToDisplay: b.helper.model.getInfoToDisplay,
                    languageInfos: b.helper.language.getAvailableLanguages,
                    langvars: b.helper.language.getLangVars,
                    favicon: b.helper.image.getFavicon,
                    thumbnail: b.helper.image.getThumbnail,
                    openLink: openLink,
                    userType: b.helper.model.getUserType,
                    activatePremium: b.activatePremium,
                    getCache: b.helper.cache.get,
                    setCache: b.helper.cache.set,
                    removeCache: b.helper.cache.remove,
                    websiteStatus: checkWebsiteStatus,
                    track: b.helper.analytics.track,
                    updateIcon: b.helper.icon.set,
                    reloadIcon: b.helper.icon.init,
                    reloadContextmenus: b.helper.browserAction.initContextmenus,
                    clearNotWorkingTimeout: b.helper.browserAction.clearTimeout,
                    setNotWorkingReason: b.helper.browserAction.setReason,
                    addViewAmount: b.helper.viewAmount.addByUrl,
                    viewAmounts: b.helper.viewAmount.getAll
                };

                chrome.runtime.onConnect.addListener((port) => {
                    if (port.name && port.name === "background") {
                        port.onMessage.addListener((message, info) => {
                            if (mapping[message.type]) { // function for message type exists
                                if (c === 70) { // check whether the userdata should be shared for today from time to time
                                    b.helper.analytics.trackUserData();
                                    c %= 70;
                                }
                                message.tabInfo = info.sender.tab;

                                mapping[message.type](message).then((result) => {
                                    try { // can fail if port is closed in the meantime
                                        port.postMessage({
                                            uid: message.uid,
                                            result: result
                                        });
                                    } catch (e) {
                                        //
                                    }
                                });

                                c++;
                            }
                        });
                    }
                });
                resolve();
            });
        };
    };

})(jsu);