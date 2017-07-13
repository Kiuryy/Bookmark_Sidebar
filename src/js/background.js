($ => {
    "use strict";

    let opts = {
        ga: {
            url: "https://www.google-analytics.com/analytics.js",
            trackingCode: {
                dev: "100595538-3",
                live: "100595538-2"
            }
        },
        urls: {
            check404: "https://blockbyte.de/extensions",
            updateUrls: "https://blockbyte.de/ajax/extensions/updateUrls",
            uninstall: "https://blockbyte.de/extensions/bs/uninstall",
            onboarding: "https://blockbyte.de/extensions/bs/install"
        },
        langs: {
            af: "Afrikaans",
            ar: "Arabic",
            hy: "Armenian",
            be: "Belarusian",
            bg: "Bulgarian",
            ca: "Catalan",
            "zh-CN": "Chinese (Simplified)",
            "zh-TW": "Chinese (Traditional)",
            hr: "Croatian",
            cs: "Czech",
            da: "Danish",
            nl: "Dutch",
            en: "English",
            eo: "Esperanto",
            et: "Estonian",
            tl: "Filipino",
            fi: "Finnish",
            fr: "French",
            de: "German",
            el: "Greek",
            iw: "Hebrew",
            hi: "Hindi",
            hu: "Hungarian",
            is: "Icelandic",
            id: "Indonesian",
            it: "Italian",
            ja: "Japanese",
            ko: "Korean",
            lv: "Latvian",
            lt: "Lithuanian",
            no: "Norwegian",
            fa: "Persian",
            pl: "Polish",
            pt: "Portuguese",
            ro: "Romanian",
            ru: "Russian",
            sr: "Serbian",
            sk: "Slovak",
            sl: "Slovenian",
            es: "Spanish",
            sw: "Swahili",
            sv: "Swedish",
            ta: "Tamil",
            th: "Thai",
            tr: "Turkish",
            uk: "Ukrainian",
            vi: "Vietnamese"
        }
    };

    let background = function (s) {
        let shareUserdata = null;
        let data = {};
        let bookmarkApi = {};
        let bookmarkImportRunning = false;
        let langVarsChache = {};
        let trackingQueue = [];
        let trackingQueueProceeding = false;

        /**
         * Increases the Click Counter of the given bookmark
         *
         * @param {object} bookmark
         */
        let increaseViewAmount = (bookmark) => {
            if (bookmark["id"]) {
                getClickCounter().then((clickCounter) => {
                    if (typeof clickCounter[bookmark["id"]] === "undefined") {
                        clickCounter[bookmark["id"]] = {c: 0};
                    }

                    if (typeof clickCounter[bookmark["id"]] !== "object") { // @deprecated
                        clickCounter[bookmark["id"]] = {
                            c: clickCounter[bookmark["id"]]
                        };
                    }

                    clickCounter[bookmark["id"]].c++;
                    clickCounter[bookmark["id"]].d = +new Date();
                    delete clickCounter["node_" + bookmark["id"]]; // @deprecated

                    chrome.storage.local.set({
                        clickCounter: clickCounter
                    });
                });
            }
        };

        /**
         * Opens the given url in the current tab or in a new tab
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let openLink = (opts) => {
            return new Promise((resolve) => {
                increaseViewAmount(opts);

                if (opts.newTab && opts.newTab === true) { // new tab
                    let createTab = (idx = null) => {
                        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                            chrome.tabs.create({
                                url: opts.href,
                                active: typeof opts.active === "undefined" ? true : !!(opts.active),
                                index: idx === null ? tabs[0].index + 1 : idx,
                                openerTabId: tabs[0].id
                            }, (tab) => {
                                data.openedByExtension = tab.id;
                                saveModelData().then(resolve);
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
                            data.openedByExtension = tab.id;
                            saveModelData().then(resolve);
                        });
                    });
                }
            });
        };

        /**
         * Returns the data url of the favicon of the given url
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let getFavicon = (opts) => {
            return new Promise((resolve) => {
                let img = new Image();
                img.onload = function () {
                    let canvas = document.createElement("canvas");
                    canvas.width = this.width;
                    canvas.height = this.height;

                    let ctx = canvas.getContext("2d");
                    ctx.drawImage(this, 0, 0);

                    let dataURL = canvas.toDataURL("image/png");
                    resolve({img: dataURL});
                };
                img.src = 'chrome://favicon/size/16@2x/' + opts.url;
            });
        };

        /**
         * Returns the view amounts of all bookmarks
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let getViewAmounts = (opts) => {
            return new Promise((resolve) => {
                getClickCounter().then((clickCounter) => {
                    resolve({
                        viewAmounts: clickCounter,
                        counterStartDate: data.installationDate
                    });
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
                bookmarkApi.getSubTree(opts.id).then((bookmarks) => {
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
                bookmarkApi.search(opts.searchVal).then((bookmarks) => {
                    resolve({bookmarks: bookmarks});
                });
            });
        };

        /**
         * Determines whether a bookmark to the given url exists and if so increases the view counter,
         * only if the tab was not previously opened or changed from the extension (these clicks are counted alreay)
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let addViewAmountByUrl = (opts) => {
            return new Promise((resolve) => {
                if (typeof data.openedByExtension === "undefined") { // page was not opened by extension -> view was not counted yet
                    bookmarkApi.search({url: opts.url}).then((bookmarks) => {
                        bookmarks.some((bookmark) => {
                            if (bookmark.url === opts.url) {
                                increaseViewAmount(bookmark);
                                return true;
                            }
                            return false;
                        });
                        resolve();
                    });
                }
                delete data.openedByExtension;

                saveModelData();
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

                bookmarkApi.move(opts.id, dest).then(() => {
                    resolve({moved: opts.id});
                });
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

                bookmarkApi.update(opts.id, values).then(() => {
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

                bookmarkApi.create(values).then(() => {
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
                bookmarkApi.removeTree(opts.id).then(() => {
                    resolve({deleted: opts.id});
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
        let checkUrls = (opts) => {
            return new Promise((resolve) => {
                if (opts.abort && opts.abort === true) {
                    $.cancelXhr(s.urls.updateUrls);
                } else {
                    $.xhr(s.urls.updateUrls, {
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
         * Returns the information about the all languages
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let getAllLanguages = (opts) => {
            return new Promise((resolve) => {
                getLanguageInfos().then((infos) => {
                    resolve({infos: infos});
                });
            });
        };

        /**
         * Returns the language variables for the given language
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let getLangVars = (opts) => {
            return new Promise((resolve) => {
                if (opts.lang) {
                    let cacheVars = typeof opts.cache === "undefined" || opts.cache === true;

                    if (langVarsChache[opts.lang] && cacheVars) { // take langvars from cache
                        resolve({langVars: langVarsChache[opts.lang]});
                    } else { // load langvars with xhr request
                        let sendXhr = (obj) => {
                            let langVars = obj.langVars;

                            $.xhr(chrome.extension.getURL("_locales/" + opts.lang + "/messages.json")).then((xhr) => {
                                let result = JSON.parse(xhr.responseText);
                                Object.assign(langVars, result); // override all default variables with the one from the language file

                                if (cacheVars) {
                                    langVarsChache[opts.lang] = langVars;
                                }
                                resolve({langVars: langVars});
                            });
                        };

                        if (opts.defaultLang && opts.defaultLang !== opts.lang) { // load default language variables first and replace them afterwards with the language specific ones
                            getLangVars({lang: opts.defaultLang, cache: false}).then(sendXhr);
                        } else {
                            sendXhr({langVars: {}});
                        }
                    }
                }
            });
        };

        /**
         * Returns whether the ShareUserdata-Mask should be shown or not
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let shareUserdataMask = (opts) => {
            return new Promise((resolve) => {
                let showMask = false;
                if (shareUserdata === null && (+new Date() - data.installationDate) / 86400000 > 5) { // show mask after 5 days using the extension
                    showMask = true;
                }
                resolve({showMask: showMask});
            });
        };

        /**
         * Checks whether the website is available
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let checkWebsiteStatus = (opts) => {
            return new Promise((resolve) => {
                $.xhr(s.urls.check404, {
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
         * Sends a message to all tabs, so they are reloading the sidebar
         *
         * @param {object} opts
         * @returns {Promise}
         */
        let refreshAllTabs = (opts) => {
            return new Promise((resolve) => {
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach((tab) => {
                        chrome.tabs.sendMessage(tab.id, {
                            action: "refresh",
                            scrollTop: opts.scrollTop || false,
                            type: opts.type
                        });
                    });
                    resolve();
                });
            });
        };

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
                    shareUserdata = opts.share;
                    resolve();
                });
            });
        };

        /**
         * Tracks an event in Google Analytics with the given values,
         * only do if user allows userdata sharing or if the parameter is specified
         *
         * @param {object} opts
         * @param {boolean} ignoreShareUserdata
         * @returns {Promise}
         */
        let trackEvent = (opts, ignoreShareUserdata = false) => {
            return new Promise((resolve) => {
                addObjectToTrackingQueue({
                    hitType: 'event',
                    eventCategory: opts.category,
                    eventAction: opts.action,
                    eventLabel: opts.label,
                    eventValue: opts.value || 1
                }, ignoreShareUserdata);
                resolve();
            });
        };

        /**
         * Tracks an event in Google Analytics with the given values,
         * only do if user allows userdata sharing or if the parameter is specified
         *
         * @param {object} opts
         * @param {boolean} ignoreShareUserdata
         * @returns {Promise}
         */
        let trackPageView = (opts, ignoreShareUserdata = false) => {
            return new Promise((resolve) => {
                addObjectToTrackingQueue({
                    hitType: 'pageview',
                    page: opts.page
                }, ignoreShareUserdata);
                resolve();
            });
        };

        /**
         * Adds the given object to the tracking queue and processes the queue if it is not already processing,
         * only works if user allows userdata sharing or if the parameter is specified
         *
         * @param {object} obj
         * @param {boolean} ignoreShareUserdata
         */
        let addObjectToTrackingQueue = (obj, ignoreShareUserdata) => {
            if (shareUserdata === true || ignoreShareUserdata === true) {
                trackingQueue.push(obj);
                if (trackingQueueProceeding === false) {
                    processTrackingQueue();
                }
            }
        };

        /**
         * Processes the tracking queue,
         * sends every 1000ms the oldest entry of the queue to Google Analytics
         */
        let processTrackingQueue = () => {
            trackingQueueProceeding = true;
            $.delay(1000).then(() => {
                if (trackingQueue.length > 0 && window.ga && window.ga.loaded) {
                    let entry = trackingQueue.shift();
                    window.ga('send', entry);
                    processTrackingQueue();
                } else {
                    trackingQueueProceeding = false;
                }
            });
        };

        /**
         * Initialises the message listener for various methods
         *
         * @returns {Promise}
         */
        let initMessageListener = async () => {
            let mapping = {
                checkUrls: checkUrls,
                addViewAmount: addViewAmountByUrl,
                bookmarks: getBookmarks,
                searchBookmarks: getBookmarksBySearchVal,
                moveBookmark: moveBookmark,
                updateBookmark: updateBookmark,
                createBookmark: createBookmark,
                deleteBookmark: deleteBookmark,
                refreshAllTabs: refreshAllTabs,
                shareUserdata: updateShareUserdataFlag,
                shareUserdataMask: shareUserdataMask,
                languageInfos: getAllLanguages,
                langvars: getLangVars,
                favicon: getFavicon,
                openLink: openLink,
                websiteStatus: checkWebsiteStatus,
                trackPageView: trackPageView,
                trackEvent: trackEvent,
                viewAmounts: getViewAmounts
            };

            chrome.extension.onMessage.addListener((message, sender, sendResponse) => {
                if (mapping[message.type]) { // function for message type exists
                    mapping[message.type](message).then((opts) => {
                        sendResponse(opts)
                    });
                }

                return true; // important to allow asynchronous responses
            });
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            chrome.browserAction.onClicked.addListener(() => { // click on extension icon shall open the sidebar
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    chrome.tabs.sendMessage(tabs[0].id, {action: "toggleSidebar"});
                });
            });

            chrome.bookmarks.onImportBegan.addListener(() => { // indicate that the import process started
                bookmarkImportRunning = true;
            });

            chrome.bookmarks.onImportEnded.addListener(() => { // indicate that the import process finished
                bookmarkImportRunning = false;
                refreshAllTabs({type: "Created"});
            });

            ["Changed", "Created", "Removed"].forEach((eventName) => { // trigger an event in all tabs after changing/creating/removing a bookmark
                chrome.bookmarks["on" + eventName].addListener(() => {
                    if (bookmarkImportRunning === false || eventName !== "Created") { // only refresh tabs when the bookmark was not created by the import process
                        refreshAllTabs({type: eventName});
                    }
                });
            });
        };

        /**
         * Initialises the listener for chrome and extension updates
         *
         * @returns {Promise}
         */
        let initUpdateListener = async () => {
            chrome.runtime.onUpdateAvailable.addListener(() => { // reload background script when an update is available
                chrome.runtime.reload();
            });

            chrome.runtime.onInstalled.addListener((details) => {
                if (details.reason === 'install') { // extension was installed newly -> show onboarding page
                    chrome.tabs.create({url: chrome.extension.getURL('html/intro.html')});
                } else if (details.reason === 'update') { // extension was updated
                    chrome.storage.local.remove(["languageInfos"]);
                    let newVersion = chrome.runtime.getManifest().version;

                    if (details.previousVersion !== newVersion) {
                        trackEvent({
                            category: "extension",
                            action: "update",
                            label: details.previousVersion + " -> " + newVersion
                        }, true);
                    }

                    let versionPartsOld = details.previousVersion.split('.');
                    let versionPartsNew = newVersion.split('.');

                    if (versionPartsOld[0] !== versionPartsNew[0] || versionPartsOld[1] !== versionPartsNew[1]) { // version jump (e.g. 2.1.x -> 2.2.x)
                        chrome.storage.sync.get(["model"], (obj) => {
                            if (typeof obj.model !== "undefined" && (typeof obj.model.updateNotification === "undefined" || obj.model.updateNotification !== newVersion)) { // show changelog only one time for this update
                                data.updateNotification = newVersion;
                                saveModelData().then(() => {
                                    chrome.tabs.create({url: chrome.extension.getURL('html/changelog.html')});
                                });
                            }
                        });

                        chrome.storage.sync.get(null, (obj) => {  // upgrade configuration
                            if (typeof obj.behaviour === "undefined") {
                                obj.behaviour = {};
                            }

                            if (typeof obj.appearance === "undefined") {
                                obj.appearance = {};
                            }

                            // START UPGRADE // v1.10
                            // chrome.storage.sync.remove(["utility"]);
                            // END UPGRADE // v1.10

                            // START UPGRADE // v1.9
                            if (typeof obj.utility !== "undefined") {
                                chrome.storage.local.set({utility: obj.utility});
                            }

                            delete obj.behaviour.scrollSensitivity;

                            if (typeof obj.appearance.styles === "undefined") {
                                obj.appearance.styles = {};
                            }

                            if (typeof obj.appearance.styles.fontFamily !== "undefined" && obj.appearance.styles.fontFamily === "Roboto") {
                                obj.appearance.styles.fontFamily = "default";
                            }

                            if (typeof obj.appearance.styles.directoriesIconSize === "undefined" && typeof obj.appearance.styles.bookmarksIconSize !== "undefined") {
                                obj.appearance.styles.directoriesIconSize = obj.appearance.styles.bookmarksIconSize;
                            }

                            chrome.storage.sync.remove(["clickCounter"]);
                            // END UPGRADE // v1.9

                            // START UPGRADE // v1.8
                            delete obj.behaviour.hideEmptyDirs;

                            if (typeof obj.appearance.styles.colorScheme === "undefined") {
                                obj.appearance.styles.colorScheme = "rgb(0,137,123)";
                            }

                            if (typeof obj.behaviour.initialOpenOnNewTab === "undefined") {
                                obj.behaviour.initialOpenOnNewTab = chrome.i18n.getUILanguage() === "de";
                            }
                            // END UPGRADE // v1.8

                            // START UPGRADE // v1.7
                            delete obj.appearance.addVisual;
                            delete obj.behaviour.rememberScroll;
                            delete obj.behaviour.model;
                            delete obj.behaviour.clickCounter;
                            delete obj.behaviour.clickCounterStartDate;

                            if (typeof obj.appearance.styles.bookmarksDirIcon !== "undefined" && (obj.appearance.styles.bookmarksDirIcon === "dir" || obj.appearance.styles.bookmarksDirIcon === "dir-alt1" || obj.appearance.styles.bookmarksDirIcon === "dir-alt2")) {
                                obj.appearance.styles.bookmarksDirIcon = "dir-1";
                            }
                            // END UPGRADE // v1.7

                            chrome.storage.sync.set({behaviour: obj.behaviour});
                            chrome.storage.sync.set({appearance: obj.appearance});
                        });
                    }
                }
            });
        };

        /**
         * Saves the current data-object in the chrome storage
         *
         * @returns {Promise}
         */
        let saveModelData = () => {
            return new Promise((resolve) => {
                if (Object.getOwnPropertyNames(data).length > 0) {
                    chrome.storage.sync.set({
                        model: data
                    }, () => {
                        resolve();
                    });
                }
            });
        };

        /**
         * Retrieves infos about the views of the bookmarks
         *
         * @returns {Promise}
         */
        let getClickCounter = () => {
            return new Promise((resolve) => {
                chrome.storage.local.get(["clickCounter"], (obj) => {
                    let clickCounter = {};

                    if (typeof obj.clickCounter !== "undefined") { // data available
                        clickCounter = obj.clickCounter;
                    }

                    resolve(clickCounter);
                });
            });
        };

        /**
         * Returns information about all languages (e.g. if they are available in the extension)
         *
         * @returns {Promise}
         */
        let getLanguageInfos = () => {
            return new Promise((resolve) => {
                chrome.storage.local.get(["languageInfos"], (obj) => {
                    if (obj && obj.languageInfos && (+new Date() - obj.languageInfos.updated) / 36e5 < 8) { // cached
                        resolve(obj.languageInfos.infos);
                    } else { // not cached -> determine available languages
                        let total = Object.keys(s.langs).length;
                        let loaded = 0;
                        let infos = {};

                        Object.keys(s.langs).forEach((lang) => {
                            infos[lang] = {
                                name: lang,
                                label: s.langs[lang],
                                available: false
                            };

                            let xhrDone = () => {
                                if (++loaded === total) {
                                    chrome.storage.local.set({
                                        languageInfos: {infos: infos, updated: +new Date()}
                                    });
                                    resolve(infos);
                                }
                            };

                            $.xhr(chrome.extension.getURL("_locales/" + lang + "/messages.json"), {method: "HEAD"}).then(() => {
                                infos[lang].available = true;
                                xhrDone();
                            }, xhrDone);
                        });
                    }
                });
            });
        };

        /**
         * Send a sign of life and all configuration once per day to Google Analytics
         */
        let trackUserData = () => {
            let manifest = chrome.runtime.getManifest();
            let shareState = "not_set";

            if (shareUserdata === true) {
                shareState = "allowed";
            } else if (shareUserdata === false) {
                shareState = "not_allowed";
            }

            trackEvent({ // sign of life
                category: "extension",
                action: "user",
                label: "share_" + shareState
            }, true);

            trackEvent({ // extension version
                category: "extension",
                action: "version",
                label: manifest.version
            }, true);

            if (shareUserdata === true) {
                // track installation date
                if (data.installationDate) {
                    trackEvent({
                        category: "extension",
                        action: "installationDate",
                        label: new Date(data.installationDate).toISOString().slice(0, 10)
                    });
                }

                // track bookmark amount
                bookmarkApi.getSubTree("0").then((response) => {
                    let bookmarkAmount = 0;
                    let processBookmarks = (bookmarks) => {
                        for (let i = 0; i < bookmarks.length; i++) {
                            let bookmark = bookmarks[i];
                            if (bookmark.url) {
                                bookmarkAmount++
                            } else if (bookmark.children) {
                                processBookmarks(bookmark.children);
                            }
                        }
                    };

                    if (response && response[0] && response[0].children && response[0].children.length > 0) {
                        processBookmarks(response[0].children);
                    }

                    trackEvent({
                        category: "extension",
                        action: "bookmarks",
                        label: "amount",
                        value: bookmarkAmount
                    });
                });

                // track configuration values
                let categories = ["behaviour", "appearance"];

                let proceedConfig = (baseName, obj) => {
                    Object.keys(obj).forEach((attr) => {
                        if (typeof obj[attr] === "object") {
                            proceedConfig(baseName + "_" + attr, obj[attr])
                        } else {
                            if (typeof obj[attr] !== "string") { // parse everything to string
                                obj[attr] = JSON.stringify(obj[attr]);
                            }

                            trackEvent({
                                category: "configuration",
                                action: baseName + "_" + attr,
                                label: obj[attr]
                            });
                        }
                    });
                };

                chrome.storage.sync.get(categories, (obj) => {
                    categories.forEach((category) => {
                        if (typeof obj[category] === "object") {
                            proceedConfig(category, obj[category]);
                        }
                    });
                });
            }
        };

        /**
         * Initialises the data object
         *
         * @returns {Promise}
         */
        let initData = async () => {
            chrome.storage.sync.get(["model", "shareUserdata"], (obj) => {
                data = obj.model || {};
                shareUserdata = typeof obj.shareUserdata === "undefined" ? null : obj.shareUserdata;

                if (typeof data.installationDate === "undefined") { // no date yet -> save a start date in storage
                    data.installationDate = +new Date();
                }

                let today = +new Date().setHours(0, 0, 0, 0);
                if (typeof data.lastTrackDate === "undefined" || data.lastTrackDate !== today) {
                    data.lastTrackDate = today;
                    trackUserData();
                }

                saveModelData();
            });
        };

        /**
         * Initialises the Google Analytics tracking
         *
         * @returns {Promise}
         */
        let initAnalytics = async () => {
            window['GoogleAnalyticsObject'] = 'ga';
            window.ga = window.ga || function () {
                    (window.ga.q = window.ga.q || []).push(arguments)
                };
            window.ga.l = +new Date();
            let script = document.createElement('script');
            script.async = 1;
            script.src = s.ga.url;
            let m = document.getElementsByTagName('script')[0];
            m.parentNode.insertBefore(script, m);

            let manifest = chrome.runtime.getManifest();
            window.ga('create', 'UA-' + (s.ga.trackingCode[manifest.version_name === "Dev" || !('update_url' in manifest) ? "dev" : "live"]), 'auto');
            window.ga('set', 'checkProtocolTask', null);
            window.ga('set', 'transport', 'beacon');
        };

        /**
         * Initialises wrappers for the chrome.bookmarks methods as Promises
         *
         * @returns {Promise}
         */
        let initBookmarkApi = async () => {
            let callback = (key, params) => {
                return new Promise((resolve, reject) => {
                    chrome.bookmarks[key](...params, (result) => {
                        let lastError = chrome.runtime.lastError;
                        if (typeof lastError === "undefined") {
                            resolve(result);
                        } else { // reject with error
                            reject(lastError.message);
                        }
                    });
                });
            };

            ["get", "getSubTree", "removeTree"].forEach((key) => {
                bookmarkApi[key] = (id) => callback(key, ["" + id]);
            });

            ["update", "move"].forEach((key) => {
                bookmarkApi[key] = (id, obj) => callback(key, ["" + id, obj]);
            });

            ["create", "search"].forEach((key) => {
                bookmarkApi[key] = (obj) => callback(key, [obj]);
            });
        };

        /**
         *
         */
        this.run = () => {
            chrome.runtime.setUninstallURL(s.urls.uninstall);

            Promise.all([
                initAnalytics(),
                initBookmarkApi(),
                initData()
            ]).then(() => {
                initEvents();
                initMessageListener();
                initUpdateListener();
            });
        };
    };

    new background(opts).run();
})(jsu);




