($ => {
    "use strict";

    window.IconHelper = function (b) {

        let cachedSvg = {};
        let currentIcon = null;

        this.init = () => {
            return new Promise((resolve) => {
                chrome.storage.sync.get(["appearance"], (obj) => {
                    let name = "bookmark";
                    let color = "rgb(85,85,85)";

                    if (obj && obj.appearance && obj.appearance.styles) {

                        if (obj.appearance.styles.iconShape) {
                            name = obj.appearance.styles.iconShape;
                        }

                        if (obj.appearance.styles.iconColor) {
                            color = obj.appearance.styles.iconColor;
                        }
                    }

                    if (name === "logo") {
                        let manifest = chrome.runtime.getManifest();
                        chrome.browserAction.setIcon({
                            path: manifest.browser_action.default_icon
                        });
                    } else {
                        this.set({
                            name: name,
                            color: color
                        });
                    }

                    if (b.isDev) { // add badge for the dev version
                        chrome.browserAction.setBadgeBackgroundColor({color: [245, 197, 37, 255]});
                        chrome.browserAction.setBadgeText({text: "X"});
                    }

                    resolve();
                });
            });
        };


        /**
         * Sets the extension icon to the given shape with the given color
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.set = (opts) => {
            return new Promise((resolve) => {
                let onlyCurrentTab = opts.onlyCurrentTab || false;

                if (currentIcon && !onlyCurrentTab && currentIcon === opts.name + "_" + opts.color) { // icon is the same -> do nothing
                    resolve();
                } else { // icon is different
                    let canvas = document.createElement("canvas");
                    let size = 128;
                    canvas.width = size;
                    canvas.height = size;
                    let ctx = canvas.getContext('2d');

                    new Promise((rslv) => {
                        if (cachedSvg[opts.name]) {
                            rslv(cachedSvg[opts.name]);
                        } else {
                            $.xhr(chrome.extension.getURL("img/icon/menu/icon-" + opts.name + ".svg")).then((obj) => {
                                let svg = obj.responseText;
                                cachedSvg[opts.name] = "data:image/svg+xml;charset=utf-8," + svg;
                                rslv(cachedSvg[opts.name]);
                            });
                        }
                    }).then((svg) => {
                        svg = svg.replace(/\#000/g, opts.color);
                        let img = new Image();
                        img.onload = () => {
                            ctx.drawImage(img, 0, 0, size, size);

                            chrome.browserAction.setIcon({
                                imageData: ctx.getImageData(0, 0, size, size),
                                tabId: onlyCurrentTab && opts.tabInfo ? opts.tabInfo.id : null
                            });

                            if (!onlyCurrentTab) {
                                currentIcon = opts.name + "_" + opts.color;
                            }
                            resolve();
                        };
                        img.src = svg;
                    });
                }
            });
        };


    };

})(jsu);