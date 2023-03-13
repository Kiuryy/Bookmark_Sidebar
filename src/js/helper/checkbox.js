($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.CheckboxHelper = function (ext) {

        const clickedTimeout = {};

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
            const container = $("<div></div>")
                .html("<input type='checkbox' />")
                .data("uid", Math.random().toString(36).substring(2, 14))
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
                container.addClass($.cl.active);
            }

            this.initEvents(container, body);
            return container;
        };

        /**
         * Initializes the events for the checkbox
         */
        this.initEvents = (container, body) => {
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
        const triggerChangeEvent = (container, body) => {
            const checkbox = container.children("input[type='checkbox']");

            checkbox.trigger("change");
            if (ext.helper.utility) {
                ext.helper.utility.triggerEvent("checkboxChanged", {
                    container: container,
                    checkbox: checkbox,
                    checked: container.hasClass($.cl.active)
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
        const toggleChecked = (container, body) => {
            container.addClass($.cl.checkbox.clicked);
            container.removeClass($.cl.checkbox.focus);
            container.toggleClass($.cl.active);

            const isChecked = container.hasClass($.cl.active);
            const checkbox = container.children("input[type='checkbox']");

            if (container.attr($.attr.type) === "radio" && container.attr($.attr.name)) { // radio button -> allow only one to be checked with the same name
                if (body) {
                    const name = container.attr($.attr.name);
                    container.addClass($.cl.active);

                    if (isChecked) { // radio button was not checked before already -> trigger change event
                        checkbox.attr("checked", true);
                        triggerChangeEvent(container, body);
                    }

                    body.find("div." + $.cl.checkbox.box + "[" + $.attr.type + "='radio'][" + $.attr.name + "='" + name + "']").forEach((elm) => {
                        const elmObj = $(elm);
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

            const uid = container.data("uid");
            if (clickedTimeout[uid]) {
                clearTimeout(clickedTimeout[uid]);
            }

            clickedTimeout[uid] = setTimeout(() => {
                container.removeClass($.cl.checkbox.clicked);
            }, 300);
        };
    };

})(jsu);