($ => {
    "use strict";

    $.IconHelper = function (b) {
        const iconSize = 128;

        const icons = {
            bookmark: {
                strokeWidth: 10,
                path: "M 98.641 13.516 C 98.641 3.258 87.913 3.258 87.913 3.258 H 45.033 S 34.31 3.258 34.31 13.516 V 121.228 L 66.484 90.449 L 98.659 121.228 Z"
            },
            star: {
                strokeWidth: 10,
                path: "M 126.579 49.962 L 95.277 80.476 l 7.388 43.128 L 63.916 103.252 l -38.661 20.352 L 32.672 80.476 L 1.282 49.991 l 43.274 -6.249 L 63.916 4.498 l 19.389 39.245 z"
            },
            "new-1": {
                path: "M 120.32 58.058 a 5.12 5.12 0 0 0 -5.12 5.12 c 0 28.224 -22.976 51.2 -51.2 51.2 S 12.8 91.402 12.8 63.178 A 51.264 51.264 0 0 1 100.32 27.114 a 5.12 5.12 0 1 0 7.264 -7.232 A 61.504 61.504 0 0 0 2.56 63.178 c 0 33.888 27.552 61.44 61.44 61.44 s 61.44 -27.552 61.44 -61.44 a 5.12 5.12 0 0 0 -5.12 -5.12 z M 84.48 58.058 h -15.36 v -15.36 a 5.12 5.12 0 0 0 -10.24 0 v 15.36 h -15.36 a 5.12 5.12 0 0 0 0 10.24 h 15.36 v 15.36 a 5.12 5.12 0 0 0 10.24 0 v -15.36 h 15.36 a 5.12 5.12 0 0 0 0 -10.24 z"
            },
            "new-2": {
                path: "M 94.868 126.671 l -0.064 -11.33 v -10.114 h -10.05 l -11.266 -0.064 v -10.37 l 11.266 -0.064 h 9.986 l 0.064 -10.242 v -11.266 h 10.562 V 94.729 h 21.636 v 10.37 l -11.266 0.064 l -10.306 0.064 v 10.242 l -0.128 11.266 h -10.434 z m -78.543 -4.481 a 13.507 13.507 0 0 1 -8.13 -4.609 c -1.024 -1.28 -2.176 -3.457 -2.56 -5.121 c -0.32 -1.088 -0.384 -3.777 -0.384 -48.457 c 0 -53.002 -0.128 -48.009 1.344 -51.018 c 1.6 -3.393 4.737 -5.889 8.578 -6.977 c 1.088 -0.256 3.713 -0.32 48.457 -0.32 c 44.616 0 47.305 0 48.393 0.32 c 3.841 1.088 7.041 3.649 8.642 7.041 c 1.344 2.945 1.28 0.832 1.28 27.333 l 0.064 23.812 h -13.058 V 18.683 H 18.246 v 90.705 h 46.281 v 13.058 H 40.97 c -12.93 0 -24.005 -0.128 -24.645 -0.192 z"
            }
        };

        const defaultColors = {
            forLight: "#555555",
            forDark: "#ffffff"
        };

        let currentIcon = null;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            const [info, lang] = await Promise.all([
                getInfo(),
                b.helper.language.getLangVars()
            ]);

            currentIcon = null;
            initExtensionIcon(info, lang);
        };

        /**
         * Initialises the extension icon, which is displayed right of the address bar (or in the extension menu)
         *
         * @param info
         * @param lang
         */
        const initExtensionIcon = (info, lang) => {
            this.setExtensionIcon({
                name: info.name,
                color: info.color
            });

            $.api.action.setTitle({title: lang.vars.header_bookmarks.message});

            if ($.isDev && !$.opts.demoMode && info.devModeIconBadge) { // add badge for the dev version
                $.api.action.setBadgeBackgroundColor({color: [48, 191, 169, 255]});
                $.api.action.setBadgeText({text: " "});
            } else {
                $.api.action.setBadgeText({text: ""});
            }
        };

        /**
         * Returns information about the extension icon
         *
         * @returns {Promise}
         */
        const getInfo = async () => {
            const ret = {
                name: "bookmark",
                color: "auto",
                devModeIconBadge: true
            };

            const config = await $.api.storage.sync.get(["appearance"]);

            if (config && config.appearance && config.appearance.styles) {
                if (typeof config.appearance.devModeIconBadge !== "undefined") {
                    ret.devModeIconBadge = config.appearance.devModeIconBadge;
                }

                if (config.appearance.styles) {
                    if (config.appearance.styles.iconShape) {
                        ret.name = config.appearance.styles.iconShape;
                    }

                    if (config.appearance.styles.iconColor) {
                        ret.color = config.appearance.styles.iconColor;
                    }
                }
            }

            return ret;
        };

        /**
         * Draws the configured shape onto the canvas
         *
         * @param ctx
         * @param opts
         */
        const drawSvgPath = (ctx, opts) => {
            ctx.beginPath();

            let shapeName = opts.name;
            let shapeColor = opts.color;
            let fill = false;

            if (shapeName.endsWith("-filled") || typeof icons[shapeName].strokeWidth === "undefined") {
                shapeName = shapeName.replace("-filled", "");
                fill = true;
            }

            if (opts.color === "auto") {
                shapeColor = defaultColors[b.helper.model.getSystemColor() === "dark" ? "forDark" : "forLight"];
            }

            ctx.strokeStyle = shapeColor;
            ctx.fillStyle = shapeColor;

            const path = new Path2D(icons[shapeName].path);
            const pad = opts.padding || 0;
            if (pad) {
                const scaleFactor = 1 - pad * 2 / iconSize;

                ctx.translate(pad, pad);
                ctx.scale(scaleFactor, scaleFactor);
            }

            if (fill) {
                ctx.fill(path);
            } else {
                ctx.lineWidth = icons[shapeName].strokeWidth;
                ctx.stroke(path);
            }

            ctx.closePath();
        };

        /**
         * Returns the icon image data of the extension icon with the given shape and given color
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.getImageData = async (opts) => {
            const canvas = new OffscreenCanvas(iconSize, iconSize);
            const ctx = canvas.getContext("2d");

            if (opts.background) {
                ctx.beginPath();
                ctx.fillStyle = opts.background;
                ctx.arc(iconSize / 2, iconSize / 2, iconSize / 2, 0, 2 * Math.PI, false);
                ctx.fill();
                ctx.closePath();
            }

            drawSvgPath(ctx, opts);
            return ctx.getImageData(0, 0, iconSize, iconSize);
        };

        /**
         * Sets the extension icon to the given shape with the given color
         *
         * @param {object} opts
         * @returns {Promise}
         */
        this.setExtensionIcon = async (opts) => {
            const onlyCurrentTab = opts.onlyCurrentTab || false;

            if (currentIcon && !onlyCurrentTab && currentIcon === opts.name + "_" + opts.color) {
                // icon is the same -> do nothing
            } else { // icon is different
                const imageData = await this.getImageData(opts);
                $.api.action.setIcon({
                    imageData: imageData,
                    tabId: onlyCurrentTab && opts.tabId ? opts.tabId : null
                });

                if (!onlyCurrentTab) {
                    currentIcon = opts.name + "_" + opts.color;
                }
            }
        };
    };

})(jsu);