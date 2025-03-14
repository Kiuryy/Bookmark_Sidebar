($ => {
    "use strict";

    $.UtilityHelper = function (b) {

        /**
         * Returns all history entries where the title or url are matching the given search value
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.getHistoryBySearchVal = async (opts) => {
            if ($.api.history) {
                const results = await $.api.history.search({
                    text: opts.searchVal,
                    maxResults: 100
                });
                const searchValFiltered = opts.searchVal.toLowerCase();

                results.sort((a, b) => { // sort the history entry to prefer entries where the search value is part of the label and the url, as well as pages, which were visited more often
                    const aScore = (a.title.toLowerCase().indexOf(searchValFiltered) > -1 ? 100 : 0) + (a.url.toLowerCase().indexOf(searchValFiltered) > -1 ? 50 : 0) + a.visitCount + a.typedCount;
                    const bScore = (b.title.toLowerCase().indexOf(searchValFiltered) > -1 ? 100 : 0) + (b.url.toLowerCase().indexOf(searchValFiltered) > -1 ? 50 : 0) + b.visitCount + b.typedCount;
                    return aScore - bScore;
                });

                return {history: results};
            } else {
                return {history: []};
            }
        };

        /**
         * Removes the premium state for the current account
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.removePremiumState = async (opts) => {
            await b.helper.model.setLicenseKey(null);
            await b.reinitialize({type: "premiumDeactivated"});
        };

        /**
         * Activates premium by checking the given license key and storing the license key in the sync storage
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.activatePremium = async (opts) => {
            const response = await b.helper.model.getLicenseKey();
            if (response.licenseKey === opts.licenseKey) { // the given license key is already stored -> return true, but don't reinitialize
                return {success: true, skip: true};
            } else {
                const checkResponse = await this.checkLicenseKey(opts.licenseKey);

                if (!!checkResponse.valid === true) { // valid license key -> reinitialize sidebar
                    const returnData = await b.helper.model.setLicenseKey(opts.licenseKey);
                    await b.reinitialize({type: "premiumActivated"});
                    return returnData;
                } else { // invalid license key
                    return {success: false};
                }
            }
        };

        /**
         * Checks, whether the given license key is valid or not
         *
         * @param {string} licenseKey
         * @returns {Promise}
         */
        this.checkLicenseKey = async (licenseKey) => {
            let response = {};

            try {
                const formData = new FormData();
                formData.append("licenseKey", licenseKey);

                const req = await fetch($.opts.website.premium.checkLicenseKey, {
                    method: "POST",
                    responseType: "json",
                    body: formData
                });

                response = await req.json();
            } catch (err) {
                console.error("License key check: Request failed", licenseKey, err);
                return {valid: null};
            }

            if (response && typeof response.valid !== "undefined") {
                if (!response.valid) {
                    console.error("License key check: Invalid key", licenseKey, response);
                }
                return {valid: response.valid};
            } else {
                console.error("License key check: Invalid response", licenseKey, response);
                return {valid: null};
            }
        };

        /**
         * Checks whether the website is available
         *
         * @returns {Promise}
         */
        this.checkWebsiteStatus = async () => {
            let response = {};

            try {
                const formData = new FormData();
                formData.append("version", $.isDev ? "9.9.9" : $.opts.manifest.version);

                const req = await fetch($.opts.website.api.checkStatus, {
                    method: "POST",
                    responseType: "json",
                    body: formData
                });

                response = await req.json();
            } catch (err) {
                return {status: "unavailable"};
            }

            if (response && response.available) {
                return {status: "available"};
            } else {
                return {status: "unavailable"};
            }
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
        this.openLink = async (opts) => {
            await b.helper.viewAmount.increaseById(opts.id);

            if (opts.hrefName) {
                if ($.opts.website.info[opts.hrefName]) {
                    opts.href = $.opts.website.info[opts.hrefName];
                } else { // hrefName is not a known url -> abort
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

            const url = this.getParsedUrl(opts.href) + params;

            if (opts.newTab && opts.newTab === true) { // new tab
                const createTab = async (idx = null) => {
                    const tabs = await $.api.tabs.query({active: true, currentWindow: true});
                    const tab = await $.api.tabs.create({
                        url: url,
                        active: typeof opts.active === "undefined" ? true : !!(opts.active),
                        index: idx === null ? tabs[0].index + 1 : idx,
                        openerTabId: tabs[0].id
                    });

                    await b.helper.model.setData("openedByExtension", tab.id);
                };

                if (opts.position === "afterLast") {
                    const tabs = await $.api.tabs.query({currentWindow: true});
                    let idx = 0;
                    tabs.forEach((tab) => {
                        idx = Math.max(idx, tab.index);
                    });
                    await createTab(idx + 1);
                } else if (opts.position === "beforeFirst") {
                    await createTab(0);
                } else {
                    await createTab();
                }
            } else if (opts.newWindow && opts.newWindow === true) { // new normal window
                await $.api.windows.create({url: url, state: "maximized"});

            } else if (opts.incognito && opts.incognito === true) { // incognito window
                await $.api.windows.create({url: url, state: "maximized", incognito: true});

            } else { // current tab
                const tabs = await $.api.tabs.query({active: true, currentWindow: true});
                const tab = await $.api.tabs.update(tabs[0].id, {url: url});
                await b.helper.model.setData("openedByExtension", tab.id);
            }
        };
    };

})(jsu);