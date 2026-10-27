($ => {
    "use strict";

    $.TranslationsCategoryHelper = function (t) {

        let view = null;
        let list = null;
        let activeItem = null; // the entry which has been focussed most recently, stays set on blur, so the prev/next buttons can use it as starting point

        const minTextareaHeight = 70;

        /**
         * Initialises the buttons to jump between the empty fields
         */
        this.init = () => {
            view = $(`section.${$.cl.settings.translation.view}[${$.attr.name}='category']`);
            list = view.find(`ul.${$.cl.settings.translation.entries}`);

            view.find(`a.${$.cl.settings.translation["goto"]}`).forEach((elm) => {
                const button = $(elm);
                const dir = button.attr($.attr.value);

                button
                    .attr("title", t.helper.i18n.get("settings_translation_goto_" + (dir === "up" ? "prev" : "next")))
                    .on("click", (e) => {
                        e.preventDefault();
                        gotoEmptyEntry(dir);
                    });
            });
        };

        /**
         * Lists the language variables of the given category,
         * returns false if the category doesn't exist
         *
         * @param {string} lang
         * @param {string} category
         * @returns {Promise<boolean>}
         */
        this.render = async (lang, category) => {
            const entries = await t.helper.data.getEntries(lang, category);
            if (!entries) {
                return false;
            }

            const dir = t.helper.data.getDir(lang);
            const isDefaultLang = lang === t.helper.i18n.getDefaultLanguage();

            view.find(`strong.${$.cl.settings.translation.headline}`).text(category);
            view.find(`a.${$.cl.settings.translation.back}`).attr("href", t.getHash(lang)); // back to the categories of the language
            list.html("");
            activeItem = null;

            entries.forEach((entry) => {
                const item = $("<li></li>").appendTo(list);

                const original = $("<div></div>").addClass($.cl.settings.translation.original).appendTo(item);
                $("<span></span>").text(entry.original).appendTo(original);

                const varName = $("<footer></footer>").addClass($.cl.settings.translation.varName).appendTo(original);
                $("<label></label>").text(t.helper.i18n.get("settings_translation_variable_name")).appendTo(varName);
                entry.label.split(" - ").forEach((part) => {
                    $("<span></span>").text(part).appendTo(varName);
                });

                const textarea = $("<textarea></textarea>")
                    .attr("dir", dir)
                    .data({initial: entry.value, name: entry.name})
                    .appendTo(item);

                textarea[0].value = entry.value;
                initTextareaEvents(textarea);
            });

            const help = view.find(`p.${$.cl.settings.translation.help}`);
            if (isDefaultLang || entries.length === 0) { // the default language is edited by the author only, who doesn't need the explanation
                help.addClass($.cl.hidden);
            } else {
                const exampleLabel = $("<strong></strong>").text(entries[0].label)[0].outerHTML;
                help.html(t.helper.i18n.get("settings_translation_help", [exampleLabel]));
                help.removeClass($.cl.hidden);
            }

            return true;
        };

        /**
         * Adjusts the height of the fields and focusses the first empty one,
         * must be called after the view is visible, since the dimensions can't be determined otherwise
         */
        this.afterShow = () => {
            list.find("textarea").forEach((textarea) => {
                updateEntry($(textarea));
            });
            updateAmountInfo();

            const emptyEntry = list.children(`li.${$.cl.settings.translation.empty}`).eq(0);
            if (emptyEntry.length() > 0) {
                focusEntry(emptyEntry);
            }
        };

        /**
         * Returns all variables which have been changed by the user
         *
         * @returns {object}
         */
        this.getChangedVars = () => {
            const vars = {};

            list.find("textarea").forEach((textarea) => {
                const value = textarea.value.trim();
                const elm = $(textarea);

                if (value.length > 0 && value !== elm.data("initial")) { // clearing a translation is not possible, it would just be ignored
                    vars[elm.data("name")] = value;
                }
            });

            return vars;
        };

        /**
         * Returns whether there are changes which have not been submitted yet
         *
         * @returns {boolean}
         */
        this.hasUnsavedChanges = () => Object.keys(this.getChangedVars()).length > 0;

        /**
         * Removes the listed variables, e.g. after they have been submitted, so they don't count as unsaved changes anymore
         */
        this.clear = () => {
            list.html("");
            activeItem = null;
        };

        /**
         * Initialises the events for the given textarea
         *
         * @param {jsu} textarea
         */
        const initTextareaEvents = (textarea) => {
            textarea.on("input", () => {
                updateEntry(textarea);
                updateAmountInfo();
            }).on("focus", () => {
                activeItem = textarea.parent("li")[0];
            });
        };

        /**
         * Marks the entry of the given textarea as empty or filled and adjusts the height of the textarea to its content
         *
         * @param {jsu} textarea
         */
        const updateEntry = (textarea) => {
            const item = textarea.parent("li");

            if (textarea[0].value.trim().length > 0) {
                item.removeClass($.cl.settings.translation.empty);
            } else {
                item.addClass($.cl.settings.translation.empty);
            }

            textarea.css("height", "");
            textarea.css("height", Math.max(textarea[0].scrollHeight, minTextareaHeight) + "px");
        };

        /**
         * Updates the counter of the filled fields and shows the buttons to jump between the empty fields if there are any
         */
        const updateAmountInfo = () => {
            const total = list.children("li").length();
            const empty = list.children(`li.${$.cl.settings.translation.empty}`).length();

            view.find(`span.${$.cl.settings.translation.amountInfo}`).text((total - empty) + "\u2009/\u2009" + total);

            const buttons = view.find(`a.${$.cl.settings.translation["goto"]}`);
            if (empty > 0) {
                buttons.removeClass($.cl.hidden);
            } else {
                buttons.addClass($.cl.hidden);
            }
        };

        /**
         * Focusses the previous/next empty field, relative to the focussed one, continues at the other end of the list when reaching the end
         *
         * @param {string} dir "up" or "down"
         */
        const gotoEmptyEntry = (dir) => {
            const items = [];
            list.children("li").forEach((elm) => {
                items.push(elm);
            });

            const emptyItems = items.filter((elm) => elm.classList.contains($.cl.settings.translation.empty));
            if (emptyItems.length === 0) {
                return;
            }

            const activeIdx = items.indexOf(activeItem);
            let target;

            if (dir === "up") {
                const prev = emptyItems.filter((elm) => activeIdx !== -1 && items.indexOf(elm) < activeIdx);
                target = prev.length > 0 ? prev[prev.length - 1] : emptyItems[emptyItems.length - 1];
            } else {
                const next = emptyItems.filter((elm) => items.indexOf(elm) > activeIdx);
                target = next.length > 0 ? next[0] : emptyItems[0];
            }

            focusEntry($(target));
        };

        /**
         * Scrolls to the given entry and focusses its textarea
         *
         * @param {jsu} item
         */
        const focusEntry = (item) => {
            item[0].scrollIntoView({block: "center", behavior: "smooth"});
            item.children("textarea")[0].focus({preventScroll: true});
        };
    };

})(jsu);
