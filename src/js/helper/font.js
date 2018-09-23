($ => {
    "use strict";

    /**
     * @requires helper: model, i18n
     * @param {object} ext
     * @constructor
     */
    $.FontHelper = function (ext) {

        const defaultFonts = {
            custom: {
                fontWeights: {
                    Thin: 100, ExtraLight: 200, Light: 300, Normal: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800, Black: 900
                }
            },
            general: {
                name: "Roboto",
                href: "https://fonts.googleapis.com/css?family=Roboto:100,200,300,400,500,100i,200i,300i,400i,500i",
                fontWeights: {
                    Thin: 100, ExtraLight: 100, Light: 200, Normal: 300, Medium: 400, SemiBold: 400, Bold: 500, ExtraBold: 500, Black: 500
                }
            },
            fa: {
                fontWeights: {
                    Thin: 100, ExtraLight: 100, Light: 200, Normal: 300, Medium: 400, SemiBold: 500, Bold: 600, ExtraBold: 600, Black: 600
                }
            },
            ar: {
                fontWeights: {
                    Thin: 100, ExtraLight: 100, Light: 200, Normal: 300, Medium: 400, SemiBold: 500, Bold: 600, ExtraBold: 600, Black: 600
                }
            },
            he: {
                fontWeights: {
                    Thin: 100, ExtraLight: 100, Light: 200, Normal: 300, Medium: 400, SemiBold: 500, Bold: 600, ExtraBold: 600, Black: 600
                }
            },
            ja: {
                name: "Noto Sans Japanese",
                href: "https://fonts.googleapis.com/earlyaccess/notosansjapanese.css",
                fontWeights: {
                    Thin: 100, ExtraLight: 100, Light: 100, Normal: 200, Medium: 300, SemiBold: 400, Bold: 500, ExtraBold: 500, Black: 500
                }
            },
            "zh_CN": {
                name: "Noto Sans SC",
                href: "https://fonts.googleapis.com/earlyaccess/notosanssc.css",
                fontWeights: {
                    Thin: 100, ExtraLight: 100, Light: 100, Normal: 300, Medium: 400, SemiBold: 400, Bold: 400, ExtraBold: 500, Black: 500
                }
            },
            "zh_TW": {
                name: "Noto Sans TC",
                href: "https://fonts.googleapis.com/earlyaccess/notosanstc.css",
                fontWeights: {
                    Thin: 100, ExtraLight: 100, Light: 100, Normal: 300, Medium: 400, SemiBold: 400, Bold: 400, ExtraBold: 500, Black: 500
                }
            }
        };

        const fontInfo = {
            "default": {},
            "config": {}
        };

        /**
         *
         */
        this.init = () => {
            const styles = ext.helper.model.getData("a/styles");

            fontInfo["default"] = this.getDefaultFontInfo();
            fontInfo["default"].fontWeights = this.getFontWeights(fontInfo["default"].name);

            if (styles.fontFamily && styles.fontFamily !== "default" && styles.fontFamily !== fontInfo["default"].name) {
                fontInfo.config = {
                    name: styles.fontFamily,
                    fontWeights: this.getFontWeights(styles.fontFamily)
                };
            } else {
                fontInfo.config = fontInfo["default"];
            }
        };

        /**
         * Returns whether the fontHelpers init method was already executed
         *
         * @returns {boolean}
         */
        this.isLoaded = () => !!(fontInfo["default"].name);

        /**
         * Returns information about the configurated font
         *
         * @param {string} type
         * @returns {object}
         */
        this.getFontInfo = (type = "config") => fontInfo[type];

        /**
         * Returns the font-weights of the given font
         *
         * @param {string} font
         * @returns {object}
         */
        this.getFontWeights = (font) => {
            const lang = ext.helper.i18n.getLanguage();
            const ret = {};

            if (defaultFonts[lang] && typeof defaultFonts[lang].name === "undefined") {
                defaultFonts[lang].name = defaultFonts.general.name;
            }

            Object.entries(defaultFonts.custom.fontWeights).forEach(([key, val]) => {
                if (defaultFonts[lang] && defaultFonts[lang].fontWeights && defaultFonts[lang].fontWeights[key] && defaultFonts[lang].name === font) { // language specific fontWeight available
                    val = defaultFonts[lang].fontWeights[key];
                } else if (defaultFonts.general.fontWeights[key] && defaultFonts.general.name === font) { // default specific fontWeight available
                    val = defaultFonts.general.fontWeights[key];
                }

                ret["fontWeight" + key] = val;
            });

            return ret;
        };

        /**
         * Adds the stylesheet for the font to the given document if there is one
         *
         * @param {jsu} context
         * @param {string} type
         */
        this.addStylesheet = (context, type = "config") => {
            if (fontInfo[type] && fontInfo[type].href) {
                $("<link />").attr({
                    rel: "stylesheet",
                    type: "text/css",
                    href: fontInfo[type].href
                }).appendTo(context.find("head"));
            }
        };

        /**
         * Initialises the information about the default font
         *
         * @returns {object}
         */
        this.getDefaultFontInfo = () => {
            const lang = ext.helper.i18n.getLanguage();

            if (defaultFonts[lang] && defaultFonts[lang].name && defaultFonts[lang].href) {
                return Object.assign({}, defaultFonts[lang]);
            } else {
                return Object.assign({}, defaultFonts.general);
            }
        };
    };

})(jsu);