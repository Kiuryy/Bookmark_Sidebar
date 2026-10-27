($ => {
    "use strict";

    $.SettingsTabsHelper = function () {

        /**
         * Binds the events of the tab navigation and opens the tab matching the url hash, or the first tab otherwise
         */
        this.init = () => {
            $("menu#tabs a").on("click", (e) => {
                e.preventDefault();
                show($(e.currentTarget));
            });

            if (!this.open(location.hash.slice(1))) { // no hash or not the name of a tab (e.g. the name of a dialog, which is opened in run())
                show($("menu#tabs li:first-child > a"));
            }
        };

        /**
         * Opens the tab with the given name
         *
         * @param {string} name
         * @returns {boolean} false if there is no tab with the given name
         */
        this.open = (name) => {
            const tabLink = $(`menu#tabs li[${$.attr.name}="${name}"] > a`);
            if (!name || tabLink.length() === 0) {
                return false;
            }

            show(tabLink);
            return true;
        };

        /**
         * Marks the given link of the navigation as active and shows the matching tab,
         * the name of the tab is reflected in the url hash and in the data-tab attribute of the body
         *
         * @param {jsu} tabLink
         */
        const show = (tabLink) => {
            const name = tabLink.parent().attr($.attr.name);

            $(`menu#tabs a.${$.cl.active}`).removeClass($.cl.active);
            tabLink.addClass($.cl.active);

            $(`section.tab.${$.cl.active}`).removeClass($.cl.active);
            $(`section.tab[${$.attr.name}="${name}"]`).addClass($.cl.active);

            location.hash = name;
            $("html")[0].scrollTop = 0;
            $("body").attr("data-tab", name);
        };
    };

})(jsu);
