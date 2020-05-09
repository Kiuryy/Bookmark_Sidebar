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
            const scrollBox = $("<div></div>").addClass($.cl.scrollBox.wrapper).appendTo(elements.modal);

            const list = $("<ul></ul>").appendTo(scrollBox);
            const searchEngines = n.helper.search.getSearchEngineList();
            const currentSearchEngine = n.helper.search.getCurrentSearchEngine();

            Object.entries(searchEngines).forEach(([value, info]) => {
                const entry = $("<li></li>")
                    .append(n.helper.checkbox.get(elements.overlay.find("body"), {
                        [$.attr.name]: "searchEngine",
                        [$.attr.value]: value
                    }, "radio"))
                    .append("<a>" + info.name + "</a>")
                    .appendTo(list);

                if (info.favicon) {
                    $("<img />").attr("src", info.favicon).prependTo(entry.children("a"));
                }

                if (currentSearchEngine.name === value) {
                    entry.find("input[" + $.attr.name + "='searchEngine'][" + $.attr.value + "='" + value + "']").parent("div." + $.cl.checkbox.box).trigger("click");
                }
            });

            const customWrapper = $("<ul></ul>").attr($.attr.type, "custom").appendTo(scrollBox);

            if (currentSearchEngine.name === "custom") {
                customWrapper.addClass($.cl.visible);
            }

            $("<li></li>")
                .append("<label>" + n.helper.i18n.get("newtab_search_engine_custom_title") + "</label>")
                .append("<input type='text' name='title' value='" + currentSearchEngine.title.replace(/'/g, "&#x27;") + "' />")
                .appendTo(customWrapper);
            $("<li></li>")
                .append("<label>" + n.helper.i18n.get("newtab_search_engine_custom_url_homepage") + "</label>")
                .append("<input type='text' name='homepage' value='" + currentSearchEngine.homepage.replace(/'/g, "&#x27;") + "' placeholder='https://example.com' />")
                .appendTo(customWrapper);
            $("<li></li>")
                .append("<label>" + n.helper.i18n.get("newtab_search_engine_custom_url_results") + "</label>")
                .append("<input type='text' name='queryUrl' value='" + currentSearchEngine.queryUrl.replace(/'/g, "&#x27;") + "' placeholder='https://example.com/?q={1}' />")
                .appendTo(customWrapper);

            $("<a></a>").addClass($.cl.overlay.action).text(n.helper.i18n.get("overlay_save")).appendTo(elements.buttonWrapper);
        };

        /**
         * Returns the currently selectes search engine from the list
         *
         * @returns {string}
         */
        const getSelectedSearchEngine = () => {
            let value = null;
            elements.modal.find("input[type='checkbox']").forEach((elm) => {
                if (elm.checked) {
                    value = $(elm).attr($.attr.value);
                    return false;
                }
            });
            return value;
        };


        /**
         * Sets the selected search engine and closes the overlay
         */
        const updateSearchEngine = () => {
            const value = getSelectedSearchEngine();

            if (value) {
                n.helper.search.updateSearchEngine(value, {
                    title: elements.modal.find("input[name='title']")[0].value,
                    homepage: elements.modal.find("input[name='homepage']")[0].value,
                    queryUrl: elements.modal.find("input[name='queryUrl']")[0].value
                });
            }

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

            elements.modal.find("input[type='checkbox']").on("change", () => {
                $.delay().then(() => {
                    const customList = elements.modal.find("ul[" + $.attr.type + "='custom']");
                    if (getSelectedSearchEngine() === "custom") {
                        customList.addClass($.cl.visible);
                    } else {
                        customList.removeClass($.cl.visible);
                    }
                });
            });
        };
    };

})(jsu);