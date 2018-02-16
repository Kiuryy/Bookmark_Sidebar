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
            initToggleAreaEvents();
            initToggleAreaFields();

            ["dirAccordion", "animations", "preventPageScroll", "reopenSidebar", "dndOpen"].forEach((field) => {
                if (s.helper.model.getData("b/" + field) === true) {
                    s.opts.elm.checkbox[field].trigger("click");
                }
            });

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
        };

        /**
         * Save the behaviour settings and the user language
         *
         * @returns {Promise}
         */
        this.save = () => {
            return new Promise((resolve) => {
                let config = {
                    toggleArea: {}
                };

                ["width", "height", "top", "widthWindowed"].forEach((field) => {
                    config.toggleArea[field] = s.opts.elm.range["toggleArea_" + field][0].value;
                });

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
                        if (!(obj && obj.language && obj.language === lang)) {
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
         * Initialises the toggleArea sliders
         */
        let initToggleAreaFields = () => {
            let toggleArea = s.helper.model.getData("b/toggleArea");

            ["width", "height", "top", "widthWindowed"].forEach((field) => {
                s.opts.elm.range["toggleArea_" + field][0].value = toggleArea[field];
                s.opts.elm.range["toggleArea_" + field].trigger("change");
            });
        };

        /**
         * Initialises the eventhandlers for the toggleArea modal
         *
         * @returns {Promise}
         */
        let initToggleAreaEvents = async () => {
            let modal = s.opts.elm.body.children("div." + s.opts.classes.toggleArea.modal);
            let preview = modal.children("div." + s.opts.classes.toggleArea.preview);

            $([s.opts.elm.range.toggleArea_width, s.opts.elm.range.toggleArea_height, s.opts.elm.range.toggleArea_top]).on("change input", (e) => {
                let minWidth = 14;

                let val = {
                    width: +s.opts.elm.range.toggleArea_width[0].value,
                    height: +s.opts.elm.range.toggleArea_height[0].value,
                    top: +s.opts.elm.range.toggleArea_top[0].value
                };

                if (val.height + val.top > 100) {
                    let topVal = null;

                    if (e.currentTarget === s.opts.elm.range.toggleArea_height[0]) {
                        topVal = val.top - (val.height + val.top - 100);
                    } else if (e.currentTarget === s.opts.elm.range.toggleArea_top[0]) {
                        topVal = 100 - val.height;
                    }

                    if (topVal !== null) {
                        s.opts.elm.range.toggleArea_top[0].value = topVal;
                        s.opts.elm.range.toggleArea_top.trigger("change");
                    }
                } else {
                    preview.css({
                        width: (minWidth + val.width) + "px",
                        height: (val.height) + "%",
                        top: val.top + "%"
                    });

                    if (val.height === 100) {
                        preview.addClass(s.opts.classes.toggleArea.fullHeight);
                    } else {
                        preview.removeClass(s.opts.classes.toggleArea.fullHeight);
                    }
                }
            });

            s.opts.elm.buttons.toggleAreaOpen.on("click", (e) => { // open modal for advanced toggle options
                e.preventDefault();

                $.delay(100).then(() => {
                    modal.attr(s.opts.attr.type, s.opts.elm.select.sidebarPosition[0].value);
                    s.opts.elm.body.addClass(s.opts.classes.showModal);
                });
            });

            s.opts.elm.buttons.toggleAreaSave.on("click", (e) => { // save settings
                e.preventDefault();
                s.opts.elm.buttons.save.trigger("click");
                s.opts.elm.body.trigger("click");
            });

            s.opts.elm.buttons.toggleAreaCancel.on("click", (e) => { // close modal
                e.preventDefault();
                s.opts.elm.body.trigger("click");
                $.delay(500).then(() => {
                    initToggleAreaFields();
                });
            });

            s.opts.elm.body.on("click", (e) => { // close modal when click something outside the overlay
                let _target = $(e.target);
                if (
                    !preview.hasClass(s.opts.classes.toggleArea.dragging) &&
                    !_target.hasClass(s.opts.classes.toggleArea.modal) &&
                    _target.parents("div." + s.opts.classes.toggleArea.modal).length() === 0
                ) {
                    s.opts.elm.body.removeClass(s.opts.classes.showModal);
                }
            });

            preview.on("mousedown", (e) => { // drag start
                preview.addClass([s.opts.classes.toggleArea.dragged, s.opts.classes.toggleArea.dragging]);
                preview.data("pos", {start: preview[0].offsetTop, y: e.pageY});
            });

            s.opts.elm.body.on("mouseup", () => { // drag end
                $.delay(0).then(() => {
                    preview.removeClass(s.opts.classes.toggleArea.dragging);
                });
            }).on("mousemove", (e) => { // drag move
                if (preview.hasClass(s.opts.classes.toggleArea.dragging) && e.which === 1) {
                    let pos = preview.data("pos");
                    s.opts.elm.range.toggleArea_top[0].value = ((pos.start + e.pageY - pos.y) / modal[0].offsetHeight) * 100;
                    s.opts.elm.range.toggleArea_top.trigger("change");
                }
            }, {passive: true});
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            s.opts.elm.select.openAction.on("change", (e) => {
                let indicatorMenuPoint = s.opts.elm.aside.find("li[" + s.opts.attr.name + "='indicator']");

                // hide menupoint for changing the appearance of the indicator if it is not visible at all
                if (e.currentTarget.value === "contextmenu" || e.currentTarget.value === "mousedown") {
                    indicatorMenuPoint.removeClass(s.opts.classes.hidden);
                } else {
                    indicatorMenuPoint.addClass(s.opts.classes.hidden);
                }

                // hide "configure area" when user wants to open the sidebar by clicking the extension icon only
                let toggleAreaWrapper = s.opts.elm.buttons.toggleAreaOpen.parent("div");

                if (e.currentTarget.value === "icon") {
                    toggleAreaWrapper.addClass(s.opts.classes.hidden);
                } else {
                    toggleAreaWrapper.removeClass(s.opts.classes.hidden);
                }
            });

            s.opts.elm.buttons.keyboardShortcut.on("click", (e) => {
                e.preventDefault();
                let versionRaw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./); // @deprecated url of shortcut page has changed with Chrome 66 -> switch for older versions can be removed when min required version >= 66
                let version = versionRaw ? parseInt(versionRaw[2], 10) : null;

                chrome.tabs.create({
                    url: version >= 66 ? "chrome://extensions/shortcuts" : "chrome://extensions/configureCommands",
                    active: true
                });
            });
        };
    };

})(jsu);