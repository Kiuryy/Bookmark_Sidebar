($ => {
    "use strict";

    $.SettingsConfigHelper = function (s) {

        /**
         * Returns the configuration as it would be stored when saving right now,
         * consisting of the stored configuration, overwritten by the current state of the form
         *
         * @returns {Promise<object>}
         */
        this.get = async () => {
            const conf = await $.api.storage.sync.get(["behaviour", "appearance", "newtab", "language"]);
            conf.utility = conf.utility || {};
            conf.behaviour = conf.behaviour || {};
            conf.appearance = conf.appearance || {};
            conf.newtab = conf.newtab || {};
            conf.appearance.styles = conf.appearance.styles || {};
            conf.behaviour.blacklist = [];
            conf.behaviour.whitelist = [];

            $.deepMerge(conf, s.helper.form.getFormData());

            applyBehaviourValues(conf);
            applyAppearanceValues(conf);
            applyUtilityValues(conf);

            conf.newtab.faviconPadding = s.helper.newtab.getFaviconPadding(conf.newtab.faviconBackground);

            return conf;
        };

        /**
         * Stores the current configuration and lets the background script and the other pages know about it
         *
         * @returns {Promise}
         */
        this.save = async () => {
            const conf = await this.get();

            await $.api.storage.sync.set({
                behaviour: conf.behaviour,
                appearance: conf.appearance,
                newtab: conf.newtab
            });

            await s.helper.model.call("reinitialize");
            s.helper.model.call("reloadIcon");
            s.helper.model.call("reloadBrowserAction");
            await s.helper.model.init();
        };

        /**
         * Applies the behaviour values, which can't be read from the form fields directly
         *
         * @param {object} conf
         */
        const applyBehaviourValues = (conf) => {
            if (s.helper.form.elements.range.tooltipDelay.hasClass($.cl.settings.inactive)) {
                conf.behaviour.tooltipDelay = -1;
            }

            if (conf.behaviour.visibility === "blacklist" || conf.behaviour.visibility === "whitelist") {
                const rules = s.helper.form.elements.textarea.visibilityFilter[0].value;
                conf.behaviour[conf.behaviour.visibility] = rules.split(/\n+/).filter(rule => rule.trim() !== "");

                if (conf.behaviour[conf.behaviour.visibility].length === 0) {
                    conf.behaviour.visibility = "always";
                }
            }

            conf.behaviour.dirOpenDuration = conf.appearance.theme === "focus" ? 0 : s.helper.model.getDefaultData().behaviour.dirOpenDuration;
        };

        /**
         * Applies the appearance values, which can't be read from the form fields directly or are derived from other values
         *
         * @param {object} conf
         */
        const applyAppearanceValues = (conf) => {
            const styles = conf.appearance.styles;

            styles.overlayMaskColor = null; // not configurable, always derived from the theme and the surface (older versions stored the value of the theme explicitly)

            const colorSchemeColorValue = s.helper.form.getColorValue("colorScheme", styles.colorScheme);
            const defaultColors = s.helper.model.getDefaultColors(conf.appearance.theme);
            const lum = colorSchemeColorValue.luminance ? colorSchemeColorValue.luminance : 0;
            styles.foregroundColor = defaultColors.foregroundColor[lum > 170 ? "dark" : "light"];
            conf.appearance.highContrast = lum > 215;

            if (styles.fontFamily === "default") {
                styles.fontFamily = s.helper.model.getDefaultData().appearance.styles.fontFamily;
            } else { // wrap ticks around the font name to prevent Chrome to ignore fonts with spaces or special characters in the css definition
                styles.fontFamily = "'" + styles.fontFamily.replace(/^'+|'+$/g, "") + "'";
            }

            if (s.helper.checkbox.isChecked(s.helper.form.elements.checkbox.surfaceColorAuto)) {
                conf.appearance.surface = "auto";
            } else {
                conf.appearance.surface = conf.appearance.surface ? "dark" : "light";
            }

            if (s.helper.form.elements.select.iconColorType[0].value === "auto") {
                styles.iconColor = "auto";
            }
        };

        /**
         * Applies the utility values, custom css is only applied with premium access
         *
         * @param {object} conf
         */
        const applyUtilityValues = (conf) => {
            if (s.helper.premium.hasAccess("customCss")) {
                // eslint-disable-next-line no-irregular-whitespace
                conf.utility.customCss = (conf.utility.customCss || "").replace(/[​-‍﻿]/g, "").trim();
            } else {
                conf.utility.customCss = "";
            }
        };
    };

})(jsu);
