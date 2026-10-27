($ => {
    "use strict";

    $.TranslationsLanguageHelper = function (t) {

        let view = null;
        let reminderCheckbox = null;
        let currentLang = null;

        /**
         * Adds the checkbox to enable the notification about new language variables
         */
        this.init = () => {
            view = $(`section.${$.cl.settings.translation.view}[${$.attr.name}='language']`);
            const reminder = view.find(`div.${$.cl.settings.translation.reminder}`);

            reminderCheckbox = t.helper.checkbox.get($("body")).prependTo(reminder);
            reminderCheckbox.children("input").on("change", async () => {
                if (currentLang) {
                    await t.helper.data.setReminder(currentLang, t.helper.checkbox.isChecked(reminderCheckbox));
                    t.showMessage("saved_message", "success");
                }
            });

            reminder.children("label").on("click", (e) => { // clicking the text toggles the checkbox as well
                e.preventDefault();
                reminderCheckbox.trigger("click");
            });
        };

        /**
         * Lists the categories of the given language with their translation progress,
         * returns false if the translation service doesn't know the language
         *
         * @param {string} lang
         * @returns {Promise<boolean>}
         */
        this.render = async (lang) => {
            const categories = await t.helper.data.getCategories(lang);
            if (!categories) {
                return false;
            }

            currentLang = lang;
            view.find(`span.${$.cl.settings.translation.headline}`).text(t.helper.data.getLabel(lang));
            setReminderState(t.helper.data.isReminderEnabled(lang));

            const wrapper = view.find(`div.${$.cl.settings.translation.categories}`).html("");

            categories.forEach((category) => {
                const card = $("<a></a>")
                    .addClass("col")
                    .attr("href", t.getHash(lang, category.name));

                if (category.filled < category.total) {
                    card.addClass($.cl.settings.incomplete);
                }

                $("<strong></strong>").text(category.name).appendTo(card);

                if (category.required) {
                    $("<span></span>")
                        .addClass($.cl.settings.translation.required)
                        .text(t.helper.i18n.get("settings_translation_required_category"))
                        .appendTo(card);
                }

                const percentage = category.total > 0 ? Math.floor(category.filled / category.total * 100) : 100;
                t.getProgressBar(percentage, category.filled + "\u2009/\u2009" + category.total).appendTo(card);

                card.appendTo(wrapper);
            });

            return true;
        };

        /**
         * Updates the reminder checkbox without triggering its change event
         *
         * @param {boolean} checked
         */
        const setReminderState = (checked) => {
            reminderCheckbox.children("input")[0].checked = checked;
            if (checked) {
                reminderCheckbox.addClass($.cl.active);
            } else {
                reminderCheckbox.removeClass($.cl.active);
            }
        };
    };

})(jsu);
