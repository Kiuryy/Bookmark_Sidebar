($ => {
    "use strict";

    /**
     * @param {object} ext
     * @constructor
     */
    $.SelectionHelper = function (ext) {
        let selectedElements = {};

        /**
         * Enters selection mode -> allows clicking entries to select/delect them
         */
        this.start = () => {
            ext.elm.sidebar.addClass($.cl.sidebar.selectionMode);
            this.updateSidebarHeader();
            updateMarkup();
        };

        /**
         * Leave selection mode again
         */
        this.leave = () => {
            ext.elm.sidebar.removeClass($.cl.sidebar.selectionMode);
            selectedElements = [];
            updateMarkup();
            ext.helper.list.updateSidebarHeader();
        };

        /**
         * Returns the list of selected entries
         */
        this.getSelected = () => {
            return selectedElements;
        };

        /**
         * Resets the selection list
         */
        this.reset = () => {
            selectedElements = [];
            if (ext.elm.sidebar.hasClass($.cl.sidebar.selectionMode)) {
                this.updateSidebarHeader();
                updateMarkup();
            }
        };

        /**
         * Adds the given entry to the selection list
         *
         * @param id
         */
        this.select = (id) => {
            this.start();

            selectedElements[id] = true;
            this.updateSidebarHeader();
            updateMarkup();
        };

        /**
         * Removes the given entry from the selection list
         *
         * @param id
         */
        this.deselect = (id) => {
            if (selectedElements[id]) {
                delete selectedElements[id];
                this.updateSidebarHeader();
                updateMarkup();
            }
        };

        /**
         * Updates the sidebar header to display the accurate amount of selected entries
         */
        this.updateSidebarHeader = () => {
            ext.elm.header.text("");

            const selectedAmount = Object.keys(selectedElements).length;
            $("<h1></h1>")
                .html("<strong>" + selectedAmount + "</strong> <span>" + ext.helper.i18n.get("header_selected_entries") + "</span>")
                .attr("title", selectedAmount + " " + ext.helper.i18n.get("header_selected_entries", null, true))
                .appendTo(ext.elm.header);

            $("<a></a>").addClass($.cl.sidebar.removeSelected).appendTo(ext.elm.header);
            $("<a></a>").addClass($.cl.cancel).text(ext.helper.i18n.get("overlay_cancel")).appendTo(ext.elm.header);

        };

        /**
         * Updates the html markup to highlight the selected entries
         */
        const updateMarkup = () => {
            Object.values(ext.elm.bookmarkBox).some((box) => {
                if (box.hasClass($.cl.active)) {

                    box.find("a[" + $.attr.id + "]." + $.cl.selected).forEach((elm) => { // remove selection for all entries which are not in the list of selected entries
                        const elmObj = $(elm);
                        const id = $(elmObj).attr($.attr.id);
                        if (ext.helper.checkbox.isChecked(elmObj) && !selectedElements[id]) {
                            elmObj.find("div." + $.cl.checkbox.box).trigger("click");
                        }
                        elmObj.removeClass($.cl.selected);
                    });

                    Object.keys(selectedElements).forEach((id) => { // highlight the selected entries
                        const data = ext.helper.entry.getDataById(id);
                        const entry = box.find("a[" + $.attr.id + "='" + data.id + "']");

                        if (!ext.helper.checkbox.isChecked($(entry))) {
                            $(entry).find("div." + $.cl.checkbox.box).trigger("click");
                        }

                        entry.addClass($.cl.selected);
                    });

                    box.find("a[" + $.attr.id + "] div." + $.cl.checkbox.box);

                    return true;
                }
            });
        };
    };

})(jsu);