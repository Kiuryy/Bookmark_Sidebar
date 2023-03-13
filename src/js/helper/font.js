($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.FontHelper = function (ext) {

        const fontWeights = {
            general: {
                Thin: 100,
                ExtraLight: 100,
                Light: 100,
                Normal: 300,
                Medium: 400,
                SemiBold: 400,
                Bold: 500,
                ExtraBold: 500,
                Black: 500
            },
            fa: {
                Thin: 100,
                ExtraLight: 100,
                Light: 100,
                Normal: 300,
                Medium: 400,
                SemiBold: 500,
                Bold: 600,
                ExtraBold: 600,
                Black: 600
            },
            ar: {
                Thin: 100,
                ExtraLight: 100,
                Light: 100,
                Normal: 300,
                Medium: 400,
                SemiBold: 500,
                Bold: 600,
                ExtraBold: 600,
                Black: 600
            },
            he: {
                Thin: 100,
                ExtraLight: 100,
                Light: 100,
                Normal: 300,
                Medium: 400,
                SemiBold: 500,
                Bold: 600,
                ExtraBold: 600,
                Black: 600
            },
            ja: {
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
            "zh_CN": {
                Thin: 100,
                ExtraLight: 100,
                Light: 100,
                Normal: 300,
                Medium: 400,
                SemiBold: 400,
                Bold: 400,
                ExtraBold: 500,
                Black: 500
            },
            "zh_TW": {
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

        /**
         * Returns the font-weights of the current language
         *
         * @returns {object}
         */
        this.getFontWeights = () => {
            const lang = ext.helper.i18n.getLanguage();
            let weights = {...fontWeights.general};

            if (fontWeights[lang]) {
                weights = {...fontWeights[lang]};
            }

            const ret = {};
            for (const key in weights) {
                ret["fontWeight" + key] = weights[key];
            }

            return ret;
        };
    };

})(jsu);