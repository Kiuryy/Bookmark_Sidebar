($ => {
    "use strict";

    window.BehaviourHelper = function (s) {

        /**
         * Initialises the behaviour settings
         */
        this.init = () => {
            ["rememberScroll", "rememberSearch"].forEach((field) => {
                if (s.helper.model.getData("b/" + field) === true) {
                    s.opts.elm.checkbox[field].trigger("click");
                }
            });

            let pxTolerance = s.helper.model.getData("b/pxTolerance");
            s.opts.elm.range.pxToleranceMaximized[0].value = pxTolerance.maximized;
            s.opts.elm.range.pxToleranceWindowed[0].value = pxTolerance.windowed;

            let scrollSensitivity = s.helper.model.getData("b/scrollSensitivity");
            s.opts.elm.range.mouseScrollSensitivity[0].value = scrollSensitivity.mouse;
            s.opts.elm.range.trackpadScrollSensitivity[0].value = scrollSensitivity.trackpad;

            s.opts.elm.range.closeTimeout[0].value = s.helper.model.getData("b/closeTimeout");
            s.opts.elm.select.openAction[0].value = s.helper.model.getData("b/openAction");
            s.opts.elm.select.newTab[0].value = s.helper.model.getData("b/newTab");

            s.opts.elm.range.pxToleranceMaximized.trigger("change");
            s.opts.elm.range.pxToleranceWindowed.trigger("change");
            s.opts.elm.range.mouseScrollSensitivity.trigger("change");
            s.opts.elm.range.trackpadScrollSensitivity.trigger("change");
            s.opts.elm.range.closeTimeout.trigger("change");
        };

        /**
         * Save the behaviour settings
         */
        this.save = () => {
            let config = {
                pxTolerance: {
                    maximized: s.opts.elm.range.pxToleranceMaximized[0].value,
                    windowed: s.opts.elm.range.pxToleranceWindowed[0].value
                },
                scrollSensitivity: {
                    mouse: s.opts.elm.range.mouseScrollSensitivity[0].value,
                    trackpad: s.opts.elm.range.trackpadScrollSensitivity[0].value
                },
                closeTimeout: s.opts.elm.range.closeTimeout[0].value,
                openAction: s.opts.elm.select.openAction[0].value,
                newTab: s.opts.elm.select.newTab[0].value
            };

            ["rememberScroll", "rememberSearch"].forEach((field) => {
                config[field] = s.helper.checkbox.isChecked(s.opts.elm.checkbox[field]);
            });

            chrome.storage.sync.set({behaviour: config}, () => {
                s.showSuccessMessage("saved_message");
            });
        };


    };

})(jsu);