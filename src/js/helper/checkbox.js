($ => {
    "use strict";

    /**
     * @requires helper: (optional) utility
     * @param {object} ext
     * @constructor
     */
    $.CheckboxHelper = function (ext) {

        let clickedTimeout = {};

        /**
         * Creates a new checkbox in the given document context and returns the created container
         *
         * @param {jsu} body
         * @param {object} attrList
         * @param {string} type
         * @param {string} style
         * @returns {jsu}
         */
        this.get = (body, attrList, type = "checkbox", style = "default") => {
            let container = $("<div />")
                .html("<input type='checkbox' />")
                .data("uid", Math.random().toString(36).substr(2, 12))
                .attr($.attr.type, type)
                .attr($.attr.style, style)
                .addClass($.cl.checkbox.box);

            if (attrList) {
                container.children("input[type='checkbox']").attr(attrList);
                if (attrList[$.attr.name]) {
                    container.attr($.attr.name, attrList[$.attr.name]);
                }
            }

            if (this.isChecked(container)) {
                container.addClass($.cl.general.active);
            }

            initEvents(container, body);
            return container;
        };

        /**
         * Returns whether the checkbox is checked or not
         *
         * @param {jsu} container
         * @returns {boolean}
         */
        this.isChecked = (container) => {
            return container.find("input[type='checkbox']")[0].checked;
        };

        /**
         * Triggers a change event for the checkbox and a global event
         *
         * @param {jsu} container
         * @param {jsu} body
         */
        let triggerChangeEvent = (container, body) => {
            let checkbox = container.children("input[type='checkbox']");

            checkbox.trigger("change");
            if (ext.helper.utility) {
                ext.helper.utility.triggerEvent("checkboxChanged", {
                    container: container,
                    checkbox: checkbox,
                    checked: container.hasClass($.cl.general.active)
                }, body.document()[0]);
            }
        };

        /**
         * Toggles the given checkbox,
         * if it has the type 'radio' uncheck every other checkbox with the same name
         *
         * @param {jsu} container
         * @param {jsu} body
         */
        let toggleChecked = (container, body) => {
            container.addClass($.cl.checkbox.clicked);
            container.removeClass($.cl.checkbox.focus);
            container.toggleClass($.cl.general.active);

            let isChecked = container.hasClass($.cl.general.active);
            let checkbox = container.children("input[type='checkbox']");

            if (container.attr($.attr.type) === "radio" && container.attr($.attr.name)) { // radio button -> allow only one to be checked with the same name
                if (body) {
                    let name = container.attr($.attr.name);
                    container.addClass($.cl.general.active);

                    if (isChecked) { // radio button was not checked before already -> trigger change event
                        checkbox.attr("checked", true);
                        triggerChangeEvent(container, body);
                    }

                    body.find("div." + $.cl.checkbox.box + "[" + $.attr.type + "='radio'][" + $.attr.name + "='" + name + "']").forEach((elm) => {
                        let elmObj = $(elm);
                        if (elm !== container[0] && this.isChecked(elmObj)) { // uncheck all other radio buttons with this name
                            toggleChecked(elmObj);
                        }
                    });
                } else {
                    checkbox.attr("checked", false);
                }
            } else {
                checkbox.attr("checked", isChecked);
                triggerChangeEvent(container, body);
            }

            let uid = container.data("uid");
            if (clickedTimeout[uid]) {
                clearTimeout(clickedTimeout[uid]);
            }

            clickedTimeout[uid] = setTimeout(() => {
                container.removeClass($.cl.checkbox.clicked);
            }, 300);
        };

        /**
         * Initializes the events for the checkbox
         */
        let initEvents = (container, body) => {
            container.on("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                $(e.currentTarget).addClass($.cl.checkbox.focus);
            }).on("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleChecked($(e.currentTarget), body);
            });

            body.on("click", () => {
                container.removeClass($.cl.checkbox.focus);
            });
        };
    };

})(jsu);