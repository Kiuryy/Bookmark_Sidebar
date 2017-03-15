(() => {
    "use strict";

    let clickCounter = {};
    let installationDate = +new Date();
    let xhrList = [];
    let xhrUrls = {
        updateUrls: "https://moonware.de/ajax/extensions/updateUrls",
        userdata: "https://moonware.de/ajax/extensions/userdata"
    };

    let bookmarkObj = {
        getSubTree: (id, callback) => {
            chrome.bookmarks.getSubTree(id, callback);
        },
        removeTree: (id, callback) => {
            chrome.bookmarks.removeTree(id, callback);
        },
        search: (obj, callback) => {
            chrome.bookmarks.search(obj, callback);
        },
        update: (id, obj, callback) => {
            chrome.bookmarks.update(id, obj, callback);
        },
        move: (id, obj, callback) => {
            chrome.bookmarks.move(id, obj, callback);
        }
    };


    /**
     * Increases the Click Counter of the given bookmark
     *
     * @param {object} bookmark
     */
    let increaseViewAmount = (bookmark) => {
        if (bookmark["id"]) {
            if (!clickCounter["node_" + bookmark["id"]]) {
                clickCounter["node_" + bookmark["id"]] = 0;
            }

            clickCounter["node_" + bookmark["id"]]++;

            chrome.storage.sync.set({
                clickCounter: JSON.stringify(clickCounter)
            });
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
                    chrome.storage.sync.set({
                        openedByExtension: tab.id
                    });
                });
            });
        } else { // current tab
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.update(tabs[0].id, {url: opts.href}, (tab) => {
                    chrome.storage.sync.set({
                        openedByExtension: tab.id
                    });
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
            views: clickCounter["node_" + opts.id] || 0,
            counterStartDate: installationDate
        });
    };

    /**
     * Returns all bookmarks under the given id
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getBookmarks = (opts, sendResponse) => {
        bookmarkObj.getSubTree("" + opts.id, (bookmarks) => {
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
        chrome.storage.sync.get("openedByExtension", (val) => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (typeof val.openedByExtension === "undefined") { // page was not opened by extension -> view was not counted yet
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
                chrome.storage.sync.remove("openedByExtension");
            });
        });
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
            let data = new FormData();
            data.append('url', opts.url);
            data.append('ua', navigator.userAgent);
            data.append('lang', chrome.i18n.getUILanguage());
            xhr.send(data);
            xhrList.push(xhr);
        }
    };

    /**
     * Determines the amount of child elements and the amount of clicks on all the children recursively
     *
     * @param {object} opts
     * @param {function} sendResponse
     */
    let getDirInfos = (opts, sendResponse) => {
        bookmarkObj.getSubTree("" + opts.id, (bookmarks) => {
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
                        if (clickCounter["node_" + v.id]) {
                            clickAmount += clickCounter["node_" + v.id];
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
                counterStartDate: installationDate
            });
        });
    };


    /**
     * Message listener
     */
    let mapping = {
        realUrl: getRealUrl,
        addViewAmount: addViewAmountByUrl,
        bookmarks: getBookmarks,
        dirInfos: getDirInfos,
        moveBookmark: moveBookmark,
        updateBookmark: updateBookmark,
        deleteBookmark: deleteBookmark,
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


    /**
     * Initialises the model
     */
    let initModel = () => {
        chrome.storage.sync.get(["clickCounter", "uuid", "installationDate", "clickCounterStartDate"], (obj) => {
            if (typeof obj.uuid === "undefined") { // no uuid yet -> set new one
                chrome.storage.sync.set({
                    uuid: (() => {
                        let d = +new Date();
                        if (window.performance && typeof window.performance.now === "function") {
                            d += window.performance.now(); //use high-precision timer if available
                        }
                        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                            let r = (d + Math.random() * 16) % 16 | 0;
                            d = Math.floor(d / 16);
                            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
                        });
                    })()
                });
            }

            if (typeof obj.clickCounter !== "undefined") {
                clickCounter = JSON.parse(obj.clickCounter);
            }

            if (typeof obj.installationDate === "undefined") { // no date yet -> save a start date in storage
                if (typeof obj.clickCounterStartDate !== "undefined") { // backward compatibility
                    installationDate = obj.clickCounterStartDate;
                } else {
                    installationDate = +new Date();
                }
                chrome.storage.sync.set({
                    installationDate: installationDate
                });
            } else {
                installationDate = obj.installationDate;
            }
        });
    };


    /**
     * Shares the userdata if user allowed so
     */
    let shareUserdata = () => {
        chrome.storage.sync.get(null, (obj) => {
            if (typeof obj.uuid !== "undefined" && (typeof obj.lastShareDate === "undefined" || (+new Date() - obj.lastShareDate) / 86400000 > 1)) { // uuid is available and last time of sharing is over 1 day ago
                chrome.storage.sync.set({
                    lastShareDate: +new Date()
                });

                let sendXhr = (obj) => {
                    let xhr = new XMLHttpRequest();
                    xhr.open("POST", xhrUrls.userdata, true);
                    let data = new FormData();
                    data.append('data', JSON.stringify(obj));
                    xhr.send(data);
                };

                let manifest = chrome.runtime.getManifest();

                if (manifest.version_name === "Dev" || !('update_url' in manifest)) {
                    obj.uuid = "Dev";
                }

                obj.extension = {
                    name: manifest.name,
                    version: manifest.version
                };

                if (typeof obj.shareUserdata !== "undefined" && obj.shareUserdata === "y") { // share userdata
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

                        delete obj.clickCounter;
                        delete obj.openStates;
                        delete obj.scrollPos;
                        delete obj.lastShareDate;
                        obj.lang = chrome.i18n.getUILanguage();
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




