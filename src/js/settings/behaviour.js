($ => {
    "use strict";

    window.BehaviourHelper = function (s) {

        /**
         * Initialises the behaviour settings
         */
        this.init = () => {
            initEvents();

            ["rememberSearch", "dirAccordion", "animations", "preventPageScroll", "initialOpenOnNewTab"].forEach((field) => {
                if (s.helper.model.getData("b/" + field) === true) {
                    s.opts.elm.checkbox[field].trigger("click");
                }
            });

            let pxTolerance = s.helper.model.getData("b/pxTolerance");
            s.opts.elm.range.pxToleranceMaximized[0].value = pxTolerance.maximized;
            s.opts.elm.range.pxToleranceWindowed[0].value = pxTolerance.windowed;

            ["openAction", "linkAction", "rememberState", "newTab", "newTabPosition"].forEach((field) => { // select
                s.opts.elm.select[field][0].value = s.helper.model.getData("b/" + field);
                s.opts.elm.select[field].trigger("change");
            });

            ["openDelay", "dirOpenDuration", "closeTimeout"].forEach((field) => { // range
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
         * Save the behaviour settings
         */
        this.save = () => {
            let config = {
                pxTolerance: {
                    maximized: s.opts.elm.range.pxToleranceMaximized[0].value,
                    windowed: s.opts.elm.range.pxToleranceWindowed[0].value
                }
            };

            ["openAction", "linkAction", "rememberState", "newTab", "newTabPosition"].forEach((field) => { // select
                config[field] = s.opts.elm.select[field][0].value;
            });

            ["openDelay", "dirOpenDuration", "closeTimeout"].forEach((field) => { // range
                let val = -1;

                if (s.opts.elm.range[field].hasClass(s.opts.classes.range.inactive) === false) { // if inactive set -1 as value else use the selected value
                    val = s.opts.elm.range[field][0].value;
                }

                config[field] = val;
            });

            ["rememberSearch", "dirAccordion", "animations", "preventPageScroll", "initialOpenOnNewTab"].forEach((field) => { // checkbox
                config[field] = s.helper.checkbox.isChecked(s.opts.elm.checkbox[field]);
            });

            chrome.storage.sync.set({behaviour: config}, () => {
                s.helper.model.call("refreshAllTabs", {type: "Settings"});
                s.showSuccessMessage("saved_message");
            });
        };

        let initEvents = () => {
            s.opts.elm.keyboardShortcutInfo.children("a").on("click", (e) => {
                e.preventDefault();
                chrome.tabs.create({
                    url: "chrome://extensions/configureCommands",
                    active: true
                });
            });
        };


    };

})(jsu);