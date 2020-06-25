($ => {
    "use strict";

    $.UtilityHelper = function (b) {

        const importantURLParameters = {
            "youtube.com": ["v"],
            "google.com": ["q"],
            "google.de": ["q"],
        };

        /**
         * Returns all history entries where the title or url are matching the given search value
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.getHistoryBySearchVal = (opts) => {
            return new Promise((resolve) => {

                if ($.api.history) {
                    $.api.history.search({
                        text: opts.searchVal,
                        maxResults: 100
                    }, (results) => {
                        const searchValFiltered = opts.searchVal.toLowerCase();

                        results.sort(function (a, b) { // sort the history entry to prefer entries where the search value is part of the label and the url, as well as pages, which were visited more often
                            const aScore = (a.title.toLowerCase().indexOf(searchValFiltered) > -1 ? 100 : 0) + (a.url.toLowerCase().indexOf(searchValFiltered) > -1 ? 50 : 0) + a.visitCount + a.typedCount;
                            const bScore = (b.title.toLowerCase().indexOf(searchValFiltered) > -1 ? 100 : 0) + (b.url.toLowerCase().indexOf(searchValFiltered) > -1 ? 50 : 0) + b.visitCount + b.typedCount;
                            return aScore - bScore;
                        });

                        resolve({history: results});
                    });
                } else {
                    resolve({history: []});
                }
            });
        };

        /**
         * Removes the premium state for the current account
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.removePremiumState = (opts) => {
            return new Promise((resolve) => {
                b.helper.model.setLicenseKey(null).then(() => {
                    return b.reinitialize({type: "premiumDeactivated"});
                }).then(() => {
                    resolve();
                });
            });
        };

        /**
         * Activates premium by checking the given license key and storing the license key in the sync storage
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.activatePremium = (opts) => {
            return new Promise((resolve) => {
                b.helper.model.getLicenseKey().then((response) => {
                    if (response.licenseKey === opts.licenseKey) { // the given license key is already stored -> return true, but don't reinitialize
                        resolve({success: true, skip: true});
                    } else {
                        this.checkLicenseKey(opts.licenseKey).then((response) => {
                            let returnData = {success: false};

                            if (response.valid === true) { // valid license key -> reinitialize sidebar
                                returnData.success = true;

                                b.helper.model.setLicenseKey(opts.licenseKey).then((response) => {
                                    returnData = response;
                                    return b.reinitialize({type: "premiumActivated"});
                                }).then(() => {
                                    resolve(returnData);
                                });
                            } else { // invalid license key
                                resolve(returnData);
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

                $.xhr($.opts.website.premium.checkLicenseKey, {
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
                $.xhr($.opts.website.api.checkStatus, {
                    method: "POST",
                    responseType: "json",
                    data: {
                        version: $.isDev ? "9.9.9" : $.opts.manifest.version
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
         * treat some Chrome specific urls differently to make them work in Edge, Opera, ...
         *
         * @param url
         * @returns {string|null}
         */
        this.getParsedUrl = (url) => {
            if (!url) {
                return url;
            }

            if ($.opts.urlAliases[$.browserName] && $.opts.urlAliases[$.browserName][url]) {
                url = $.opts.urlAliases[$.browserName][url];
            }

            return url;
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
                    if ($.opts.website.info[opts.hrefName]) {
                        opts.href = $.opts.website.info[opts.hrefName];
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
                        $.api.tabs.query({active: true, currentWindow: true}, (tabs) => {
                            $.api.tabs.create({
                                url: this.getParsedUrl(opts.href) + params,
                                active: typeof opts.active === "undefined" ? true : !!(opts.active),
                                index: idx === null ? tabs[0].index + 1 : idx,
                                openerTabId: tabs[0].id
                            }, (tab) => {
                                b.helper.model.setData("openedByExtension", tab.id).then(resolve);
                            });
                        });
                    };

                    if (opts.position === "afterLast") {
                        $.api.tabs.query({currentWindow: true}, (tabs) => {
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
                    $.api.windows.create({url: opts.href + params, state: "maximized"});
                    resolve();
                } else if (opts.incognito && opts.incognito === true) { // incognito window
                    $.api.windows.create({url: opts.href + params, state: "maximized", incognito: true});
                    resolve();
                } else { // current tab
                    $.api.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        $.api.tabs.update(tabs[0].id, {url: opts.href + params}, (tab) => {
                            b.helper.model.setData("openedByExtension", tab.id).then(resolve);
                        });
                    });
                }
            });
        };
    };

})(jsu);