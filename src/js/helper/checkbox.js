($ => {
    "use strict";

    window.CheckboxHelper = function (ext) {

        let clickedTimeout = null;

        /**
         * Creates a new checkbox in the given document context and returns the created container
         *
         * @param {jsu} body
         * @param {object} attrList
         * @returns {jsu}
         */
        this.get = (body, attrList) => {
            let container = $("<div />").data("contextBody", body).html("<input type='checkbox' />").addClass(ext.opts.classes.checkbox.box);

            if (typeof attrList !== "undefined") {
                container.children("input[type='checkbox']").attr(attrList);
            }

            if (container.children("input[type='checkbox']")[0].checked) {
                container.addClass(ext.opts.classes.checkbox.active);
            }

            initEvents(container);
            return container;
        };

        /**
         * Initializes the events for the checkbox
         */
        let initEvents = (container) => {
            container.on("mousedown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                $(e.currentTarget).addClass(ext.opts.classes.checkbox.focus);
            }).on("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                let _self = $(e.currentTarget);
                _self.addClass(ext.opts.classes.checkbox.clicked);
                _self.removeClass(ext.opts.classes.checkbox.focus);
                _self.toggleClass(ext.opts.classes.checkbox.active);

                let isChecked = _self.hasClass(ext.opts.classes.checkbox.active)
                _self.children("input[type='checkbox']").attr('checked', isChecked);

                if (clickedTimeout) {
                    clearTimeout(clickedTimeout);
                }

                clickedTimeout = setTimeout(() => {
                    _self.removeClass(ext.opts.classes.checkbox.clicked);
                }, 300);
            });

            container.data("contextBody").on("click", (e) => {
                container.removeClass(ext.opts.classes.checkbox.focus);
            });
        };
    };

})(jsu);