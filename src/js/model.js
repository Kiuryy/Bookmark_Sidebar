(() => {
    "use strict";

    let shareUserdata = null;
    let data = {};
    let xhrList = [];
    let xhrUrls = {
        updateUrls: "https://blockbyte.de/ajax/extensions/updateUrls",
        userdata: "https://blockbyte.de/ajax/extensions/userdata"
    };

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
        th: "Thai",
        tr: "Turkish",
        uk: "Ukrainian",
        vi: "Vietnamese"
    };

    let languageInfos = {};

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
            if (typeof data.clickCounter[bookmark["id"]] === "undefined") {
                if (typeof data.clickCounter["node_" + bookmark["id"]] === "undefined") {
                    data.clickCounter[bookmark["id"]] = 0;
                } else { // @deprecated
                    data.clickCounter[bookmark["id"]] = data.clickCounter["node_" + bookmark["id"]];
                }
            }

            data.clickCounter[bookmark["id"]]++;
            delete data.clickCounter["node_" + bookmark["id"]]; // @deprecated
            saveModelData();
        }
    };

    /**
     * Opens the given url in the current tab or in a new tab
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let openLink = (opts, sendResponse) => {
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
        sendResponse({
            viewAmounts: data.clickCounter,
            counterStartDate: data.installationDate
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
     * @param {function} sendResponse
     */
    let addViewAmountByUrl = (opts, sendResponse) => {
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
     * Returns the information about the languages
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getLanguageInfos = (opts, sendResponse) => {
        sendResponse({infos: languageInfos});
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
     * Updates the shareUserdata-Flag
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let updateShareUserdataFlag = (opts, sendResponse) => {
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
        shareUserdata: updateShareUserdataFlag,
        shareUserdataMask: shareUserdataMask,
        languageInfos: getLanguageInfos,
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

    chrome.runtime.onInstalled.addListener((details) => {
        if (details.reason === 'install') {
            chrome.tabs.create({url: chrome.extension.getURL('html/howto.html')});
        } else if (details.reason === 'update') {
            let newVersion = chrome.runtime.getManifest().version;
            let versionPartsOld = details.previousVersion.split('.');
            let versionPartsNew = newVersion.split('.');

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

                    if (obj.appearance) {
                        if (typeof obj.appearance.style === "undefined") {
                            obj.appearance.style = {};
                        }

                        if (typeof obj.appearance.style.bookmarksDirIcon === "undefined" || obj.appearance.style.bookmarksDirIcon === "dir") {
                            obj.appearance.style.bookmarksDirIcon = "dir-2";
                        } else if (obj.appearance.style.bookmarksDirIcon === "dir-alt1") {
                            obj.appearance.style.bookmarksDirIcon = "dir-1";
                            obj.appearance.style.bookmarksDirColor = "rgb(240,180,12)";
                        } else if (obj.appearance.style.bookmarksDirIcon === "dir-alt2") {
                            obj.appearance.style.bookmarksDirIcon = "dir-1";
                        }

                        chrome.storage.sync.set({appearance: obj.appearance});
                    }

                    if (obj.shareUserdata && (obj.shareUserdata === "n" || obj.shareUserdata === "y")) {
                        chrome.storage.sync.set({shareUserdata: obj.shareUserdata === "y"});
                    }
                    chrome.storage.sync.remove(["clickCounter", "lastShareDate", "scrollPos", "openStates", "installationDate", "uuid", "addVisual", "middleClickActive"]);
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
                        return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                    });
                })();
            }

            if (typeof data.clickCounter === "undefined") {
                data.clickCounter = {};
            }

            if (typeof data.installationDate === "undefined") { // no date yet -> save a start date in storage
                data.installationDate = +new Date();
            }

            saveModelData();
        });
    };

    /**
     * Initialises the language infos
     */
    let initLanguages = () => {
        Object.keys(allLanguages).forEach((lang) => {
            languageInfos[lang] = {
                name: lang,
                label: allLanguages[lang],
                available: false
            };

            let xhr = new XMLHttpRequest();
            xhr.open("HEAD", chrome.extension.getURL("_locales/" + lang + "/messages.json"), true);
            xhr.onload = () => {
                languageInfos[lang].available = true;
            };
            xhr.send();
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
        initLanguages();
        handleShareUserdata();
    })();

})();




