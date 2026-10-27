($ => {
    "use strict";

    $.SettingsTriggerAreaHelper = function (s) {

        const previewFields = {
            range: ["triggerWidth", "triggerWidthWindowed", "triggerHeight", "triggerOffsetTop", "indicatorWidth", "indicatorIconSize"],
            color: ["indicatorColor", "indicatorIconColor"]
        };

        const elm = {};
        let hideTriggerAreaTimeout = null;

        /**
         * Binds the events to update the preview of the trigger area and to drag the trigger area vertically in the preview
         */
        this.init = () => {
            const wrapper = $(".trigger-area-preview > div");
            elm.wrapper = wrapper;
            elm.indicator = wrapper.children("div.indicator");
            elm.triggerArea = wrapper.children("div.trigger-area");

            Object.entries(previewFields).forEach(([type, names]) => {
                names.forEach((name) => {
                    s.helper.form.elements[type][name].on("change input", (e) => {
                        handleFieldChange(name, e.currentTarget);
                    });
                });
            });

            s.helper.form.elements.select.openAction.on("change", (e) => {
                handleOpenActionChange(e.currentTarget.value);
            });

            initDragEvents();
        };

        /**
         * Brings the page into the state matching the stored open action
         */
        this.applyInitialState = () => {
            s.helper.form.elements.select.openAction.trigger("change");
        };

        /**
         * Returns the current values of the fields shown in the preview
         *
         * @returns {object}
         */
        const getValues = () => {
            const range = s.helper.form.elements.range;
            const color = s.helper.form.elements.color;

            return {
                triggerWidth: +range.triggerWidth[0].value,
                triggerHeight: +range.triggerHeight[0].value,
                triggerOffsetTop: +range.triggerOffsetTop[0].value,
                indicatorWidth: +range.indicatorWidth[0].value,
                indicatorIconSize: +range.indicatorIconSize[0].value,
                indicatorColor: color.indicatorColor[0].value,
                indicatorIconColor: color.indicatorIconColor[0].value,
                hasIndicator: s.helper.form.elements.select.openAction[0].value !== "mousemove" // the indicator is not shown when opening the sidebar via mouseover
            };
        };

        /**
         * Updates the preview after the given field was changed,
         * the trigger area is highlighted for a moment when changing one of its values
         *
         * @param {string} name
         * @param {Element} field
         */
        const handleFieldChange = (name, field) => {
            const val = getValues();
            const range = s.helper.form.elements.range;

            if (hideTriggerAreaTimeout) {
                clearTimeout(hideTriggerAreaTimeout);
                hideTriggerAreaTimeout = null;
            }

            if (!val.hasIndicator || val.indicatorWidth === 0) {
                elm.triggerArea.addClass($.cl.visible);
            } else if (name.startsWith("indicator")) {
                elm.triggerArea.removeClass($.cl.visible);
            } else if (name.startsWith("trigger")) {
                elm.triggerArea.addClass($.cl.visible);
                hideTriggerAreaTimeout = setTimeout(() => {
                    elm.triggerArea.removeClass($.cl.visible);
                }, 2000);
            }

            if (val.triggerHeight + val.triggerOffsetTop > 100) { // the trigger area would exceed the bottom -> correct the offset (which will call this method again)
                if (field === range.triggerHeight[0]) {
                    s.helper.form.setValue("range", "triggerOffsetTop", val.triggerOffsetTop - (val.triggerHeight + val.triggerOffsetTop - 100));
                } else if (field === range.triggerOffsetTop[0]) {
                    s.helper.form.setValue("range", "triggerOffsetTop", 100 - val.triggerHeight);
                }
                return;
            }

            updatePreview(val);
        };

        /**
         * Updates the dimensions and colors of the preview
         *
         * @param {object} val
         */
        const updatePreview = (val) => {
            elm.wrapper.css("width", (val.hasIndicator ? Math.max(val.indicatorWidth, val.triggerWidth) : val.triggerWidth) + "px");
            elm.indicator.css({
                backgroundColor: val.indicatorColor,
                width: val.indicatorWidth + "px",
                height: val.triggerHeight + "%",
                top: val.triggerOffsetTop + "%"
            });
            elm.indicator.children("span").css({
                maskSize: val.indicatorIconSize + "px",
                backgroundColor: val.indicatorIconColor
            });
            elm.triggerArea.css({
                width: val.triggerWidth + "px",
                height: val.triggerHeight + "%",
                top: val.triggerOffsetTop + "%"
            });

            s.setConditionalClass(elm.wrapper, $.cl.settings.triggerArea.fullHeight, val.triggerHeight === 100);
        };

        /**
         * Hides the indicator options and the indicator in the preview when opening the sidebar via mouseover,
         * and the whole trigger area configuration when opening it via the extension icon
         *
         * @param {string} openAction
         */
        const handleOpenActionChange = (openAction) => {
            const isIcon = openAction === "icon";
            const openActionCol = s.helper.form.elements.select.openAction[0].closest("div.col");

            $("section.trigger-area aside.trigger-area-preview, section.trigger-area div.cols > div.col:not(.indicator-options)").forEach((col) => {
                s.setConditionalClass($(col), $.cl.hidden, isIcon && col !== openActionCol);
            });

            const hideIndicator = isIcon || openAction === "mousemove";
            s.setConditionalClass($("section.trigger-area div.col.indicator-options"), $.cl.hidden, hideIndicator);
            s.setConditionalClass(elm.indicator, $.cl.hidden, hideIndicator);

            s.helper.form.elements.range.indicatorWidth.trigger("change"); // update the preview without flashing the trigger area
        };

        /**
         * Allows changing the top offset by dragging the indicator or the trigger area in the preview
         */
        const initDragEvents = () => {
            [elm.indicator, elm.triggerArea].forEach((draggable) => {
                draggable.on("mousedown", (e) => { // drag start
                    draggable.addClass([$.cl.settings.triggerArea.dragged, $.cl.settings.triggerArea.dragging]);
                    draggable.data("pos", {start: draggable[0].offsetTop, y: e.pageY});
                });

                $("body").on("mouseup", async () => { // drag end
                    await $.delay(0);
                    draggable.removeClass($.cl.settings.triggerArea.dragging);
                }).on("mousemove", (e) => { // drag move
                    if (draggable.hasClass($.cl.settings.triggerArea.dragging) && e.buttons === 1) {
                        const pos = draggable.data("pos");
                        s.helper.form.setValue("range", "triggerOffsetTop", ((pos.start + e.pageY - pos.y) / elm.wrapper[0].offsetHeight) * 100);
                    }
                }, {passive: true});
            });
        };
    };

})(jsu);
