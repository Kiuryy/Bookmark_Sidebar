(() => {
    "use strict";

    let shareUserdata = null;
    let data = {};
    let clickCounter = null;
    let xhrList = [];
    let xhrUrls = {
        updateUrls: "https://blockbyte.de/ajax/extensions/updateUrls",
        userdata: "https://blockbyte.de/ajax/extensions/userdata"
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
            initClickCounter(null, () => {
                if (typeof clickCounter.data[bookmark["id"]] === "undefined") {
                    if (typeof clickCounter.data["node_" + bookmark["id"]] === "undefined") {
                        clickCounter.data[bookmark["id"]] = {c: 0}
                    } else { // @deprecated
                        clickCounter.data[bookmark["id"]] = {
                            c: clickCounter.data["node_" + bookmark["id"]]
                        };
                    }
                }

                if (typeof clickCounter.data[bookmark["id"]] !== "object") {
                    clickCounter.data[bookmark["id"]] = {
                        c: clickCounter.data[bookmark["id"]]
                    };
                }

                clickCounter.data[bookmark["id"]].c++;
                clickCounter.data[bookmark["id"]].d = +new Date();
                delete clickCounter.data["node_" + bookmark["id"]]; // @deprecated


                let saveToStorage = (type = "sync") => { // save clickCounter object -> try to save to sync-storage first, if this fails save to local-storage
                    clickCounter.storageType = type;
                    chrome.storage[type].set({
                        clickCounter: clickCounter
                    }, () => {
                        let lastError = chrome.runtime.lastError;

                        if (typeof lastError === "undefined") {
                            if (data.clickCounter) { // @deprecated
                                delete data.clickCounter;
                                saveModelData();
                            }
                        } else if (clickCounter.storageType === "sync" && lastError.message.search("QUOTA_BYTES_PER_ITEM") !== -1) { // sync-storage is full -> save to local
                            saveToStorage("local");
                            chrome.storage.sync.remove(["clickCounter"]);
                        }
                    });
                };

                saveToStorage();
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
        initClickCounter(null, () => {
            sendResponse({
                viewAmounts: clickCounter.data,
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
            xhr.open("POST", xhrUrls.updateUrls, true);
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
        data.lastShareDate = 0;
        saveModelData();
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

    ["Changed", "Created", "Removed"].forEach((eventName) => { // trigger an event to all tabs after a changing/creating/removing a bookmark
        chrome.bookmarks["on" + eventName].addListener(() => {
            refreshAllTabs({type: eventName});
        });
    });

    chrome.runtime.onInstalled.addListener((details) => {
        if (details.reason === 'install') {
            chrome.tabs.create({url: chrome.extension.getURL('html/howto.html')});
        } else if (details.reason === 'update') {
            let newVersion = chrome.runtime.getManifest().version;
            let versionPartsOld = details.previousVersion.split('.');
            let versionPartsNew = newVersion.split('.');

            chrome.storage.local.remove(["languageInfos"]);

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

                    if (typeof obj.appearance === "undefined") {
                        obj.appearance = {};
                    }

                    if (typeof obj.appearance.styles === "undefined") {
                        obj.appearance.styles = {};
                    }

                    if (typeof obj.appearance.styles.bookmarksDirIcon === "undefined" || obj.appearance.styles.bookmarksDirIcon === "dir") {
                        obj.appearance.styles.bookmarksDirIcon = "dir-2";
                    } else if (obj.appearance.styles.bookmarksDirIcon === "dir-alt1") {
                        obj.appearance.styles.bookmarksDirIcon = "dir-1";
                        obj.appearance.styles.bookmarksDirColor = "rgb(240,180,12)";
                    } else if (obj.appearance.styles.bookmarksDirIcon === "dir-alt2") {
                        obj.appearance.styles.bookmarksDirIcon = "dir-1";
                    }

                    delete obj.appearance.addVisual;
                    chrome.storage.sync.set({appearance: obj.appearance});

                    if (obj.shareUserdata && (obj.shareUserdata === "n" || obj.shareUserdata === "y")) {
                        chrome.storage.sync.set({shareUserdata: obj.shareUserdata === "y"});
                    }
                    chrome.storage.sync.remove(["clickCounter", "lastShareDate", "scrollPos", "openStates", "installationDate", "uuid", "entriesLocked", "addVisual", "middleClickActive"]);
                    // END UPGRADE CONFIG FOR v1.7

                    // START UPGRADE CONFIG FOR v1.5
                    if (obj.model) {
                        if (typeof obj.model.shareUserdata !== "undefined" && typeof obj.shareUserdata === "undefined") {
                            let share = obj.model.shareUserdata;
                            if (share === "y") {
                                chrome.storage.sync.set({shareUserdata: true});
                            } else if (share === "n") {
                                chrome.storage.sync.set({shareUserdata: true});
                            } else if (typeof share === "boolean") {
                                chrome.storage.sync.set({shareUserdata: share});
                            }
                        }
                    }
                    // END UPGRADE CONFIG FOR v1.5
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
     * @param {string} type
     * @param {function} callback
     */
    let initClickCounter = (type, callback) => {
        if (!type) {
            type = "sync";
        }

        chrome.storage[type].get(["clickCounter"], (obj) => {
            if (typeof obj.clickCounter === "undefined") { // no data for the given type (sync or local) available
                if (type === "sync") { // try local
                    initClickCounter("local", callback);
                } else { // local is empty too -> no data available
                    clickCounter = {
                        storageType: "sync",
                        data: data.clickCounter || {} // @deprecated data.clickCounter
                    };
                    if (typeof callback === "function") {
                        callback();
                    }
                }
            } else { // data available
                clickCounter = {
                    storageType: type,
                    data: obj.clickCounter.data
                };

                if (typeof callback === "function") {
                    callback();
                }
            }
        });
    };

    /**
     * Initialises the model
     */
    let initModel = () => {
        chrome.storage.sync.get(["model", "shareUserdata"], (obj) => {
            data = obj.model || {};
            shareUserdata = typeof obj.shareUserdata === "undefined" ? null : obj.shareUserdata;

            if (typeof data.uuid === "undefined") { // no uuid yet -> set new one
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
     */
    let handleShareUserdata = () => {
        chrome.storage.sync.get(null, (obj) => {
            if (typeof obj.model !== "undefined" && typeof obj.model.uuid !== "undefined" && (typeof obj.model.lastShareDate === "undefined" || (+new Date() - obj.model.lastShareDate) / 36e5 > 8)) { // uuid is available and last time of sharing is over 8 hours ago
                data.lastShareDate = +new Date();
                saveModelData();

                let sendXhr = (obj) => {
                    let xhr = new XMLHttpRequest();
                    xhr.open("POST", xhrUrls.userdata, true);
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
     *
     */
    (() => {
        initModel();
        handleShareUserdata();
    })();

})();




