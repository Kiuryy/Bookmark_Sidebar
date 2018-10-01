($ => {
    "use strict";

    $.TranslationHelper = function (s) {

        let languages = {};

        const langvarsCache = {};
        const varsAmount = {};
        const thanksLimit = 30;

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                initLanguages().then(() => {
                    initEvents();

                    if (s.serviceAvailable) {
                        initOverview().then(() => {
                            initOverviewEvents();
                            initFormEvents();

                            const path = s.helper.menu.getPath();
                            if (path && path[1] === "translate") {
                                gotoOverview();
                            }
                        });
                    } else {
                        showUnavailableText();
                    }

                    resolve();
                });
            });
        };

        /**
         *
         * @returns {Promise}
         */
        this.submit = () => {
            return new Promise((resolve) => {
                const lang = s.elm.translation.langvars.data("lang");

                if (lang) {
                    const loadStartTime = +new Date();
                    const loader = s.helper.template.loading().appendTo(s.elm.body);
                    s.elm.body.addClass($.cl.loading);

                    const vars = {};

                    s.elm.translation.wrapper.find("div." + $.cl.settings.translation.category + "[" + $.attr.settings.translation.language + "='" + lang + "']").forEach((wrapper) => {
                        $(wrapper).find("textarea").forEach((textarea) => {
                            let value = textarea.value;
                            if (value && value.trim().length > 0) {
                                const initial = $(textarea).data("initial");
                                value = value.trim();

                                if (value !== initial) {
                                    const name = $(textarea).data("name");
                                    vars[name] = value;
                                }
                            }
                        });
                    });

                    let translatedAmount = 0;
                    $.xhr($.opts.website.translation.submit, {
                        method: "POST",
                        data: {
                            lang: lang,
                            vars: vars
                        }
                    }).then(() => {
                        return storeChangedLangVars(lang, vars);
                    }).then((response) => { // load at least 1s
                        translatedAmount = response.translatedAmount;
                        return $.delay(Math.max(0, 1000 - (+new Date() - loadStartTime)));
                    }).then(() => { // show success message
                        loader.remove();
                        s.showSuccessMessage("translation_submit_message");
                        return $.delay(1500);
                    }).then(() => { // reload page
                        s.elm.body.removeClass($.cl.loading);

                        if (translatedAmount >= thanksLimit && s.helper.model.getData("u/translationThanked") === false) { // user translated more than the limit and hasn't seen the thank you screen, yet
                            initThanksForm(lang, translatedAmount);
                        } else {
                            initEditForm(lang);
                        }
                    });
                } else {
                    resolve();
                }
            });
        };

        /**
         * Stores the amount of translated or changed language variables in the local storage,
         * Returns the total amount of language variables, the user edited in the promise resolve
         *
         * @param {string} lang
         * @param {object} vars
         * @returns {Promise}
         */
        const storeChangedLangVars = (lang, vars) => {
            return new Promise((resolve) => {
                const storageKey = "translated_" + lang;

                chrome.storage.local.get([storageKey], (obj) => {
                    let translated = [];

                    if (obj && obj[storageKey]) {
                        translated = obj[storageKey];
                    }

                    Object.keys(vars).forEach((langVar) => {
                        if (translated.indexOf(langVar) === -1) {
                            translated.push(langVar);
                        }
                    });

                    const translatedAmount = translated.length;
                    if (translatedAmount > 0) {
                        chrome.storage.local.set({
                            [storageKey]: translated
                        }, () => {
                            chrome.runtime.lastError; // do nothing specific with the error -> is thrown if too many save attempts are triggered
                            resolve({translatedAmount: translatedAmount});
                        });
                    }
                });
            });
        };

        /**
         * Initialises the language information
         *
         * @returns {Promise}
         */
        const initLanguages = () => {
            return new Promise((resolve) => {
                s.helper.model.call("languageInfos").then((opts) => {
                    languages = opts.infos;
                    resolve();
                });
            });
        };

        /**
         * Initialises the language overview
         */
        const initOverview = () => {
            return new Promise((resolve) => {
                s.elm.translation.overview.children("div." + $.cl.settings.boxWrapper).html("");

                $.xhr($.opts.website.translation.info).then((xhr) => {
                    const infos = JSON.parse(xhr.responseText);

                    if (infos && infos.languages) {
                        const language = s.helper.i18n.getLanguage();

                        infos.languages.sort((a, b) => {
                            if (b.varsAmount !== a.varsAmount) {
                                return b.varsAmount - a.varsAmount;
                            }

                            if (languages[a.name] && languages[b.name]) {
                                return languages[a.name].label > languages[b.name].label ? 1 : -1;
                            }

                            return 1;
                        });

                        const missingLanguages = Object.assign({}, languages);

                        infos.languages.forEach((lang) => {
                            if (languages[lang.name]) {
                                const percentage = lang.varsAmount / infos.varsAmount * 100;

                                if (percentage >= 15) { // only list languages with more then 15% variables filled
                                    delete missingLanguages[lang.name];

                                    let status = "draft";
                                    const percentageRounded = Math.floor(percentage);

                                    if (languages[lang.name].available) {
                                        status = infos.varsAmount > lang.varsAmount ? "incomplete" : "released";
                                    }

                                    const elm = $("<div />")
                                        .data("lang", lang.name)
                                        .addClass($.cl.settings.box)
                                        .attr($.attr.settings.translation.releaseStatus, status)
                                        .append("<a href='#' class='" + $.cl.settings.translation.edit + "'></a>")
                                        .append("<strong>" + languages[lang.name].label + "</strong>")
                                        .append("<div class=" + $.cl.settings.translation.progress + " " + $.attr.value + "='" + percentageRounded + "%'><div style='width:" + percentageRounded + "%'></div></div>")
                                        .append("<span title='" + s.helper.i18n.get("settings_translation_status_" + status) + "'></span>")
                                        .appendTo(s.elm.translation.overview.children("div." + $.cl.settings.boxWrapper));

                                    if (language === lang.name) {
                                        if (hasImcompleteCategories(lang.categories, infos.categories)) { // translation is incomplete -> show icon in menu
                                            s.elm.aside.find("li[" + $.attr.name + "='language']").addClass($.cl.settings.incomplete);

                                            $("<span />")
                                                .attr("title", s.helper.i18n.get("settings_translation_incomplete_info"))
                                                .appendTo(s.elm.aside.find("li[" + $.attr.name + "='language'] > a"));
                                        }

                                        elm.addClass($.cl.settings.translation.mark);
                                    }
                                }
                            }
                        });

                        addSelectForMissingLangs(missingLanguages);
                    }

                    s.elm.translation.overview.addClass($.cl.visible);
                    resolve();
                });
            });
        };

        /**
         * Initialises the general eventhandlers for the translation pages
         */
        const initEvents = () => {
            s.elm.translation["goto"].on("click", (e) => {
                e.preventDefault();
                s.elm.aside.find("li[" + $.attr.name + "='translate'] > a").trigger("click");
            });

            $(document).on($.opts.events.pageChanged, (e) => {
                if (e.detail.path && e.detail.path[1] === "translate") {
                    if (e.detail.path[2]) {
                        initEditForm(e.detail.path[2]);
                    } else if (s.serviceAvailable) {
                        gotoOverview();
                    } else {
                        showUnavailableText();
                    }
                }
            });
        };

        /**
         * Initialises the events for the translation overview
         */
        const initOverviewEvents = () => {
            s.elm.translation.overview.find("select." + $.cl.settings.translation.select).on("change", (e) => {
                initEditForm(e.currentTarget.value);
            });

            s.elm.translation.overview.find("div." + $.cl.settings.box).on("click", (e) => {
                e.preventDefault();
                const lang = $(e.currentTarget).data("lang");
                if (lang) {
                    initEditForm(lang);
                }
            });
        };

        const gotoOverview = () => {
            s.elm.translation.wrapper.find("." + $.cl.visible).removeClass($.cl.visible);
            s.elm.translation.overview.addClass($.cl.visible);
            s.elm.buttons.save.addClass($.cl.hidden);
        };

        const showUnavailableText = () => {
            s.elm.translation.unavailable.addClass($.cl.visible);

            if (s.elm.translation.wrapper.hasClass($.cl.active)) {
                s.elm.buttons.save.addClass($.cl.hidden);
            }
        };

        /**
         * Returns true if a category of the given language is missing some variables
         *
         * @param {object} langCategories
         * @param {object} allCategories
         * @returns {boolean}
         */
        const hasImcompleteCategories = (langCategories, allCategories) => {
            let ret = false;

            Object.keys(langCategories).some((name) => {
                if (allCategories[name].total > langCategories[name]) {
                    ret = true;
                    return true;
                }
            });

            return ret;
        };

        /**
         * Adds a dropdown select for all missing languages below the list of available languages
         *
         * @param {object} langs
         */
        const addSelectForMissingLangs = (langs) => {
            const box = $("<div />")
                .addClass($.cl.settings.box)
                .appendTo(s.elm.translation.overview.children("div." + $.cl.settings.boxWrapper));

            const select = $("<select class='" + $.cl.settings.translation.select + "' />").appendTo(box);
            $("<option value='' />").text(s.helper.i18n.get("settings_translation_add_language")).appendTo(select);

            const optionList = [];
            Object.keys(langs).forEach((lang) => {
                optionList.push({
                    elm: $("<option value='" + lang + "' />").text(languages[lang].label),
                    label: languages[lang].label
                });
            });

            optionList.sort((a, b) => {
                return a.label > b.label ? 1 : -1;
            });

            optionList.forEach((obj) => {
                obj.elm.appendTo(select);
            });
        };

        /**
         * Returns all language variables of the given language,
         * also return the variables of the default language if the given language is not the default one
         *
         * @param {string} lang
         * @returns {Promise}
         */
        const getLanguageInfos = (lang) => {
            return new Promise((resolve) => {
                const finished = (ret) => {
                    if (ret && typeof langvarsCache[lang] === "undefined") {
                        langvarsCache[lang] = ret;
                    }
                    resolve(ret);
                };

                if (langvarsCache[lang]) {
                    finished(langvarsCache[lang]);
                } else {
                    $.xhr($.opts.website.translation.langvars, {
                        method: "POST",
                        data: {
                            lang: lang
                        }
                    }).then((xhr) => {
                        const infos = JSON.parse(xhr.responseText);

                        if (infos && Object.getOwnPropertyNames(infos).length > 0) {
                            const defaultLang = s.helper.i18n.getDefaultLanguage();
                            const ret = {[lang]: infos};

                            if (lang !== defaultLang) {
                                getLanguageInfos(defaultLang).then((infos) => {
                                    ret["default"] = infos[defaultLang];
                                    finished(ret);
                                });
                            } else {
                                finished(ret);
                            }
                        } else {
                            finished(null);
                        }
                    });
                }
            });
        };

        /**
         * Initialises the events for the translation form
         */
        const initFormEvents = () => {
            s.elm.translation.wrapper.on("click", "a." + $.cl.settings.translation.back, (e) => {
                e.preventDefault();
                const lang = $(e.currentTarget).parents("div." + $.cl.settings.translation.category).eq(0).attr($.attr.settings.translation.language);
                initEditForm(lang);
            });

            s.elm.translation.wrapper.on("click", "a." + $.cl.settings.translation["goto"], (e) => {
                e.preventDefault();
                const dir = $(e.currentTarget).attr($.attr.value);
                const list = $(e.currentTarget).parent("header").next("ul");
                gotoNextPrevEmptyField(dir, list);
            });

            s.elm.translation.langvars.on("click", "div." + $.cl.settings.box, (e) => {
                e.preventDefault();
                const wrapper = $(e.currentTarget);
                const lang = wrapper.data("lang");
                const name = wrapper.children("strong").text();
                const info = wrapper.data("info");

                showLangVarsList(lang, name, info);
            });

            s.elm.translation.thanks.on("click", "a", (e) => {
                e.preventDefault();
                const lang = s.elm.translation.thanks.data("lang");

                if ($(e.currentTarget).hasClass($.cl.close)) {
                    initEditForm(lang);
                } else {
                    const email = s.elm.field.translationEmail[0].value;
                    const translatedAmount = s.elm.translation.thanks.data("translatedAmount");

                    $(e.currentTarget).addClass($.cl.loading);
                    const loader = s.helper.template.loading().appendTo(e.currentTarget);

                    Promise.all([
                        $.xhr($.opts.website.translation.submit, {
                            method: "POST",
                            data: {
                                lang: lang,
                                email: email,
                                translatedAmount: translatedAmount
                            }
                        }),
                        $.delay(500),
                    ]).then(() => {
                        loader.remove();
                        $(e.currentTarget).removeClass($.cl.loading);
                        return $.delay(500);
                    }).then(() => {
                        initEditForm(lang);
                    });
                }
            });
        };

        /**
         * Shows the language variables for the given category and language
         *
         * @param {string} lang
         * @param {string} name
         * @param {object} info
         */
        const showLangVarsList = (lang, name, info) => {
            let elm = s.elm.translation.wrapper.find("div." + $.cl.settings.translation.category + "[" + $.attr.name + "='" + name + "'][" + $.attr.settings.translation.language + "='" + lang + "']");

            if (elm.length() === 0) {
                const key = lang + "_" + name;
                const defaultLang = s.helper.i18n.getDefaultLanguage();

                elm = $("<div />")
                    .attr($.attr.name, name)
                    .attr($.attr.settings.translation.language, lang)
                    .addClass($.cl.settings.translation.category)
                    .appendTo(s.elm.translation.wrapper);

                const header = $("<header />").appendTo(elm);
                const list = $("<ul />").appendTo(elm);

                info.category.vars.forEach((field, i) => {
                    const entry = $("<li />")
                        .append("<div />")
                        .append("<div />")
                        .appendTo(list);

                    let originalText = "";
                    if (lang === defaultLang) { // when editing the default language there are no defaults -> show the current translation instead
                        originalText = field.value || "";
                    } else if (info.defaults && info.defaults.vars && info.defaults.vars[i]) {
                        originalText = info.defaults.vars[i].value || "";
                    }

                    $("<span />")
                        .html(originalText)
                        .appendTo(entry.children("div").eq(0));

                    const variableName = $("<footer />")
                        .addClass($.cl.sidebar.breadcrumb)
                        .data("name", field.label)
                        .html("<label>Variable name:</label><div />")
                        .appendTo(entry.children("div").eq(0));

                    field.label.split(" - ").forEach((variablePart) => {
                        $("<span />").text(variablePart).appendTo(variableName.children("div"));
                    });

                    const val = field.value || "";
                    $("<textarea />").data({
                        initial: val,
                        name: field.name
                    }).text(val).appendTo(entry.children("div").eq(1));

                    if (val.length === 0) { // mark empty fields
                        entry.addClass($.cl.settings.translation.empty);
                    }
                });

                initTextareaEvents(elm);

                $("<a />").text(s.helper.i18n.get("settings_translation_back_to_overview")).addClass($.cl.settings.translation.back).appendTo(header);

                if (varsAmount[key].total !== varsAmount[key].filled) { // there are empty fields -> show navigation buttons
                    $("<a />").addClass($.cl.settings.translation["goto"]).attr($.attr.value, "down").appendTo(header);
                    $("<a />").addClass($.cl.settings.translation["goto"]).attr($.attr.value, "up").appendTo(header);
                }

                $("<span />").addClass($.cl.settings.translation.amountInfo).html("<span>" + varsAmount[key].filled + "</span>&thinsp;/&thinsp;" + varsAmount[key].total).appendTo(header);

                header.css("top", "-35px");
            }

            s.elm.translation.langvars.removeClass($.cl.visible);
            elm.addClass($.cl.visible);

            s.helper.menu.addBreadcrumb({
                label: name,
                alias: name,
                depth: 4
            });

            $.delay(0).then(() => {
                const list = elm.children("ul");

                if (elm.find("a." + $.cl.settings.translation["goto"]).length() > 0) { // jump to the first empty field
                    gotoNextPrevEmptyField("down", list);
                }

                showTranslationHint(lang, list);
            });
        };

        /**
         * Focusses the next/prev empty textarea of the given list
         *
         * @param {string} dir
         * @param {jsu} list
         */
        const gotoNextPrevEmptyField = (dir, list) => {
            let entries = null;

            if (list.find("li." + $.cl.hover).length() > 0) {
                if (dir === "up") {
                    entries = list.find("li." + $.cl.hover).eq(0).prevAll("li." + $.cl.settings.translation.empty);
                } else {
                    entries = list.find("li." + $.cl.hover).eq(0).nextAll("li." + $.cl.settings.translation.empty);
                }
            } else if (dir === "down") {
                entries = list.find("li." + $.cl.settings.translation.empty);
            }

            if (entries && entries.length() > 0) {
                const entry = entries.eq(0);
                s.elm.content[0].scrollTop = Math.max(0, entry[0].offsetTop - 80);
                entry.find("textarea")[0].focus();
            }
        };

        /**
         * Shows a help text for the first visible entry of the current langvar category
         *
         * @param {string} lang
         * @param {jsu} list
         */
        const showTranslationHint = (lang, list) => {
            const defaultLang = s.helper.i18n.getDefaultLanguage();

            if (lang !== defaultLang && s.helper.model.getData("u/translationHelp")) { // only show one time
                let activeEntry = null;

                if (document.activeElement.tagName === "TEXTAREA") { // a textarea is focussed already -> show help text there
                    activeEntry = $(document.activeElement).parents("li").eq(0);
                } else { // show help text for the first entry of the list
                    activeEntry = list.children("li").eq(0);
                }

                activeEntry.addClass($.cl.settings.translation.mark);
                const label = activeEntry.find("footer." + $.cl.sidebar.breadcrumb).data("name");

                $("<span />")
                    .addClass($.cl.settings.desc)
                    .html(s.helper.i18n.get("settings_translation_help", ["<strong>" + label + "</strong>"]))
                    .prependTo(activeEntry);

                s.helper.model.setData({"u/translationHelp": false});
            }
        };

        /**
         * Initialises the events for the textareas of the given wrapper element
         *
         * @param {jsu} elm
         */
        const initTextareaEvents = (elm) => {
            elm.find("textarea").on("change input", (e) => {
                const elmObj = $(e.currentTarget);
                const val = e.currentTarget.value;
                const category = elm.attr($.attr.name);
                const lang = elm.attr($.attr.settings.translation.language);

                if (val) {
                    elmObj.parents("li").eq(0).removeClass($.cl.settings.translation.empty);
                } else {
                    elmObj.parents("li").eq(0).addClass($.cl.settings.translation.empty);
                }

                elmObj.css("height", "");
                elmObj.css("height", Math.max(e.currentTarget.scrollHeight, 70) + "px");

                let filled = 0;
                elm.find("textarea").forEach((textarea) => {
                    if (textarea.value && textarea.value.trim().length > 0) {
                        filled++;
                    }
                });
                varsAmount[lang + "_" + category].filled = filled;

                elm.find("span." + $.cl.settings.translation.amountInfo + " > span").text(filled); // change counter
            }).on("focus", (e) => { // mark row and textarea if it has the focus
                elm.find("li").removeClass($.cl.hover);
                $(e.currentTarget).parents("li").eq(0).addClass($.cl.hover);
            }).on("blur", (e) => {
                const parentElm = $(e.currentTarget).parents("li").eq(0);
                $.delay(200).then(() => {
                    parentElm.removeClass($.cl.hover);
                });
            });

            $.delay().then(() => {
                elm.find("textarea").trigger("change");
            });
        };

        /**
         * Shows the thank you box where the user can enter his email address
         *
         * @param {string} lang
         * @param {int} translatedAmount
         */
        const initThanksForm = (lang, translatedAmount) => {
            s.helper.model.setData({"u/translationThanked": true});

            s.elm.translation.wrapper.find("div." + $.cl.settings.translation.category).removeClass($.cl.visible);
            s.elm.translation.langvars.removeClass($.cl.visible);

            s.elm.buttons.save.removeClass($.cl.hidden);
            s.elm.translation.thanks.addClass($.cl.visible).data({
                lang: lang,
                translatedAmount: translatedAmount
            });
        };

        /**
         * Initialises the form with all language variables
         *
         * @param {string} lang
         */
        const initEditForm = (lang) => {
            s.helper.menu.addBreadcrumb({
                label: languages[lang].label,
                alias: lang,
                depth: 3
            });

            s.elm.translation.langvars.data("lang", lang);
            s.elm.translation.langvars.find("div." + $.cl.settings.boxWrapper).html("");
            s.elm.translation.wrapper.find("div." + $.cl.settings.translation.category).removeClass($.cl.visible);

            s.elm.buttons.save.removeClass($.cl.hidden);
            s.elm.translation.thanks.removeClass($.cl.visible);
            s.elm.translation.overview.removeClass($.cl.visible);
            s.elm.translation.langvars.addClass([$.cl.visible, $.cl.loading]);
            const loader = s.helper.template.loading().appendTo(s.elm.translation.langvars);

            getLanguageInfos(lang).then((obj) => {
                if (obj) {
                    const infos = obj[lang];

                    Object.keys(infos).forEach((category) => { // list all langvar categories
                        const elm = $("<div />")
                            .addClass($.cl.settings.box)
                            .data("lang", lang)
                            .data("info", {
                                category: infos[category],
                                defaults: obj["default"] ? obj["default"][category] : null
                            })
                            .append("<strong>" + category + "</strong>")
                            .appendTo(s.elm.translation.langvars.children("div." + $.cl.settings.boxWrapper));

                        const key = lang + "_" + category;

                        if (typeof varsAmount[key] === "undefined") {
                            varsAmount[key] = {
                                total: infos[category].vars.length,
                                filled: 0
                            };

                            infos[category].vars.forEach((field) => {
                                if (field.value) {
                                    varsAmount[key].filled++;
                                }
                            });
                        }

                        if (infos[category].required) {
                            $("<span />").addClass($.cl.settings.translation.requiredInfo).text("(" + s.helper.i18n.get("settings_translation_required_category") + ")").appendTo(elm);
                        }

                        $("<span />").addClass($.cl.settings.translation.amountInfo).html("<span>" + varsAmount[key].filled + "</span>&thinsp;/&thinsp;" + varsAmount[key].total).appendTo(elm);

                        if (varsAmount[key].total > varsAmount[key].filled) { // incomplete notice for already released translations
                            elm.addClass($.cl.settings.incomplete);
                        }
                    });
                } else {
                    gotoOverview();
                }

                s.elm.translation.langvars.removeClass($.cl.loading);
                loader.remove();
            });
        };
    };

})(jsu);