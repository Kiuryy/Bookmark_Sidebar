($ => {
    "use strict";

    /**
     * @param {object} n
     * @constructor
     */
    $.OverlayHelper = function (n) {

        let elements = {};

        /**
         * Creates a new overlay for the given type
         *
         * @param {string} type
         * @param {string} title
         */
        this.create = (type, title) => {
            elements = n.helper.template.overlay(type, title);
            elements.buttonWrapper.children("a." + $.cl.close).text(n.helper.i18n.get("overlay_close"));

            switch (type) {
                case "searchEngine": {
                    handleSearchEngineHtml();
                    break;
                }
            }

            initEvents();
        };

        /**
         * Performs the action of the current overlay
         */
        const performAction = () => {
            switch (elements.modal.attr($.attr.type)) {
                case "searchEngine": {
                    updateSearchEngine();
                    break;
                }
            }
        };

        /**
         * Closes the overlay
         */
        const closeOverlay = () => {
            n.helper.utility.triggerEvent("overlayClosed");
            elements.overlay.removeClass($.cl.page.visible);

            $.delay(400).then(() => {
                elements.overlay.remove();
            });
        };


        /**
         * Extends the overlay html for the search engine selection
         */
        const handleSearchEngineHtml = () => {
            const list = $("<ul />").appendTo(elements.modal);
            const searchEngines = n.helper.search.getSearchEngineList();
            const currentSearchEngine = n.helper.model.getData("n/searchEngine");

            Object.entries(searchEngines).forEach(([value, info]) => {
                const entry = $("<li />")
                    .append(n.helper.checkbox.get(elements.overlay.find("body"), {
                        [$.attr.name]: "searchEngine",
                        [$.attr.value]: value
                    }, "radio"))
                    .append("<a>" + info.name + "</a>")
                    .appendTo(list);

                if (currentSearchEngine === value) {
                    entry.find("input[" + $.attr.name + "='searchEngine'][" + $.attr.value + "='" + value + "']").parent("div." + $.cl.checkbox.box).trigger("click");
                }
            });


            $("<a />").addClass($.cl.overlay.action).text(n.helper.i18n.get("overlay_save")).appendTo(elements.buttonWrapper);
        };


        /**
         * Sets the selected search engine and closes the overlay
         */
        const updateSearchEngine = () => {
            let value = null;
            elements.modal.find("input[type='checkbox']").forEach((elm) => {
                if (elm.checked) {
                    value = $(elm).attr($.attr.value);
                    return false;
                }
            });

            n.helper.search.updateSearchEngine(value);
            closeOverlay();
        };


        /**
         * Initializes the events for the currently displayed overlay
         */
        const initEvents = () => {
            let clickstart = null;
            elements.overlay.find("body").on("mousedown", (e) => {
                clickstart = e.target;
            }).on("click", (e) => { // close overlay when click outside the modal
                if (e.target.tagName === "BODY" && clickstart.tagName === "BODY") {
                    closeOverlay();
                }
            });

            elements.modal.find("a." + $.cl.close).on("click", (e) => { // close overlay by close button
                e.preventDefault();
                closeOverlay();
            });

            elements.modal.on("click", "a", (e) => {
                e.preventDefault();
                const elmObj = $(e.currentTarget);
                const checkbox = elmObj.prev("div." + $.cl.checkbox.box);

                if (checkbox.length() > 0) {
                    checkbox.trigger("click");
                }

                if (elmObj.hasClass($.cl.overlay.action)) { // perform the action
                    performAction();
                }
            });
        };
    };

})(jsu);