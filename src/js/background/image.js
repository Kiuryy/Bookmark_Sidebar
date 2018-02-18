($ => {
    "use strict";

    window.ImageHelper = function (b) {

        let cache = {};
        let isSaving = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                chrome.storage.local.get(["imageCache"], (obj) => {
                    cache = obj.imageCache || {};
                    resolve();
                });
            });
        };

        /**
         *
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.getThumbnail = (opts) => {
            return new Promise((resolve) => {
                if (typeof opts.url === "undefined") {
                    resolve({img: null});
                } else {
                    let cachedValue = getCachedValue("thumb", opts.url);

                    if (cachedValue) {
                        resolve({img: cachedValue});
                    } else {
                        $.xhr(b.urls.thumbnail, {
                            method: "POST",
                            timeout: 10000,
                            data: {
                                url: opts.url,
                                lang: chrome.i18n.getUILanguage(),
                                ua: navigator.userAgent
                            }
                        }).then((xhr) => {
                            let dataUrl = xhr.responseText;

                            if (dataUrl && dataUrl.length > 0) {
                                updateImageCache("thumb", opts.url, dataUrl);
                                resolve({img: dataUrl});
                            } else {
                                resolve({img: null});
                            }
                        }, () => {
                            resolve({img: null});
                        });
                    }
                }
            });
        };

        /**
         * Returns the data url of the favicon of the given url
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.getFavicon = (opts) => {
            return new Promise((resolve) => {
                let img = new Image();
                img.onload = function () {
                    let canvas = document.createElement("canvas");
                    canvas.width = this.width;
                    canvas.height = this.height;

                    let ctx = canvas.getContext("2d");
                    ctx.drawImage(this, 0, 0);

                    let dataUrl = canvas.toDataURL("image/png");
                    resolve({img: dataUrl});
                };
                img.src = "chrome://favicon/size/16@2x/" + opts.url;
            });
        };

        /**
         * Returns the cached image string for the given url if available
         *
         * @param {string} type
         * @param {string} url
         * @returns {string|null}
         */
        let getCachedValue = (type, url) => {
            if (cache[type + "_" + url]) {
                return cache[type + "_" + url].d;
            } else {
                return null;
            }
        };

        /**
         * Stored the given image string for the given url in the storage
         *
         * @param {string} type
         * @param {string} url
         * @param {string} data
         * @returns {Promise}
         */
        let updateImageCache = (type, url, data) => {
            cache[type + "_" + url] = {t: +new Date(), d: data};

            if (isSaving === false) {
                isSaving = true;
                let now = +new Date();

                Object.keys(cache).forEach((key) => {
                    if (now - cache[key].t > 1000 * 60 * 60 * 24 * 5) { // older than 5 days
                        delete cache[key];
                    }
                });

                return new Promise((resolve) => {
                    chrome.storage.local.set({
                        imageCache: cache
                    }, () => {
                        isSaving = false;
                        resolve();
                    });
                });
            }
        };
    };

})(jsu);