($ => {
    "use strict";

    window.IconHelper = function (b) {

        let cachedSvg = {};
        let currentIcon = null;

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                this.getInfo().then((obj) => {
                    if (obj.name === "logo") {
                        chrome.browserAction.setIcon({
                            path: b.manifest.browser_action.default_icon
                        });
                    } else {
                        this.set({
                            name: obj.name,
                            color: obj.color
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
         * Returns information about the extension icon
         *
         * @returns {Promise}
         */
        this.getInfo = () => {
            return new Promise((resolve) => {
                chrome.storage.sync.get(["appearance"], (obj) => {
                    let name = "bookmark";
                    let color = "#555555";

                    if (obj && obj.appearance && obj.appearance.styles) {

                        if (obj.appearance.styles.iconShape) {
                            name = obj.appearance.styles.iconShape;
                        }

                        if (obj.appearance.styles.iconColor) {
                            color = obj.appearance.styles.iconColor;
                        }
                    }

                    resolve({
                        name: name,
                        color: color
                    });
                });
            });
        };

        /**
         * Returns the svg path with the given name and in the given color
         *
         * @returns {Promise}
         */
        this.getSvgImage = (name, color) => {
            return new Promise((resolve) => {
                new Promise((rslv) => {
                    if (cachedSvg[name]) {
                        rslv(cachedSvg[name]);
                    } else {
                        $.xhr(chrome.extension.getURL("img/icon/menu/icon-" + name + ".svg")).then((obj) => {
                            let svg = obj.responseText;
                            cachedSvg[name] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
                            rslv(cachedSvg[name]);
                        });
                    }
                }).then((svg) => {
                    color = color.replace(/#/g, "%23");
                    svg = svg.replace(/(#|%23)000/g, color);
                    resolve(svg);
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
                    let ctx = canvas.getContext("2d");

                    this.getSvgImage(opts.name, opts.color).then((svg) => {
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