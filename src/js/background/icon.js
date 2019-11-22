($ => {
    "use strict";

    $.IconHelper = function (b) {

        let cachedSvg = {};
        let currentIcon = null;

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                Promise.all([
                    getInfo(),
                    b.helper.language.getLangVars()
                ]).then(([info, lang]) => {
                    cachedSvg = {};
                    currentIcon = null;

                    $.api.browserAction.setTitle({title: lang.vars.header_bookmarks.message});

                    this.set({
                        name: info.name,
                        color: info.color
                    });

                    if (b.isDev && info.devModeIconBadge) { // add badge for the dev version
                        $.api.browserAction.setBadgeBackgroundColor({color: [48, 191, 169, 255]});
                        $.api.browserAction.setBadgeText({text: " "});
                    } else {
                        $.api.browserAction.setBadgeText({text: ""});
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
        const getInfo = () => {
            return new Promise((resolve) => {
                $.api.storage.sync.get(["appearance"], (obj) => {
                    let name = "bookmark";
                    let color = "auto";
                    let devModeIconBadge = true;

                    if (obj && obj.appearance && obj.appearance.styles) {

                        if (typeof obj.appearance.devModeIconBadge !== "undefined") {
                            devModeIconBadge = obj.appearance.devModeIconBadge;
                        }

                        if (obj.appearance.styles) {
                            if (obj.appearance.styles.iconShape) {
                                name = obj.appearance.styles.iconShape;
                            }

                            if (obj.appearance.styles.iconColor) {
                                color = obj.appearance.styles.iconColor;
                            }
                        }
                    }

                    resolve({
                        name: name,
                        color: color,
                        devModeIconBadge: devModeIconBadge
                    });
                });
            });
        };

        /**
         * Returns the svg path with the given name and in the given color
         *
         * @returns {Promise}
         */
        const getSvgImage = (name, color) => {
            return new Promise((resolve) => {
                new Promise((rslv) => {
                    if (cachedSvg[name]) {
                        rslv(cachedSvg[name]);
                    } else {
                        $.xhr($.api.extension.getURL("img/icon/action/icon-" + name + ".svg")).then((obj) => {
                            const svg = obj.responseText;
                            cachedSvg[name] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
                            rslv(cachedSvg[name]);
                        });
                    }
                }).then((svg) => {
                    if (color === "auto") {
                        color = $.opts.defaultColors.icon[window.matchMedia("(prefers-color-scheme: dark)").matches ? "forDark" : "forLight"];
                    }

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
                const onlyCurrentTab = opts.onlyCurrentTab || false;

                if (currentIcon && !onlyCurrentTab && currentIcon === opts.name + "_" + opts.color) { // icon is the same -> do nothing
                    resolve();
                } else { // icon is different
                    const canvas = document.createElement("canvas");
                    const size = 128;
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext("2d");

                    getSvgImage(opts.name, opts.color).then((svg) => {
                        const img = new Image();
                        img.onload = () => {
                            ctx.drawImage(img, 0, 0, size, size);

                            $.api.browserAction.setIcon({
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