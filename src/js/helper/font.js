($ => {
    "use strict";

    window.FontHelper = function (ext) {

        let defaults = {
            general: {
                name: "Roboto",
                href: "https://fonts.googleapis.com/css?family=Roboto:100,200,300,400,500,100i,200i,300i,400i,500i"
            },
            ja: {
                name: "Noto Sans Japanese",
                href: "https://fonts.googleapis.com/earlyaccess/notosansjapanese.css"
            },
            'zh-CN': {
                name: "Noto Sans SC",
                href: "https://fonts.googleapis.com/earlyaccess/notosanssc.css"
            }
        };

        let fontWeights = {
            "__default": {
                Thin: 100,
                ExtraLight: 200,
                Light: 300,
                Normal: 400,
                Medium: 500,
                SemiBold: 600,
                Bold: 700,
                ExtraBold: 800,
                Black: 900
            },
            "Roboto": {
                Thin: 100,
                ExtraLight: 100,
                Light: 200,
                Normal: 300,
                Medium: 400,
                SemiBold: 400,
                Bold: 500,
                ExtraBold: 500,
                Black: 500
            },
            "Noto Sans Japanese": {
                Thin: 100,
                ExtraLight: 100,
                Light: 100,
                Normal: 200,
                Medium: 300,
                SemiBold: 400,
                Bold: 500,
                ExtraBold: 500,
                Black: 500
            },
            "Noto Sans SC": {
                Thin: 100,
                ExtraLight: 100,
                Light: 100,
                Normal: 300,
                Medium: 400,
                SemiBold: 400,
                Bold: 400,
                ExtraBold: 500,
                Black: 500
            }
        };

        let fontInfo = {};

        /**
         *
         */
        this.init = () => {
            let styles = ext.helper.model.getData("a/styles");
            if (styles.fontFamily && styles.fontFamily !== "default") {
                fontInfo = {
                    name: styles.fontFamily
                };
            } else {
                fontInfo = this.getDefaultFontInfo();
            }

            fontInfo.fontWeights = this.getFontWeights(fontInfo.name);
        };

        /**
         * Returns whether the fontHelpers init method was already executed
         *
         * @returns {boolean}
         */
        this.isLoaded = () => !!(fontInfo.name);

        /**
         * Returns information about the configurated font
         *
         *  @returns {object}
         */
        this.getFontInfo = () => fontInfo;

        /**
         * Returns the font-weights of the given font
         *
         * @param {string} font
         * @returns {object}
         */
        this.getFontWeights = (font) => {
            let ret = {};
            Object.keys(fontWeights["__default"]).forEach((key) => {
                let val = fontWeights["__default"][key];

                if (fontWeights[font] && fontWeights[font][key]) { // override font weights with font family specific one
                    val = fontWeights[font][key];
                }
                ret["fontWeight" + key] = val;
            });
            return ret;
        };

        /**
         * Adds the stylesheet for the font to the given document if there is one
         *
         * @param {jsu} context
         */
        this.addStylesheet = (context) => {
            if (fontInfo.href) {
                $("<link />").attr({
                    rel: "stylesheet",
                    type: "text/css",
                    href: fontInfo.href
                }).appendTo(context.find("head"));
            }
        };

        /**
         * Initialises the information about the default font
         *
         * @returns {object}
         */
        this.getDefaultFontInfo = () => {
            let lang = ext.helper.i18n.getLanguage();

            if (defaults[lang]) { // language specific default font
                return defaults[lang];
            } else {
                return defaults.general;
            }
        };
    };

})(jsu);