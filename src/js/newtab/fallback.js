($ => {
    "use strict";

    $.FallbackHelper = function (n) {

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            const url = new URL(location.href);
            const typeParam = url.searchParams.get("type");

            if (typeParam !== null) {
                n.elm.gridLinks.addClass($.cl.hidden);
                n.elm.fallbackInfo.addClass($.cl.active);

                initDescription(typeParam);
                initEvents(typeParam);
            }
        };

        /**
         * Initialises the eventhandlers
         *
         * @param {string} type
         */
        const initEvents = (type) => {
            n.elm.fallbackInfo.children("a").on("click", (e) => {
                e.preventDefault();
                let suggestionType = "general";

                switch (type) {
                    case "notWhitelisted":
                    case "blacklisted":
                        suggestionType = "filter";
                        break;
                }

                $.api.tabs.create({url: $.api.runtime.getURL("html/settings.html#support_error_" + suggestionType)});
            });
        };

        /**
         * Initialises the description texts
         *
         * @param {string} type
         */
        const initDescription = (type) => {
            const texts = {
                headline: "newtab_fallback_headline_general",
                desc: "newtab_fallback_desc",
                link: "more_link"
            };

            switch (type) {
                case "new_tab":
                case "system":
                case "extension_page":
                case "webstore":
                    texts.headline = "newtab_fallback_headline_" + type;
                    break;
                case "notWhitelisted":
                case "blacklisted":
                    texts.headline = "newtab_fallback_headline_url_filter";
                    break;
            }

            $("<h2></h2>").text(n.helper.i18n.get(texts.headline)).appendTo(n.elm.fallbackInfo);
            $("<p></p>").text(n.helper.i18n.get(texts.desc)).appendTo(n.elm.fallbackInfo);
            $("<a></a>").text(n.helper.i18n.get(texts.link)).appendTo(n.elm.fallbackInfo);
        };

    };

})(jsu);