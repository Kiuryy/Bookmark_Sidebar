($ => {
    "use strict";

    window.CheckboxHelper = function (ext) {

        let clickedTimeout = {};

        /**
         * Creates a new checkbox in the given document context and returns the created container
         *
         * @param {jsu} body
         * @param {object} attrList
         * @param {string} style
         * @returns {jsu}
         */
        this.get = (body, attrList, style = "checkbox") => {
            let container = $("<div />")
                .html("<input type='checkbox' />")
                .data("uid", Math.random().toString(36).substr(2, 12))
                .attr(ext.opts.attr.type, style)
                .addClass(ext.opts.classes.checkbox.box);

            if (typeof attrList !== "undefined") {
                container.children("input[type='checkbox']").attr(attrList);
                if (attrList[ext.opts.attr.name]) {
                    container.attr(ext.opts.attr.name, attrList[ext.opts.attr.name]);
                }
            }

            if (this.isChecked(container)) {
                container.addClass(ext.opts.classes.checkbox.active);
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
            if (ext.opts.events && ext.opts.events.checkboxChanged) {
                ext.helper.utility.triggerEvent("checkboxChanged", {
                    container: container,
                    checkbox: checkbox,
                    checked: container.hasClass(ext.opts.classes.checkbox.active)
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
            container.addClass(ext.opts.classes.checkbox.clicked);
            container.removeClass(ext.opts.classes.checkbox.focus);
            container.toggleClass(ext.opts.classes.checkbox.active);

            let isChecked = container.hasClass(ext.opts.classes.checkbox.active);
            let checkbox = container.children("input[type='checkbox']");

            if (container.attr(ext.opts.attr.type) === "radio" && container.attr(ext.opts.attr.name)) { // radio button -> allow only one to be checked with the same name
                if (body) {
                    let name = container.attr(ext.opts.attr.name);
                    container.addClass(ext.opts.classes.checkbox.active);

                    if (isChecked) { // radio button was not checked before already -> trigger change event
                        checkbox.attr('checked', true);
                        triggerChangeEvent(container, body);
                    }

                    body.find("div." + ext.opts.classes.checkbox.box + "[" + ext.opts.attr.type + "='radio'][" + ext.opts.attr.name + "='" + name + "']").forEach((elm) => {
                        let elmObj = $(elm);
                        if (elm !== container[0] && this.isChecked(elmObj)) { // uncheck all other radio buttons with this name
                            toggleChecked(elmObj);
                        }
                    });
                } else {
                    checkbox.attr('checked', false);
                }
            } else {
                checkbox.attr('checked', isChecked);
                triggerChangeEvent(container, body);
            }

            let uid = container.data("uid");
            if (clickedTimeout[uid]) {
                clearTimeout(clickedTimeout[uid]);
            }

            clickedTimeout[uid] = setTimeout(() => {
                container.removeClass(ext.opts.classes.checkbox.clicked);
            }, 300);
        };

        /**
         * Initializes the events for the checkbox
         */
        let initEvents = (container, body) => {
            container.on("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                $(e.currentTarget).addClass(ext.opts.classes.checkbox.focus);
            }).on("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleChecked($(e.currentTarget), body);
            });

            body.on("click", () => {
                container.removeClass(ext.opts.classes.checkbox.focus);
            });
        };
    };

})(jsu);