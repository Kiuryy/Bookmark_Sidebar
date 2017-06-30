(() => {
    "use strict";

    let shareUserdata = null;
    let data = {};
    let bookmarkObj = {};
    let xhrList = [];
    let bookmarkImportRunning = false;

    let urls = {
        check404: "https://blockbyte.de/extensions",
        updateUrls: "https://blockbyte.de/ajax/extensions/updateUrls",
        uninstall: "https://blockbyte.de/extensions/bs/uninstall",
        onboarding: "https://blockbyte.de/extensions/bs/install"
    };

    let langVarsChache = {};

    let allLanguages = {
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
    };

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
     */
    let openLink = (opts) => {
        increaseViewAmount(opts);

        if (opts.newTab && opts.newTab === true) { // new tab
            let createTab = (idx = null) => {
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    chrome.tabs.create({
                        url: opts.href,
                        active: typeof opts.active === "undefined" ? true : !!(opts.active),
                        index: idx || tabs[0].index + 1,
                        openerTabId: tabs[0].id
                    }, (tab) => {
                        data.openedByExtension = tab.id;
                        saveModelData();
                    });
                });
            };

            if (opts.afterLast && opts.afterLast === true) {
                chrome.tabs.query({}, (tabs) => {
                    createTab(tabs[tabs.length - 1].index + 1);
                });
            } else {
                createTab();
            }
        } else if (opts.incognito && opts.incognito === true) { // incognito window
            chrome.windows.create({url: opts.href, state: "maximized", incognito: true});
        } else { // current tab
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.update(tabs[0].id, {url: opts.href}, (tab) => {
                    data.openedByExtension = tab.id;
                    saveModelData();
                });
            });
        }
    };

    /**
     * Returns the data url of the favicon of the given url
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getFavicon = (opts, sendResponse) => {
        let img = new Image();
        img.onload = function () {
            let canvas = document.createElement("canvas");
            canvas.width = this.width;
            canvas.height = this.height;

            let ctx = canvas.getContext("2d");
            ctx.drawImage(this, 0, 0);

            let dataURL = canvas.toDataURL("image/png");
            sendResponse({img: dataURL});
        };
        img.src = 'chrome://favicon/size/16@2x/' + opts.url;
    };

    /**
     * Returns the view amounts of all bookmarks
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getViewAmounts = (opts, sendResponse) => {
        getClickCounter().then((clickCounter) => {
            sendResponse({
                viewAmounts: clickCounter,
                counterStartDate: data.installationDate
            });
        });
    };

    /**
     * Returns all bookmarks under the given id
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getBookmarks = (opts, sendResponse) => {
        bookmarkObj.getSubTree(opts.id).then((bookmarks) => {
            sendResponse({bookmarks: bookmarks});
        });
    };

    /**
     * Returns all bookmarks matching the given search val
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getBookmarksBySearchVal = (opts, sendResponse) => {
        bookmarkObj.search(opts.searchVal).then((bookmarks) => {
            sendResponse({bookmarks: bookmarks});
        });
    };

    /**
     * Determines whether a bookmark to the given url exists and if so increases the view counter,
     * only if the tab was not previously opened or changed from the extension (these clicks are counted alreay)
     *
     * @param {object} opts
     */
    let addViewAmountByUrl = (opts) => {
        if (typeof data.openedByExtension === "undefined") { // page was not opened by extension -> view was not counted yet
            bookmarkObj.search({url: opts.url}).then((bookmarks) => {
                bookmarks.some((bookmark) => {
                    if (bookmark.url === opts.url) {
                        increaseViewAmount(bookmark);
                        return true;
                    }
                    return false;
                });
            });
        }
        delete data.openedByExtension;

        saveModelData();
    };

    /**
     * Updates the position of the given bookmark
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let moveBookmark = (opts, sendResponse) => {
        let dest = {
            parentId: "" + opts.parentId,
            index: opts.index
        };

        bookmarkObj.move(opts.id, dest).then(() => {
            sendResponse({moved: opts.id});
        });
    };

    /**
     * Updates the given bookmark or directory with the given values (title, url)
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let updateBookmark = (opts, sendResponse) => {
        let values = {
            title: opts.title
        };

        if (opts.url) {
            values.url = opts.url;
        }

        bookmarkObj.update(opts.id, values).then(() => {
            sendResponse({updated: opts.id});
        }).catch((error) => {
            sendResponse({error: error});
        });
    };

    /**
     * Creates a bookmark or directory with the given values (title, url)
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let createBookmark = (opts, sendResponse) => {
        let values = {
            parentId: opts.parentId,
            index: opts.index || 0,
            title: opts.title,
            url: opts.url ? opts.url : null
        };

        bookmarkObj.create(values).then(() => {
            sendResponse({created: opts.id});
        }).catch((error) => {
            sendResponse({error: error});
        });
    };

    /**
     * Removes the given bookmark or directory recursively
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let deleteBookmark = (opts, sendResponse) => {
        bookmarkObj.removeTree(opts.id).then(() => {
            sendResponse({deleted: opts.id});
        });
    };

    /**
     * Determines the real url for the given url via ajax call,
     * if abort parameter is specified, all pending ajax calls will be aborted
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getRealUrl = (opts, sendResponse) => {
        if (opts.abort && opts.abort === true) {
            xhrList.forEach((xhr) => {
                xhr.abort();
            });
        } else {
            let xhr = new XMLHttpRequest();
            xhr.open("POST", urls.updateUrls, true);
            xhr.onload = () => {
                let response = JSON.parse(xhr.responseText);
                sendResponse(response);
            };
            let formData = new FormData();
            formData.append('url', opts.url);
            formData.append('ua', navigator.userAgent);
            formData.append('lang', chrome.i18n.getUILanguage());
            xhr.send(formData);
            xhrList.push(xhr);
        }
    };

    /**
     * Returns the information about the all languages
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getAllLanguages = (opts, sendResponse) => {
        getLanguageInfos().then((infos) => {
            sendResponse({infos: infos});
        });
    };

    /**
     * Returns the language variables for the given language
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getLangVars = (opts, sendResponse) => {
        if (opts.lang) {
            let cacheVars = typeof opts.cache === "undefined" || opts.cache === true;

            if (langVarsChache[opts.lang] && cacheVars) { // take langvars from cache
                sendResponse({langVars: langVarsChache[opts.lang]});
            } else { // load langvars with xhr request
                let sendXhr = (obj) => {
                    let langVars = obj.langVars;

                    let xhr = new XMLHttpRequest();
                    xhr.open("GET", chrome.extension.getURL("_locales/" + opts.lang + "/messages.json"), true);
                    xhr.onload = () => {
                        let result = JSON.parse(xhr.responseText);
                        Object.assign(langVars, result); // override all default variables with the one from the language file

                        if (cacheVars) {
                            langVarsChache[opts.lang] = langVars;
                        }
                        sendResponse({langVars: langVars});
                    };
                    xhr.send();
                };

                if (opts.defaultLang && opts.defaultLang !== opts.lang) { // load default language variables first and replace them afterwards with the language specific ones
                    getLangVars({lang: opts.defaultLang, cache: false}, sendXhr)
                } else {
                    sendXhr({langVars: {}});
                }
            }
        }
    };

    /**
     * Returns whether the ShareUserdata-Mask should be shown or not
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let shareUserdataMask = (opts, sendResponse) => {
        let showMask = false;
        if (shareUserdata === null && (+new Date() - data.installationDate) / 86400000 > 5) { // show mask after 5 days using the extension
            showMask = true;
        }
        sendResponse({showMask: showMask});
    };

    /**
     * Returns whether the onboarding should be shown or not
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let onboarding = (opts, sendResponse) => {
        sendResponse({
            showOnboarding: typeof data.inited === "undefined",
            defaultPage: urls.onboarding
        });
        data.inited = true;
        saveModelData();
    };

    /**
     * Checks whether the website is available
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let checkWebsiteStatus = (opts, sendResponse) => {
        let xhr = new XMLHttpRequest();
        ["load", "error", "timeout"].forEach((eventName) => {
            xhr.addEventListener(eventName, () => {
                sendResponse({
                    status: (eventName !== "load" || xhr.status >= 400 ? "un" : "") + "available"
                });
            });
        });
        xhr.timeout = 5000;
        xhr.open("HEAD", urls.check404, true);
        xhr.send();
    };

    /**
     * Sends a message to all tabs, so they are reloading the sidebar
     *
     * @param {object} opts
     */
    let refreshAllTabs = (opts) => {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                chrome.tabs.sendMessage(tab.id, {
                    action: "refresh",
                    scrollTop: opts.scrollTop || false,
                    type: opts.type
                });
            });
        });
    };

    /**
     * Updates the shareUserdata-Flag
     *
     * @param {object} opts
     */
    let updateShareUserdataFlag = (opts) => {
        chrome.storage.sync.set({
            shareUserdata: opts.share
        });
        shareUserdata = opts.share;
    };

    /**
     * Tracks an event in Google Analytics with the given values,
     * only do if user allows userdata sharing or if the parameter is specified
     *
     * @param {object} opts
     * @param {boolean} ignoreShareUserdata
     */
    let trackEvent = (opts, ignoreShareUserdata = false) => {
        if (window.ga && (shareUserdata === true || ignoreShareUserdata === true)) {
            window.ga('send', {
                hitType: 'event',
                eventCategory: opts.category,
                eventAction: opts.action,
                eventLabel: opts.label,
                eventValue: opts.value || 1
            });
        }
    };

    /**
     * Tracks an event in Google Analytics with the given values,
     * only do if user allows userdata sharing or if the parameter is specified
     *
     * @param {object} opts
     * @param {boolean} ignoreShareUserdata
     */
    let trackPageView = (opts, ignoreShareUserdata = false) => {
        if (window.ga && (shareUserdata === true || ignoreShareUserdata === true)) {
            window.ga('send', 'pageview', opts.page);
        }
    };

    /**
     * Message listener
     */
    let mapping = {
        realUrl: getRealUrl,
        addViewAmount: addViewAmountByUrl,
        bookmarks: getBookmarks,
        searchBookmarks: getBookmarksBySearchVal,
        moveBookmark: moveBookmark,
        updateBookmark: updateBookmark,
        createBookmark: createBookmark,
        deleteBookmark: deleteBookmark,
        refreshAllTabs: refreshAllTabs,
        shareUserdata: updateShareUserdataFlag,
        onboarding: onboarding,
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
            mapping[message.type](message, sendResponse);
        }

        return true; // important to allow asynchronous responses
    });

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

    chrome.runtime.setUninstallURL(urls.uninstall);

    chrome.runtime.onInstalled.addListener((details) => {
        if (details.reason === 'install') {
            chrome.tabs.create({url: chrome.extension.getURL('html/intro.html')});
        } else if (details.reason === 'update') {
            let newVersion = chrome.runtime.getManifest().version;
            let versionPartsOld = details.previousVersion.split('.');
            let versionPartsNew = newVersion.split('.');

            chrome.storage.local.remove(["languageInfos"]);

            trackEvent({
                category: "extension",
                action: "update",
                label: details.previousVersion + " -> " + newVersion
            }, true);

            if (versionPartsOld[0] !== versionPartsNew[0] || versionPartsOld[1] !== versionPartsNew[1]) {
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

                    // START UPGRADE // v1.9
                    delete obj.behaviour.scrollSensitivity;

                    if (typeof obj.appearance.styles === "undefined") {
                        obj.appearance.styles = {};
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

                    if (typeof obj.appearance.styles.bookmarksDirIcon !== "undefined" && obj.appearance.styles.bookmarksDirIcon === "dir") {
                        obj.appearance.styles.bookmarksDirIcon = "dir-1";
                    }
                    // END UPGRADE // v1.7

                    chrome.storage.sync.set({behaviour: obj.behaviour});
                    chrome.storage.sync.set({appearance: obj.appearance});
                });
            }
        }
    });

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
                    let total = Object.keys(allLanguages).length;
                    let loaded = 0;
                    let infos = {};

                    Object.keys(allLanguages).forEach((lang) => {
                        infos[lang] = {
                            name: lang,
                            label: allLanguages[lang],
                            available: false
                        };

                        let xhr = new XMLHttpRequest();
                        ["load", "error"].forEach((eventName) => {
                            xhr.addEventListener(eventName, () => {
                                loaded++;
                                if (eventName === "load") {
                                    infos[lang].available = true;
                                }

                                if (loaded === total) {
                                    chrome.storage.local.set({
                                        languageInfos: {infos: infos, updated: +new Date()}
                                    });

                                    resolve(infos);
                                }
                            });
                        });
                        xhr.open("HEAD", chrome.extension.getURL("_locales/" + lang + "/messages.json"), true);
                        xhr.send();
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
                setTimeout(() => {
                    trackEvent({
                        category: "extension",
                        action: "installationDate",
                        label: new Date(data.installationDate).toISOString().slice(0, 10)
                    });
                }, 1200);
            }

            // track bookmark amount
            bookmarkObj.getSubTree("0").then((response) => {
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
            let i = 1;

            let proceedConfig = (baseName, obj) => {
                Object.keys(obj).forEach((attr) => {
                    if (typeof obj[attr] === "object") {
                        proceedConfig(baseName + "_" + attr, obj[attr])
                    } else {
                        i++;

                        if (typeof obj[attr] !== "string") {
                            obj[attr] = JSON.stringify(obj[attr]);
                        }

                        setTimeout(() => {
                            trackEvent({
                                category: "configuration",
                                action: baseName + "_" + attr,
                                label: obj[attr]
                            });
                        }, i * 1200);
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
     */
    let initAnalytics = async () => {
        window['GoogleAnalyticsObject'] = 'ga';
        window.ga = window.ga || function () {
                (window.ga.q = window.ga.q || []).push(arguments)
            };
        window.ga.l = +new Date();
        let script = document.createElement('script');
        script.async = 1;
        script.src = 'https://www.google-analytics.com/analytics.js';
        let m = document.getElementsByTagName('script')[0];
        m.parentNode.insertBefore(script, m);

        let manifest = chrome.runtime.getManifest();
        window.ga('create', 'UA-' + (manifest.version_name === "Dev" || !('update_url' in manifest) ? '100595538-3' : '100595538-2'), 'auto');
        window.ga('set', 'checkProtocolTask', null);
        window.ga('set', 'transport', 'beacon');
    };

    /**
     * Initialises the bookmark object as wrapper for the chrome.bookmarks methods as Promises
     */
    let initBookmarkObj = async () => {
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
            bookmarkObj[key] = (id) => {
                return callback(key, ["" + id]);
            };
        });

        ["update", "move"].forEach((key) => {
            bookmarkObj[key] = (id, obj) => {
                return callback(key, ["" + id, obj]);
            };
        });

        ["create", "search"].forEach((key) => {
            bookmarkObj[key] = (obj) => {
                return callback(key, [obj]);
            };
        });
    };

    /**
     *
     */
    (() => {
        initAnalytics();
        initBookmarkObj();
        initData();
    })();

})();




