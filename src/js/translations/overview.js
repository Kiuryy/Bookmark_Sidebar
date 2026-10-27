($ => {
    "use strict";

    $.TranslationsOverviewHelper = function (t) {

        /**
         * Lists all languages with their translation progress, languages without a noteworthy progress are selectable via dropdown
         */
        this.render = () => {
            const wrapper = $(`section.${$.cl.settings.translation.view}[${$.attr.name}='overview'] div.${$.cl.settings.translation.languages}`).html("");
            const {listed, missing} = t.helper.data.getLanguageList();
            const currentLang = t.helper.i18n.getLanguage();

            listed.forEach((lang) => {
                const card = $("<a></a>")
                    .addClass("col")
                    .attr("href", t.getHash(lang.name))
                    .attr($.attr.settings.translation.language, lang.name)
                    .attr($.attr.settings.translation.releaseStatus, lang.status);

                if (lang.name === currentLang) {
                    card.addClass($.cl.settings.translation.mark);
                }

                $("<strong></strong>").text(lang.label).appendTo(card);
                $("<span></span>")
                    .addClass($.cl.settings.translation.status)
                    .attr("title", t.helper.i18n.get("settings_translation_status_" + lang.status))
                    .appendTo(card);
                t.getProgressBar(lang.percentage, lang.percentage + "%").appendTo(card);

                card.appendTo(wrapper);
            });

            if (missing.length > 0) {
                addLanguageSelect(wrapper, missing);
            }
        };

        /**
         * Adds a dropdown to start translating one of the given languages
         *
         * @param {jsu} wrapper
         * @param {Array} languages
         */
        const addLanguageSelect = (wrapper, languages) => {
            const card = $("<div></div>").addClass(["col", $.cl.settings.translation.select]);
            const select = $("<select></select>");

            $("<option value=''></option>").text(t.helper.i18n.get("settings_translation_add_language")).appendTo(select);
            languages.forEach((lang) => {
                $("<option></option>").attr("value", lang.name).text(lang.label).appendTo(select);
            });

            select.on("change", (e) => {
                if (e.currentTarget.value) {
                    location.hash = t.getHash(e.currentTarget.value);
                }
            });

            select.appendTo(card);
            card.appendTo(wrapper);
        };
    };

})(jsu);
