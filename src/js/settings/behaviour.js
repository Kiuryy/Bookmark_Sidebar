($ => {
    "use strict";

    window.BehaviourHelper = function (s) {

        /**
         * Initialises the behaviour settings
         */
        this.init = () => {
            initEvents();

            ["rememberSearch", "dirAccordion", "initialOpenOnNewTab"].forEach((field) => {
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
            s.opts.elm.range.dirOpenDuration[0].value = s.helper.model.getData("b/dirOpenDuration");
            s.opts.elm.range.openDelay[0].value = s.helper.model.getData("b/openDelay");
            s.opts.elm.select.openAction[0].value = s.helper.model.getData("b/openAction");
            s.opts.elm.select.linkAction[0].value = s.helper.model.getData("b/linkAction");
            s.opts.elm.select.rememberState[0].value = s.helper.model.getData("b/rememberState");
            s.opts.elm.select.newTab[0].value = s.helper.model.getData("b/newTab");

            s.opts.elm.range.pxToleranceMaximized.trigger("change");
            s.opts.elm.range.pxToleranceWindowed.trigger("change");
            s.opts.elm.range.mouseScrollSensitivity.trigger("change");
            s.opts.elm.range.trackpadScrollSensitivity.trigger("change");
            s.opts.elm.range.closeTimeout.trigger("change");
            s.opts.elm.range.dirOpenDuration.trigger("change");
            s.opts.elm.range.openDelay.trigger("change");
            s.opts.elm.select.openAction.trigger("change");
            s.opts.elm.select.linkAction.trigger("change");
            s.opts.elm.select.rememberState.trigger("change");
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
                dirOpenDuration: s.opts.elm.range.dirOpenDuration[0].value,
                openDelay: s.opts.elm.range.openDelay[0].value,
                openAction: s.opts.elm.select.openAction[0].value,
                linkAction: s.opts.elm.select.linkAction[0].value,
                rememberState: s.opts.elm.select.rememberState[0].value,
                newTab: s.opts.elm.select.newTab[0].value
            };

            ["rememberSearch", "dirAccordion", "initialOpenOnNewTab"].forEach((field) => {
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
                    url: "chrome://extensions",
                    active: true
                });
            });
        };


    };

})(jsu);