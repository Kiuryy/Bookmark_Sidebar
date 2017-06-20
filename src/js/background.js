(() => {
    "use strict";

    let shareUserdata = null;
    let data = {};
    let clickCounter = null;
    let xhrList = [];
    let bookmarkImportRunning = false;
    let urls = {
        updateUrls: "https://blockbyte.de/ajax/extensions/updateUrls",
        userdata: "https://blockbyte.de/ajax/extensions/userdata",
        uninstall: "https://blockbyte.de/extensions/bs/uninstall"
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

    let bookmarkObj = {
        get: (id, callback) => {
            chrome.bookmarks.get("" + id, callback);
        },
        getSubTree: (id, callback) => {
            chrome.bookmarks.getSubTree("" + id, callback);
        },
        removeTree: (id, callback) => {
            chrome.bookmarks.removeTree("" + id, callback);
        },
        update: (id, obj, callback) => {
            chrome.bookmarks.update("" + id, obj, callback);
        },
        create: (obj, callback) => {
            chrome.bookmarks.create(obj, callback);
        },
        move: (id, obj, callback) => {
            chrome.bookmarks.move("" + id, obj, callback);
        },
        search: (obj, callback) => {
            chrome.bookmarks.search(obj, callback);
        }
    };


    /**
     * Increases the Click Counter of the given bookmark
     *
     * @param {object} bookmark
     */
    let increaseViewAmount = (bookmark) => {
        if (bookmark["id"]) {
            initClickCounter(() => {
                if (typeof clickCounter[bookmark["id"]] === "undefined") {
                    if (typeof clickCounter["node_" + bookmark["id"]] === "undefined") {
                        clickCounter[bookmark["id"]] = {c: 0}
                    } else { // @deprecated
                        clickCounter[bookmark["id"]] = {
                            c: clickCounter["node_" + bookmark["id"]]
                        };
                    }
                }

                if (typeof clickCounter[bookmark["id"]] !== "object") {
                    clickCounter[bookmark["id"]] = {
                        c: clickCounter[bookmark["id"]]
                    };
                }

                clickCounter[bookmark["id"]].c++;
                clickCounter[bookmark["id"]].d = +new Date();
                delete clickCounter["node_" + bookmark["id"]]; // @deprecated

                chrome.storage.local.set({
                    clickCounter: clickCounter
                }, () => { // @deprecated
                    let lastError = chrome.runtime.lastError;

                    if (typeof lastError === "undefined") {
                        if (data.clickCounter) {
                            delete data.clickCounter;
                            saveModelData();
                        }

                        chrome.storage.sync.remove(["clickCounter"]);
                    }
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
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.create({
                    url: opts.href,
                    active: typeof opts.active === "undefined" ? true : !!(opts.active),
                    index: tabs[0].index + 1,
                    openerTabId: tabs[0].id
                }, (tab) => {
                    data.openedByExtension = tab.id;
                    saveModelData();
                });
            });
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
        initClickCounter(() => {
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
        bookmarkObj.getSubTree(opts.id, (bookmarks) => {
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
        bookmarkObj.search(opts.searchVal, (bookmarks) => {
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
            bookmarkObj.search({url: opts.url}, (bookmarks) => {
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

        bookmarkObj.move(opts.id, dest, () => {
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

        bookmarkObj.update(opts.id, values, () => {
            let lastError = chrome.runtime.lastError;
            if (typeof lastError === "undefined") {
                sendResponse({updated: opts.id});
            } else {
                sendResponse({error: lastError.message});
            }
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

        bookmarkObj.create(values, () => {
            let lastError = chrome.runtime.lastError;
            if (typeof lastError === "undefined") {
                sendResponse({created: opts.id});
            } else {
                sendResponse({error: lastError.message});
            }
        });
    };

    /**
     * Removes the given bookmark or directory recursively
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let deleteBookmark = (opts, sendResponse) => {
        bookmarkObj.removeTree(opts.id, () => {
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
        getLanguageInfos((infos) => {
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
        data.lastShareDate = 0; // @deprecated
        saveModelData();
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
        shareUserdataMask: shareUserdataMask,
        languageInfos: getAllLanguages,
        langvars: getLangVars,
        favicon: getFavicon,
        openLink: openLink,
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
            chrome.tabs.create({url: chrome.extension.getURL('html/howto.html')});
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
                        saveModelData(() => {
                            chrome.tabs.create({url: chrome.extension.getURL('html/changelog.html')});
                        });
                    }
                });

                chrome.storage.sync.get(null, (obj) => {  // upgrade configuration
                    // START UPGRADE CONFIG FOR v1.9
                    if (typeof obj.behaviour !== "undefined" && typeof obj.behaviour.hideEmptyDirs !== "undefined") {
                        delete obj.behaviour.hideEmptyDirs;
                        chrome.storage.sync.set({behaviour: obj.behaviour});
                    }
                    // END UPGRADE CONFIG FOR v1.9

                    // START UPGRADE CONFIG FOR v1.8
                    if (typeof obj.appearance === "undefined") {
                        obj.appearance = {};
                    }

                    if (typeof obj.appearance.styles === "undefined") {
                        obj.appearance.styles = {};
                    }

                    if (typeof obj.appearance.styles.colorScheme === "undefined") {
                        obj.appearance.styles.colorScheme = "rgb(0,137,123)";
                    }

                    if (typeof obj.behaviour === "undefined") {
                        obj.behaviour = {};
                    }

                    if (typeof obj.behaviour.initialOpenOnNewTab === "undefined") {
                        obj.behaviour.initialOpenOnNewTab = chrome.i18n.getUILanguage() == "de";
                        chrome.storage.sync.set({behaviour: obj.behaviour});
                    }
                    // END UPGRADE CONFIG FOR v1.8

                    // START UPGRADE CONFIG FOR v1.7
                    if (obj.behaviour) {
                        if (typeof obj.behaviour.rememberState === "undefined" && typeof obj.behaviour.rememberScroll !== "undefined") {
                            obj.behaviour.rememberState = obj.behaviour.rememberScroll === false ? "openStates" : "all";
                        }

                        delete obj.behaviour.rememberScroll;
                        delete obj.behaviour.model;
                        delete obj.behaviour.clickCounter;
                        delete obj.behaviour.clickCounterStartDate;

                        chrome.storage.sync.set({behaviour: obj.behaviour});
                    }

                    if (newVersion.search("1.7.") === 0) {
                        if (typeof obj.appearance.styles.bookmarksDirIcon === "undefined" || obj.appearance.styles.bookmarksDirIcon === "dir") {
                            obj.appearance.styles.bookmarksDirIcon = "dir-2";
                        } else if (obj.appearance.styles.bookmarksDirIcon === "dir-alt1") {
                            obj.appearance.styles.bookmarksDirIcon = "dir-1";
                            obj.appearance.styles.bookmarksDirColor = "rgb(240,180,12)";
                        } else if (obj.appearance.styles.bookmarksDirIcon === "dir-alt2") {
                            obj.appearance.styles.bookmarksDirIcon = "dir-1";
                        }
                    }

                    delete obj.appearance.addVisual;

                    if (obj.shareUserdata && (obj.shareUserdata === "n" || obj.shareUserdata === "y")) {
                        chrome.storage.sync.set({shareUserdata: obj.shareUserdata === "y"});
                    }
                    chrome.storage.sync.remove(["lastShareDate", "scrollPos", "openStates", "installationDate", "uuid", "entriesLocked", "addVisual", "middleClickActive"]);
                    // END UPGRADE CONFIG FOR v1.7

                    // SAVE APPEARANCE SETTINGS FOR v1.7 AND v1.8
                    chrome.storage.sync.set({appearance: obj.appearance});
                });
            }
        }
    });

    /**
     * Saves the current data-object in the chrome storage
     *
     * @param {function} callback
     */
    let saveModelData = (callback) => {
        if (Object.getOwnPropertyNames(data).length > 0) {
            chrome.storage.sync.set({
                model: data
            }, () => {
                if (typeof callback === "function") {
                    callback();
                }
            });
        }
    };

    /**
     * Initialises the infos about the views of the bookmarks
     *
     * @param {function} callback
     */
    let initClickCounter = (callback) => {
        chrome.storage.local.get(["clickCounter"], (obj) => {
            clickCounter = {};

            if (typeof obj.clickCounter === "undefined") { // @deprecated
                chrome.storage.sync.get(["clickCounter"], (obj2) => {
                    if (typeof obj2.clickCounter !== "undefined") {
                        clickCounter = obj2.clickCounter;
                    } else if (data.clickCounter) {
                        clickCounter = data.clickCounter;
                    }

                    if (clickCounter.data) {
                        clickCounter = clickCounter.data;
                    }

                    if (typeof callback === "function") {
                        callback();
                    }
                });
            } else if (typeof obj.clickCounter !== "undefined") { // data available
                clickCounter = obj.clickCounter;

                if (clickCounter.data) { // @deprecated
                    clickCounter = clickCounter.data;
                }

                if (typeof callback === "function") {
                    callback();
                }
            }
        });
    };

    /**
     * Initialises the model
     */
    let initData = () => {
        chrome.storage.sync.get(["model", "shareUserdata"], (obj) => {
            data = obj.model || {};
            shareUserdata = typeof obj.shareUserdata === "undefined" ? null : obj.shareUserdata;

            if (typeof data.uuid === "undefined") { // no uuid yet -> set new one @deprecated
                data.uuid = (() => {
                    let d = +new Date();
                    if (window.performance && typeof window.performance.now === "function") {
                        d += window.performance.now(); //use high-precision timer if available
                    }
                    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                        let r = (d + Math.random() * 16) % 16 | 0;
                        d = Math.floor(d / 16);
                        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                    });
                })();
            }

            if (typeof data.installationDate === "undefined") { // no date yet -> save a start date in storage
                data.installationDate = +new Date();
            }

            let today = +new Date().setHours(0, 0, 0, 0);
            if (typeof data.lastTrackDate === "undefined" || data.lastTrackDate !== today) {
                data.lastTrackDate = today;
                trackUserData();
            }

            initClickCounter();
            saveModelData();
        });
    };

    /**
     * Returns information about all languages (e.g. if they are available in the extension)
     */
    let getLanguageInfos = (callback) => {
        chrome.storage.local.get(["languageInfos"], (obj) => {
            if (obj && obj.languageInfos && (+new Date() - obj.languageInfos.updated) / 36e5 < 8) {
                if (typeof callback === "function") {
                    callback(obj.languageInfos.infos);
                }
            } else {
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

                                if (typeof callback === "function") {
                                    callback(infos);
                                }
                            }
                        });
                    });
                    xhr.open("HEAD", chrome.extension.getURL("_locales/" + lang + "/messages.json"), true);
                    xhr.send();
                });
            }
        });
    };


    /**
     * Shares the userdata if the user allowed to
     *
     * @deprecated trackUserData() is the replacement using Google Analytics
     */
    let handleShareUserdata = () => {
        chrome.storage.sync.get(null, (obj) => {
            if (typeof obj.model !== "undefined" && typeof obj.model.uuid !== "undefined" && (typeof obj.model.lastShareDate === "undefined" || (+new Date() - obj.model.lastShareDate) / 36e5 > 8)) { // uuid is available and last time of sharing is over 8 hours ago
                data.lastShareDate = +new Date();
                saveModelData();

                let sendXhr = (obj) => {
                    let xhr = new XMLHttpRequest();
                    xhr.open("POST", urls.userdata, true);
                    let formData = new FormData();
                    formData.append('data', JSON.stringify(obj));
                    xhr.send(formData);
                };

                let manifest = chrome.runtime.getManifest();
                obj.uuid = obj.model.uuid;

                if (manifest.version_name === "Dev" || !('update_url' in manifest)) {
                    obj.uuid = "Dev";
                }

                obj.extension = {
                    name: manifest.name,
                    version: manifest.version
                };

                if (typeof obj.shareUserdata !== "undefined" && obj.shareUserdata === true) { // share userdata
                    bookmarkObj.getSubTree("0", (response) => {
                        obj.bookmarkAmount = 0;
                        let processBookmarks = (bookmarks) => {
                            for (let i = 0; i < bookmarks.length; i++) {
                                let bookmark = bookmarks[i];
                                if (bookmark.url) {
                                    obj.bookmarkAmount++
                                } else if (bookmark.children) {
                                    processBookmarks(bookmark.children);
                                }
                            }
                        };

                        if (response && response[0] && response[0].children && response[0].children.length > 0) {
                            processBookmarks(response[0].children);
                        }

                        obj.ua = navigator.userAgent;
                        obj.lang = chrome.i18n.getUILanguage();
                        obj.installationDate = obj.model.installationDate;

                        delete obj.utility;
                        delete obj.model;
                        delete obj.clickCounter;

                        sendXhr(obj);
                    });
                } else { // do not share userdata -> only share extension infos
                    sendXhr({
                        uuid: obj.uuid,
                        extension: obj.extension,
                        shareUserdata: typeof obj.shareUserdata === "undefined" ? "undefined" : obj.shareUserdata
                    });
                }
            }
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
            bookmarkObj.getSubTree("0", (response) => {
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
            let i = 0;

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
                        }, i * 1000);
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
     * Initialises the Google Analytics tracking
     */
    let initAnalytics = () => {
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
     *
     */
    (() => {
        initAnalytics();
        initData();
        handleShareUserdata();
    })();

})();




