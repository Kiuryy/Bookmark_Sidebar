($ => {
    "use strict";

    $.UtilityHelper = function (b) {

        const importantURLParameters = {
            "youtube.com": ["v"],
            "google.com": ["q"],
            "google.de": ["q"],
        };

        /**
         * Activates premium by checking the given license key and storing the license key in the sync storage
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.activatePremium = (opts) => {
            return new Promise(async (resolve) => {
                b.helper.model.getLicenseKey().then((response) => {
                    if (response.licenseKey === opts.licenseKey) { // the given license key is already stored -> return true, but don't reinitialize
                        resolve({success: true, skip: true});
                    } else {
                        this.checkLicenseKey(opts.licenseKey).then((response) => {
                            if (response.valid === true) { // valid license key -> reinitialize sidebar
                                b.helper.model.setLicenseKey(opts.licenseKey).then(() => {
                                    return b.reinitialize({type: "premiumActivated"});
                                }).then(() => {
                                    resolve({success: true});
                                });
                            } else { // invalid license key
                                resolve({success: false});
                            }
                        });
                    }
                });
            });
        };

        /**
         * Checks, whether the given license key is valid or not
         *
         * @param {string} licenseKey
         * @returns {Promise}
         */
        this.checkLicenseKey = (licenseKey) => {
            return new Promise((resolve) => {

                $.xhr(b.urls.premiumCheck, {
                    method: "POST",
                    responseType: "json",
                    data: {
                        licenseKey: licenseKey
                    }
                }).then((xhr) => {
                    if (xhr.response && typeof xhr.response.valid !== "undefined") {
                        resolve({valid: xhr.response.valid});
                    } else {
                        resolve({valid: null});
                    }
                }, () => {
                    resolve({valid: null});
                });
            });
        };

        /**
         * Checks whether the website is available
         *
         * @returns {Promise}
         */
        this.checkWebsiteStatus = () => {
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
        this.checkUrls = (opts) => {
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
         * Opens the given url while regarding the specified parameters
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.openLink = (opts) => {
            return new Promise((resolve) => {
                b.helper.viewAmount.addByEntry(opts);

                if (opts.hrefName) {
                    if (b.urls[opts.hrefName]) {
                        opts.href = b.urls[opts.hrefName];
                    } else { // hrefName is not a known url -> abort
                        resolve();
                        return;
                    }
                }

                let params = "";

                if (opts.params) { // params are given -> serialize
                    params = Object.entries(opts.params).map(([key, val]) => {
                        return encodeURIComponent(key) + "=" + val;
                    }).join("&");

                    if (params) {
                        params = "?" + params;
                    }
                }

                if (opts.newTab && opts.newTab === true) { // new tab
                    const createTab = (idx = null) => {
                        if (/Opera|OPR\//.test(navigator.userAgent)) { // treat some Chrome specific urls differently to make them work in Opera, too
                            switch (opts.href) {
                                case "chrome://bookmarks":
                                    opts.href = "opera://bookmarks";
                                    break;
                                case "chrome://extensions/shortcuts":
                                    opts.href = "opera://settings/keyboardShortcuts";
                                    break;
                            }
                        }

                        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                            chrome.tabs.create({
                                url: opts.href + params,
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
                    chrome.windows.create({url: opts.href + params, state: "maximized"});
                    resolve();
                } else if (opts.incognito && opts.incognito === true) { // incognito window
                    chrome.windows.create({url: opts.href + params, state: "maximized", incognito: true});
                    resolve();
                } else { // current tab
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        chrome.tabs.update(tabs[0].id, {url: opts.href + params}, (tab) => {
                            b.helper.model.setData("openedByExtension", tab.id).then(resolve);
                        });
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

            const getFilteredUrl = (url) => { // filters the given url -> e.g. https://www.google.com/?q=123#top -> google.com
                let urlObj = null;
                try {
                    urlObj = new URL(url);
                } catch (e) {
                    //
                }

                url = url.split("?")[0];
                url = url.split("#")[0];
                url = url.replace(/^https?:\/\//, "");
                url = url.replace(/^www\./, "");

                const hostname = url.split("/")[0];

                if (urlObj && importantURLParameters[hostname]) { // keep important parameters of known urls -> e.g. https://www.youtube.com/?v=abcdefg&list=xyz -> youtube.com/?v=abcdefg
                    const params = [];
                    importantURLParameters[hostname].forEach((param) => {
                        const val = urlObj.searchParams.get(param);
                        if (val) {
                            params.push(param + "=" + val);
                        }
                    });
                    url += "?" + params.join("&");
                }

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
    };

})(jsu);