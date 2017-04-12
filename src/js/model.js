(() => {
    "use strict";

    let data = {};
    let xhrList = [];
    let xhrUrls = {
        updateUrls: "https://moonware.de/ajax/extensions/updateUrls",
        userdata: "https://moonware.de/ajax/extensions/userdata"
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
     * Returns the amount of clicks on the given bookmark or directory
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getViewAmount = (opts, sendResponse) => {
        sendResponse({
            views: data.clickCounter[opts.id] || data.clickCounter["node_" + opts.id] || 0, // @deprecated clickCounter["node_123"] is n clickCounter["123"]
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
            sendResponse({updated: opts.id});
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
     * Updates the shareUserdata-Flag
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let updateShareUserdataFlag = (opts, sendResponse) => {
        chrome.storage.sync.set({
            shareUserdata: opts.share
        });
        data.lastShareDate = 0;
        saveModelData();
    };

    /**
     * Determines the amount of child elements and the amount of clicks on all the children recursively
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getDirInfos = (opts, sendResponse) => {
        bookmarkObj.getSubTree(opts.id, (bookmarks) => {
            let clickAmount = 0;
            let childrenAmount = {
                bookmarks: 0,
                dirs: 0,
                total: 0
            };

            let recursiveCallback = (obj) => {
                obj.forEach((v) => {
                    childrenAmount.total++;

                    if (v.children) {
                        childrenAmount.dirs++;
                    } else {
                        childrenAmount.bookmarks++;
                        if (data.clickCounter[v.id]) {
                            clickAmount += data.clickCounter[v.id];
                        } else if (data.clickCounter["node_" + v.id]) { // @deprecated
                            clickAmount += data.clickCounter["node_" + v.id];
                        }
                    }

                    if (v.children && v.children.length > 0) {
                        recursiveCallback(v.children);
                    }
                });
            };

            if (bookmarks[0] && bookmarks[0].children && bookmarks[0].children.length > 0) {
                recursiveCallback(bookmarks[0].children);
            }

            sendResponse({
                childrenAmount: childrenAmount,
                clickAmount: clickAmount,
                counterStartDate: data.installationDate
            });
        });
    };


    /**
     * Message listener
     */
    let mapping = {
        realUrl: getRealUrl,
        addViewAmount: addViewAmountByUrl,
        dirInfos: getDirInfos,
        bookmarks: getBookmarks,
        searchBookmarks: getBookmarksBySearchVal,
        moveBookmark: moveBookmark,
        updateBookmark: updateBookmark,
        deleteBookmark: deleteBookmark,
        shareUserdata: updateShareUserdataFlag,
        favicon: getFavicon,
        openLink: openLink,
        viewAmount: getViewAmount
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

                chrome.storage.sync.get(null, (obj) => {  // UPGRADE STORAGE STRUCTURE
                    if (obj["appearance"]) {
                        // START UPGRADE STORAGE STRUCTURE FOR v1.5
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
                        // END UPGRADE STORAGE STRUCTURE FOR v1.5

                        chrome.storage.sync.remove(["clickCounter", "lastShareDate", "scrollPos", "openStates", "installationDate", "uuid", "addVisual", "middleClickActive"]);

                        return false; // don't do it twice
                    }

                    // START UPGRADE STORAGE STRUCTURE FOR v1.4
                    let newConfig = {
                        model: {},
                        utility: {},
                        behaviour: {},
                        appearance: {}
                    };

                    if (typeof obj.openAction === "undefined") {
                        obj.openAction = "contextmenu";
                    }

                    Object.keys(obj).forEach((key) => {
                        let val = obj[key];

                        if (val === "y") {
                            val = true;
                        }
                        if (val === "n") {
                            val = false;
                        }
                        if (/^\{.*\}$/.test(val)) {
                            val = JSON.parse(val);
                        }

                        if (key === "middleClickActive" && typeof obj["newTab"] === "undefined") {
                            key = "newTab";
                            val = val === true ? "foreground" : "background";
                        }

                        if (key === "pxTolerance" && ( (typeof val === "string" && val.search(/^\d+$/) === 0) || (typeof val === "number"))) {
                            val = {
                                windowed: 20,
                                maximized: val
                            };
                        }

                        switch (key) {
                            case "openStates":
                            case "searchValue":
                            case "scrollPos":
                            case "entriesLocked": {
                                newConfig.utility[key] = val;
                                break;
                            }
                            case "openedByExtension":
                            case "installationDate":
                            case "clickCounter":
                            case "lastShareDate":
                            case "uuid": {
                                newConfig.model[key] = val;
                                break;
                            }
                            case "shareUserdata": {
                                newConfig[key] = val;
                                break;
                            }
                            case "addVisual": {
                                newConfig.appearance[key] = val;
                                break;
                            }
                            case "utility":
                            case "behaviour":
                            case "appearance": {
                                break;
                            }
                            default: {
                                newConfig.behaviour[key] = val;
                                break;
                            }
                        }

                        if (key !== "utility" && key !== "behaviour" && key !== "appearance") {
                            chrome.storage.sync.remove([key]);
                        }
                    });

                    chrome.storage.sync.set(newConfig, () => {
                        initModel();
                    });
                    // END UPGRADE STORAGE STRUCTURE FOR v1.4
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
            } else if (typeof obj.shareUserdata === "undefined" && (+new Date() - data.installationDate) / 86400000 > 5) { // show mask after 5 days using the extension
                setTimeout(() => { // show mask in the active tab 60s after the model was loaded (increases the possibility that there is an active tab with the sidebar loaded)
                    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                        chrome.tabs.sendMessage(tabs[0].id, {action: "showShareUserdataMask"});
                    });
                }, 1000 * 60);
            }

            saveModelData();
        });
    };


    /**
     * Shares the userdata if user allowed so
     */
    let shareUserdata = () => {
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
        shareUserdata();
    })();

})();




