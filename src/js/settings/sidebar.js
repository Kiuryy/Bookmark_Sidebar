($ => {
    "use strict";

    $.SidebarHelper = function (s) {

        /**
         * Initialises the behaviour settings
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();
            initToggleAreaEvents();
            initToggleAreaFields();
            initFilter();

            ["overlayEnabled", "dirAccordion", "preventPageScroll", "preventWindowed", "tooltipAdditionalInfo", "rememberOpenStatesSubDirectories"].forEach((field) => { // checkbox
                if (s.helper.model.getData("b/" + field) === true) {
                    s.elm.checkbox[field].trigger("click");
                }
                s.elm.checkbox[field].children("input").trigger("change");
            });

            s.elm.select.language[0].value = s.helper.i18n.getLanguage();

            ["visibility", "iconAction", "openAction", "sidebarPosition", "linkAction", "rememberState", "newTab", "newTabPosition", "tooltipContent"].forEach((field) => { // select
                s.elm.select[field][0].value = s.helper.model.getData("b/" + field);
                s.elm.select[field].trigger("change");
            });

            ["openDelay", "scrollBarHide", "closeTimeout", "tooltipDelay"].forEach((field) => { // range
                const val = s.helper.model.getData("b/" + field);

                if (val === -1) {
                    const checkbox = s.elm.range[field].data("infinityCheckbox");
                    if (checkbox && checkbox.length() > 0) {
                        checkbox.trigger("click");
                    }
                }

                s.elm.range[field][0].value = val;
                s.elm.range[field].trigger("change");
            });

            const path = s.helper.menu.getPath();
            if (path[0] === "sidebar") {
                loadPreviewVideos();
            }
        };

        /**
         * Save the behaviour settings and the user language
         *
         * @returns {Promise}
         */
        this.save = async () => {
            const conf = await $.api.storage.sync.get(["behaviour", "language"]);
            conf.behaviour = conf.behaviour || {};
            conf.behaviour.toggleArea = {};
            conf.behaviour.blacklist = [];
            conf.behaviour.whitelist = [];

            ["width", "height", "top", "widthWindowed"].forEach((field) => {
                conf.behaviour.toggleArea[field] = s.elm.range["toggleArea_" + field][0].value;
            });

            ["visibility", "iconAction", "openAction", "sidebarPosition", "linkAction", "rememberState", "newTab", "newTabPosition", "tooltipContent"].forEach((field) => { // select
                conf.behaviour[field] = s.elm.select[field][0].value;
            });

            ["openDelay", "scrollBarHide", "closeTimeout", "tooltipDelay"].forEach((field) => { // range
                let val = -1;

                if (s.elm.range[field].hasClass($.cl.settings.inactive) === false) { // if inactive set -1 as value else use the selected value
                    val = s.elm.range[field][0].value;
                }

                conf.behaviour[field] = val;
            });

            ["overlayEnabled", "dirAccordion", "preventPageScroll", "preventWindowed", "tooltipAdditionalInfo", "rememberOpenStatesSubDirectories"].forEach((field) => { // checkbox
                conf.behaviour[field] = s.helper.checkbox.isChecked(s.elm.checkbox[field]);
            });

            if (conf.behaviour.visibility === "blacklist" || conf.behaviour.visibility === "whitelist") {
                const rules = s.elm.textarea.visibilityFilter[0].value;
                conf.behaviour[conf.behaviour.visibility] = rules.split(/\n+/).filter(rule => rule.trim() !== "");

                if (conf.behaviour[conf.behaviour.visibility].length === 0) {
                    conf.behaviour.visibility = "always";
                }
            }

            let lang = s.elm.select.language[0].value;
            if (lang === s.helper.i18n.getUILanguage()) {
                lang = "default";
            }

            await $.api.storage.sync.set({
                behaviour: conf.behaviour,
                language: lang
            });

            if (!(conf && conf.language && conf.language === lang)) {
                $.delay(2000).then(() => {
                    location.reload(true);
                });
            }
        };

        /**
         * Initialises the filter to allow specified control over where to load the sidebar (or where not to)
         */
        const initFilter = () => {
            s.elm.textarea.visibilityFilter.attr("placeholder", "example.com/*\n*.example.com/*");

            s.elm.sidebar.filterOptions.find("> div > ul > li").forEach((elm) => { // highlight [*] in the explanations
                const text = $(elm).text();
                $(elm).html(text.replace(/(?<!\/)\*/g, "<em>*</em>"));
            });

            s.elm.select.visibility.on("change", (e) => {
                const val = e.currentTarget.value;

                if (val === "always") { // always show sidebar -> don't show url rules
                    s.elm.sidebar.filterOptions.addClass($.cl.hidden);
                } else if (val === "blacklist" || val === "whitelist") { // show url rules
                    s.elm.sidebar.filterOptions.removeClass($.cl.hidden);

                    if (s.elm.textarea.visibilityFilter[0].value.length === 0) { // fill with the already set rules, if the field is empty
                        const rules = s.helper.model.getData("b/" + val);
                        s.elm.textarea.visibilityFilter[0].value = rules.join("\n");
                    }
                }
            });
        };

        /**
         * Initialises the toggleArea sliders
         */
        const initToggleAreaFields = () => {
            const toggleArea = s.helper.model.getData("b/toggleArea");

            ["width", "height", "top", "widthWindowed"].forEach((field) => {
                s.elm.range["toggleArea_" + field][0].value = toggleArea[field];
                s.elm.range["toggleArea_" + field].trigger("change");
            });
        };

        /**
         * Initialises the eventhandlers for the toggleArea box
         *
         * @returns {Promise}
         */
        const initToggleAreaEvents = async () => {
            const previewWrapper = s.elm.sidebar.toggleArea.children("div[" + $.attr.type + "='preview']");
            const preview = previewWrapper.children("div");

            $([s.elm.range.toggleArea_width, s.elm.range.toggleArea_height, s.elm.range.toggleArea_top]).on("change input", (e) => {
                const minWidth = 19;

                const val = {
                    width: +s.elm.range.toggleArea_width[0].value,
                    height: +s.elm.range.toggleArea_height[0].value,
                    top: +s.elm.range.toggleArea_top[0].value
                };

                if (val.height + val.top > 100) {
                    let topVal = null;

                    if (e.currentTarget === s.elm.range.toggleArea_height[0]) {
                        topVal = val.top - (val.height + val.top - 100);
                    } else if (e.currentTarget === s.elm.range.toggleArea_top[0]) {
                        topVal = 100 - val.height;
                    }

                    if (topVal !== null) {
                        s.elm.range.toggleArea_top[0].value = topVal;
                        s.elm.range.toggleArea_top.trigger("change");
                    }
                } else {
                    previewWrapper.css("width", (minWidth + val.width) + "px");
                    preview.css({
                        height: (val.height) + "%",
                        top: val.top + "%"
                    });

                    if (val.height === 100) {
                        preview.addClass($.cl.settings.toggleArea.fullHeight);
                    } else {
                        preview.removeClass($.cl.settings.toggleArea.fullHeight);
                    }
                }
            });

            preview.on("mousedown", (e) => { // drag start
                preview.addClass([$.cl.settings.toggleArea.dragged, $.cl.settings.toggleArea.dragging]);
                preview.data("pos", {start: preview[0].offsetTop, y: e.pageY});
            });

            s.elm.body.on("mouseup", async () => { // drag end
                await $.delay(0);
                preview.removeClass($.cl.settings.toggleArea.dragging);
            }).on("mousemove", (e) => { // drag move
                if (preview.hasClass($.cl.settings.toggleArea.dragging) && e.buttons === 1) {
                    const pos = preview.data("pos");
                    s.elm.range.toggleArea_top[0].value = ((pos.start + e.pageY - pos.y) / previewWrapper[0].offsetHeight) * 100;
                    s.elm.range.toggleArea_top.trigger("change");
                }
            }, {passive: true});
        };

        /**
         * Start playing the preview videos in a loop
         */
        const loadPreviewVideos = () => {
            s.elm.sidebar.previewVideos.forEach((video) => {
                video.controls = false;
                video.loop = true;
                video.muted = true;
                video.play();
            });
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        const initEvents = async () => {
            const indicatorMenuPoint = s.elm.aside.find("li[" + $.attr.name + "='indicator']");

            $(document).on($.opts.events.pageChanged, (e) => {
                if (e.detail.path && e.detail.path[0] === "sidebar") {
                    loadPreviewVideos();
                }
            });

            s.elm.sidebar.previewVideos.parent().on("click", (e) => {
                e.preventDefault();
                const type = $(e.currentTarget).attr($.attr.type);
                if (type && $(e.currentTarget).children("span").length() > 0) {
                    location.hash = "sidebar_" + type;
                }
            });

            s.elm.checkbox.overlayEnabled.children("input[type='checkbox']").on("change", () => {
                const hideableBoxes = s.elm.sidebar.overlayContent.find("div." + $.cl.settings.hideable);

                if (s.helper.checkbox.isChecked(s.elm.checkbox.overlayEnabled)) {
                    indicatorMenuPoint.removeClass($.cl.hidden);
                    hideableBoxes.removeClass($.cl.hidden);
                    s.elm.sidebar.previewVideoOverlay.removeClass($.cl.disabled);
                    s.elm.select.openAction.trigger("change");
                } else {
                    indicatorMenuPoint.addClass($.cl.hidden);
                    hideableBoxes.addClass($.cl.hidden);
                    s.elm.sidebar.previewVideoOverlay.addClass($.cl.disabled);
                    s.elm.select.iconAction[0].value = "sidepanel";
                }
                enableDisableIconAction();
            });

            s.elm.select.sidebarPosition.on("change", (e) => {
                s.elm.sidebar.toggleArea.attr($.attr.type, e.currentTarget.value);
            });

            s.elm.select.openAction.on("change", (e) => {
                if (!s.helper.checkbox.isChecked(s.elm.checkbox.overlayEnabled)) {
                    return;
                }

                // hide menupoint for changing the appearance of the indicator if it is not visible at all
                if (e.currentTarget.value === "contextmenu" || e.currentTarget.value === "mousedown") {
                    indicatorMenuPoint.removeClass($.cl.hidden);
                } else {
                    indicatorMenuPoint.addClass($.cl.hidden);
                }

                // hide the "configure area" box when user wants to open the sidebar by clicking the extension icon only
                if (e.currentTarget.value === "icon") {
                    s.elm.sidebar.toggleArea.addClass($.cl.hidden);
                    s.elm.select.iconAction[0].value = "overlay";
                } else {
                    s.elm.sidebar.toggleArea.removeClass($.cl.hidden);
                }
                enableDisableIconAction();
            });

            s.elm.select.rememberState.on("change", (e) => { // toggle the checkbox to configure whether to remember opened subdirectories, too (won't be displayed when user select to remember nothing)
                if (e.currentTarget.value === "nothing") {
                    s.elm.sidebar.rememberOpenStatesSubDirectories.addClass($.cl.hidden);
                } else {
                    s.elm.sidebar.rememberOpenStatesSubDirectories.removeClass($.cl.hidden);
                }
            });

            s.elm.buttons.keyboardShortcut.on("click", (e) => {
                e.preventDefault();
                s.helper.model.call("openLink", {
                    href: "chrome://extensions/shortcuts",
                    newTab: true,
                    active: true
                });
            });

            s.elm.buttons.sidepanelSettings.on("click", (e) => {
                e.preventDefault();
                s.helper.model.call("openLink", {
                    href: "chrome://settings/appearance#:~:text=Side%20panel",
                    newTab: true,
                    active: true
                });
            });
        };

        /**
         * Enable or Disable the ability to change the value of the field "iconAction" based on what is configured
         */
        const enableDisableIconAction = () => {
            const openAction = s.elm.select.openAction[0].value;
            const overlayEnabled = s.helper.checkbox.isChecked(s.elm.checkbox.overlayEnabled);

            if (openAction === "icon" || !overlayEnabled) {
                s.elm.select.iconAction.attr("disabled", "disabled").trigger("change");
            } else {
                s.elm.select.iconAction.removeAttr("disabled");
            }
        };
    };

})(jsu);