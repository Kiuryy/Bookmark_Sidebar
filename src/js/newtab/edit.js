($ => {
    "use strict";

    window.EditHelper = function (n) {

        let editMode = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initEvents();

            $("<a />")
                .addClass(n.opts.classes.edit)
                .attr(n.opts.attr.pos, n.helper.model.getData("b/sidebarPosition"))
                .appendTo(n.opts.elm.body);

            if (location.href.search(/#edit$/) > -1) {
                enterEditMode();
            }
        };

        /**
         *
         * @returns {boolean}
         */
        this.isEditMode = () => editMode;

        /**
         * Initialises the eventhandlers
         */
        let initEvents = () => {
            n.opts.elm.body.on("click", "a." + n.opts.classes.edit, (e) => { // enter edit mode
                e.preventDefault();

                if (!editMode) {
                    enterEditMode();
                }
            }).on("click", "menu." + n.opts.classes.infoBar + " > a", (e) => { // save changes or leave edit mode
                e.preventDefault();
                let elm = $(e.currentTarget);

                if (elm.hasClass(n.opts.classes.cancel)) {
                    leaveEditMode();
                } else if (elm.hasClass(n.opts.classes.save)) {
                    saveChanges().then(() => {
                        leaveEditMode();
                    });
                }
            });
        };

        /**
         * Saves the changes which were made
         *
         * @returns {Promise}
         */
        let saveChanges = () => {
            return new Promise((resolve) => {
                let loadStartTime = +new Date();
                let loader = n.helper.template.loading().appendTo(n.opts.elm.body);
                n.opts.elm.body.addClass(n.opts.classes.loading);

                n.helper.model.setData({
                    "n/searchEngine": n.opts.elm.search.wrapper.children("select")[0].value,
                    "n/topPagesType": n.opts.elm.topPages.children("select")[0].value
                }).then(() => { // load at least 1s
                    return $.delay(Math.max(0, 1000 - (+new Date() - loadStartTime)));
                }).then(() => {
                    n.opts.elm.body.removeClass(n.opts.classes.loading);
                    loader.remove();
                    resolve();
                });
            });
        };

        /**
         * Removes all html markup which was used to edit the page
         */
        let leaveEditMode = () => {
            editMode = false;
            history.pushState({}, null, location.href.replace(/#edit/g, ""));
            n.opts.elm.body.removeClass(n.opts.classes.edit);

            n.opts.elm.search.wrapper.children("select").remove();
            n.opts.elm.topPages.children("select").remove();

            n.helper.search.updateSearchEngine(n.helper.model.getData("n/searchEngine"));
            n.helper.topPages.setType(n.helper.model.getData("n/topPagesType"));

            $.delay(500).then(() => {
                $("menu." + n.opts.classes.infoBar).remove();
            });
        };

        /**
         * Initialises the edit mode -> adds fields and submit button
         */
        let enterEditMode = () => {
            editMode = true;
            history.pushState({}, null, location.href.replace(/#edit/g, "") + "#edit");

            $("<menu />")
                .addClass(n.opts.classes.infoBar)
                .append("<a class='" + n.opts.classes.cancel + "'>" + n.helper.i18n.get("overlay_cancel") + "</a>")
                .append("<a class='" + n.opts.classes.save + "'>" + n.helper.i18n.get("settings_save") + "</a>")
                .appendTo(n.opts.elm.body);

            $.delay().then(() => {
                n.opts.elm.body.addClass(n.opts.classes.edit);
                initSearchEngineConfig();
                initTopPagesConfig();

                $.delay(500).then(() => {
                    $(window).trigger("resize");
                });
            });
        };

        /**
         * Initialises the dropdown for the top pages
         */
        let initTopPagesConfig = () => {
            let select = $("<select />").prependTo(n.opts.elm.topPages);
            let types = n.helper.topPages.getAllTypes();
            let currentType = n.helper.model.getData("n/topPagesType");

            Object.keys(types).forEach((name) => {
                let label = n.helper.i18n.get("newtab_top_pages_" + types[name]);
                $("<option value='" + name + "' " + (currentType === name ? "selected" : "") + " />").text(label).appendTo(select);
            });

            select.on("input change", (e) => {
                n.helper.topPages.setType(e.currentTarget.value);
            });
        };

        /**
         * Initialises the dropdown for the search engine
         */
        let initSearchEngineConfig = () => {
            let select = $("<select />").appendTo(n.opts.elm.search.wrapper);
            let searchEngines = n.helper.search.getSearchEngineList();
            let currentSearchEngine = n.helper.model.getData("n/searchEngine");

            Object.entries(searchEngines).forEach(([value, info]) => {
                $("<option value='" + value + "' " + (currentSearchEngine === value ? "selected" : "") + " />").text(info.name).appendTo(select);
            });

            select.on("input change", (e) => {
                n.helper.search.updateSearchEngine(e.currentTarget.value);
            });
        };

    };

})(jsu);