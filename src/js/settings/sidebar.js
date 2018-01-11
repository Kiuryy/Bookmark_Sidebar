($ => {
    "use strict";

    window.SidebarHelper = function (s) {

        /**
         * Initialises the behaviour settings
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();

            ["dirAccordion", "animations", "preventPageScroll", "reopenSidebar", "dndOpen"].forEach((field) => {
                if (s.helper.model.getData("b/" + field) === true) {
                    s.opts.elm.checkbox[field].trigger("click");
                }
            });

            let pxTolerance = s.helper.model.getData("b/pxTolerance");
            s.opts.elm.range.pxToleranceMaximized[0].value = pxTolerance.maximized;
            s.opts.elm.range.pxToleranceWindowed[0].value = pxTolerance.windowed;
            s.opts.elm.select.language[0].value = s.helper.i18n.getLanguage();

            ["openAction", "sidebarPosition", "linkAction", "rememberState", "newTab", "newTabPosition", "tooltipContent"].forEach((field) => { // select
                s.opts.elm.select[field][0].value = s.helper.model.getData("b/" + field);
                s.opts.elm.select[field].trigger("change");
            });

            ["openDelay", "dirOpenDuration", "openChildrenWarnLimit", "scrollBarHide", "closeTimeout", "tooltipDelay"].forEach((field) => { // range
                let val = s.helper.model.getData("b/" + field);

                if (val === -1) {
                    let checkbox = s.opts.elm.range[field].data("infinityCheckbox");
                    if (checkbox && checkbox.length() > 0) {
                        checkbox.trigger("click");
                    }
                }

                s.opts.elm.range[field][0].value = val;
                s.opts.elm.range[field].trigger("change");
            });

            s.opts.elm.range.pxToleranceMaximized.trigger("change");
            s.opts.elm.range.pxToleranceWindowed.trigger("change");
        };

        /**
         * Save the behaviour settings and the user language
         *
         * @returns {Promise}
         */
        this.save = () => {
            return new Promise((resolve) => {
                let config = {
                    pxTolerance: {
                        maximized: s.opts.elm.range.pxToleranceMaximized[0].value,
                        windowed: s.opts.elm.range.pxToleranceWindowed[0].value
                    }
                };

                ["openAction", "sidebarPosition", "linkAction", "rememberState", "newTab", "newTabPosition", "tooltipContent"].forEach((field) => { // select
                    config[field] = s.opts.elm.select[field][0].value;
                });

                ["openDelay", "dirOpenDuration", "openChildrenWarnLimit", "scrollBarHide", "closeTimeout", "tooltipDelay"].forEach((field) => { // range
                    let val = -1;

                    if (s.opts.elm.range[field].hasClass(s.opts.classes.range.inactive) === false) { // if inactive set -1 as value else use the selected value
                        val = s.opts.elm.range[field][0].value;
                    }

                    config[field] = val;
                });

                ["dirAccordion", "animations", "preventPageScroll", "reopenSidebar", "dndOpen"].forEach((field) => { // checkbox
                    config[field] = s.helper.checkbox.isChecked(s.opts.elm.checkbox[field]);
                });

                let lang = s.opts.elm.select.language[0].value;
                if (lang === s.helper.i18n.getUILanguage()) {
                    lang = "default";
                }

                chrome.storage.sync.get(["language"], (obj) => {
                    chrome.storage.sync.set({
                        behaviour: config,
                        language: lang
                    }, () => {
                        if (obj && obj.language && obj.language !== lang) {
                            $.delay(1500).then(() => {
                                location.reload(true);
                            });
                        }
                        resolve();
                    });
                });
            });
        };

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            s.opts.elm.select.openAction.on("change", (e) => { // hide menupoint for changing the appearance of the indicator if it is not visible at all
                let indicatorMenuPoint = s.opts.elm.aside.find("li[" + s.opts.attr.name + "='indicator']");

                if (e.currentTarget.value === "contextmenu" || e.currentTarget.value === "mousedown") {
                    indicatorMenuPoint.removeClass(s.opts.classes.hidden);
                } else {
                    indicatorMenuPoint.addClass(s.opts.classes.hidden);
                }
            });

            s.opts.elm.buttons.keyboardShortcut.on("click", (e) => {
                e.preventDefault();
                let versionRaw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./); // @deprecated url to shortcut page has changed with Chrome X -> switch for older versions can be removed when min required version >= X
                let version = versionRaw ? parseInt(versionRaw[2], 10) : null;

                chrome.tabs.create({
                    url: version >= 99999 ? "chrome://extensions/shortcuts" : "chrome://extensions/configureCommands", // Google withdraw the changes of the extension overview, so don't use the new url until Google added it back
                    active: true
                });
            });
        };
    };

})(jsu);