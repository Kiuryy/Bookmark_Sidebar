($ => {
    "use strict";

    $.TranslationHelper = function (s) {

        let languages = {};
        let langvarsCache = {};
        let varsAmount = {};

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
                let lang = s.elm.translation.langvars.data("lang");

                if (lang) {
                    let loadStartTime = +new Date();
                    let loader = s.helper.template.loading().appendTo(s.elm.body);
                    s.elm.body.addClass($.cl.general.loading);

                    let vars = {};

                    s.elm.translation.wrapper.find("div." + $.cl.settings.translation.category + "[" + $.attr.settings.translation.language + "='" + lang + "']").forEach((wrapper) => {
                        $(wrapper).find("textarea").forEach((textarea) => {
                            let value = textarea.value;
                            if (value && value.trim().length > 0) {
                                let initial = $(textarea).data("initial");
                                value = value.trim();

                                if (value !== initial) {
                                    let name = $(textarea).data("name");
                                    vars[name] = value;
                                }
                            }
                        });
                    });

                    $.xhr($.opts.ajax.translation.submit, {
                        method: "POST",
                        data: {
                            lang: lang,
                            vars: vars
                        }
                    }).then(() => { // load at least 1s
                        return $.delay(Math.max(0, 1000 - (+new Date() - loadStartTime)));
                    }).then(() => { // show success message
                        loader.remove();
                        s.showSuccessMessage("translation_submit_message");
                        return $.delay(1500);
                    }).then(() => { // reload page
                        s.elm.body.removeClass($.cl.general.loading);
                        initEditForm(lang);
                    });
                } else {
                    resolve();
                }
            });
        };

        /**
         * Initialises the language information
         *
         * @returns {Promise}
         */
        let initLanguages = () => {
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
        let initOverview = () => {
            return new Promise((resolve) => {
                s.elm.translation.overview.children("div." + $.cl.settings.boxWrapper).html("");

                $.xhr($.opts.ajax.translation.info).then((xhr) => {
                    let infos = JSON.parse(xhr.responseText);

                    if (infos && infos.languages) {
                        let language = s.helper.i18n.getLanguage();

                        infos.languages.sort((a, b) => {
                            if (b.varsAmount !== a.varsAmount) {
                                return b.varsAmount - a.varsAmount;
                            }

                            if (languages[a.name] && languages[b.name]) {
                                return languages[a.name].label > languages[b.name].label ? 1 : -1;
                            }

                            return 1;
                        });

                        let missingLanguages = Object.assign({}, languages);

                        infos.languages.forEach((lang) => {
                            if (languages[lang.name]) {
                                let percentage = lang.varsAmount / infos.varsAmount * 100;

                                if (percentage >= 15) { // only list languages with more then 15% variables filled
                                    delete missingLanguages[lang.name];

                                    let status = "draft";
                                    let percentageRounded = Math.floor(percentage);

                                    if (languages[lang.name].available) {
                                        status = infos.varsAmount > lang.varsAmount ? "incomplete" : "released";
                                    }

                                    let elm = $("<div />")
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

                    s.elm.translation.overview.addClass($.cl.general.visible);
                    resolve();
                });
            });
        };

        /**
         * Initialises the general eventhandlers for the translation pages
         */
        let initEvents = () => {
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
        let initOverviewEvents = () => {
            s.elm.translation.overview.find("select." + $.cl.settings.translation.select).on("change", (e) => {
                initEditForm(e.currentTarget.value);
            });

            s.elm.translation.overview.find("div." + $.cl.settings.box).on("click", (e) => {
                e.preventDefault();
                let lang = $(e.currentTarget).data("lang");
                if (lang) {
                    initEditForm(lang);
                }
            });
        };

        let gotoOverview = () => {
            s.elm.translation.wrapper.find("." + $.cl.general.visible).removeClass($.cl.general.visible);
            s.elm.translation.overview.addClass($.cl.general.visible);
            s.elm.buttons.save.addClass($.cl.general.hidden);
        };

        let showUnavailableText = () => {
            s.elm.translation.unavailable.addClass($.cl.general.visible);

            if (s.elm.translation.wrapper.hasClass($.cl.general.active)) {
                s.elm.buttons.save.addClass($.cl.general.hidden);
            }
        };

        /**
         * Returns true if a category of the given language is missing some variables
         *
         * @param {object} langCategories
         * @param {object} allCategories
         * @returns {boolean}
         */
        let hasImcompleteCategories = (langCategories, allCategories) => {
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
        let addSelectForMissingLangs = (langs) => {
            let box = $("<div />")
                .addClass($.cl.settings.box)
                .appendTo(s.elm.translation.overview.children("div." + $.cl.settings.boxWrapper));

            let select = $("<select class='" + $.cl.settings.translation.select + "' />").appendTo(box);
            $("<option value='' />").text(s.helper.i18n.get("settings_translation_add_language")).appendTo(select);

            let optionList = [];

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
        let getLanguageInfos = (lang) => {
            return new Promise((resolve) => {
                let finished = (ret) => {
                    if (ret && typeof langvarsCache[lang] === "undefined") {
                        langvarsCache[lang] = ret;
                    }
                    resolve(ret);
                };

                if (langvarsCache[lang]) {
                    finished(langvarsCache[lang]);
                } else {
                    $.xhr($.opts.ajax.translation.langvars, {
                        method: "POST",
                        data: {
                            lang: lang
                        }
                    }).then((xhr) => {
                        let infos = JSON.parse(xhr.responseText);

                        if (infos && Object.getOwnPropertyNames(infos).length > 0) {
                            let ret = {[lang]: infos};
                            let defaultLang = s.helper.i18n.getDefaultLanguage();

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
        let initFormEvents = () => {
            s.elm.translation.wrapper.on("click", "a." + $.cl.settings.translation.back, (e) => {
                e.preventDefault();
                let lang = $(e.currentTarget).parents("div." + $.cl.settings.translation.category).eq(0).attr($.attr.settings.translation.language);

                initEditForm(lang);
            });

            s.elm.translation.wrapper.on("click", "a." + $.cl.settings.translation["goto"], (e) => {
                e.preventDefault();
                let dir = $(e.currentTarget).attr($.attr.value);
                let list = $(e.currentTarget).parent("header").next("ul");
                gotoNextPrevEmptyField(dir, list);
            });

            s.elm.translation.langvars.on("click", "div." + $.cl.settings.box, (e) => {
                e.preventDefault();
                let wrapper = $(e.currentTarget);
                let lang = wrapper.data("lang");
                let name = wrapper.children("strong").text();
                let info = wrapper.data("info");

                showLangVarsList(lang, name, info);
            });
        };

        /**
         * Shows the language variables for the given category and language
         *
         * @param {string} lang
         * @param {string} name
         * @param {object} info
         */
        let showLangVarsList = (lang, name, info) => {
            let elm = s.elm.translation.wrapper.find("div." + $.cl.settings.translation.category + "[" + $.attr.name + "='" + name + "'][" + $.attr.settings.translation.language + "='" + lang + "']");

            if (elm.length() === 0) {
                let key = lang + "_" + name;

                elm = $("<div />")
                    .attr($.attr.name, name)
                    .attr($.attr.settings.translation.language, lang)
                    .addClass($.cl.settings.translation.category)
                    .addClass($.cl.settings.contentBox)
                    .appendTo(s.elm.translation.wrapper);

                let header = $("<header />").appendTo(elm);
                let list = $("<ul />").appendTo(elm);

                info.category.vars.forEach((field, i) => {
                    let entry = $("<li />")
                        .append("<div><label>" + field.label + "</label></div>")
                        .append("<div />")
                        .appendTo(list);

                    if (info.defaults && info.defaults.vars && info.defaults.vars[i]) { // show translation of the default language besides the title of the language variable
                        $("<span />")
                            .html("<span>" + languages[s.helper.i18n.getDefaultLanguage()].label + " translation:</span>" + info.defaults.vars[i].value || "")
                            .appendTo(entry.children("div").eq(0));
                    }

                    let val = field.value || "";
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

                // @deprecated sticky positioning seems to have changed with Chrome 68 -> this workaround can be removed as soon as v68 is the min required version
                let versionRaw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
                let version = versionRaw ? parseInt(versionRaw[2], 10) : null;
                if (version < 68) {
                    header.css("top", "-35px");
                }
            }

            s.elm.translation.langvars.removeClass($.cl.general.visible);
            elm.addClass($.cl.general.visible);

            s.helper.menu.addBreadcrumb({
                label: name,
                alias: name,
                depth: 4
            });

            $.delay(0).then(() => {
                let list = elm.children("ul");

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
        let gotoNextPrevEmptyField = (dir, list) => {
            let entries = null;

            if (list.find("li." + $.cl.general.hover).length() > 0) {
                if (dir === "up") {
                    entries = list.find("li." + $.cl.general.hover).eq(0).prevAll("li." + $.cl.settings.translation.empty);
                } else {
                    entries = list.find("li." + $.cl.general.hover).eq(0).nextAll("li." + $.cl.settings.translation.empty);
                }
            } else if (dir === "down") {
                entries = list.find("li." + $.cl.settings.translation.empty);
            }

            if (entries && entries.length() > 0) {
                let entry = entries.eq(0);
                s.elm.content[0].scrollTop = Math.max(0, entry[0].offsetTop - 40);
                entry.find("textarea")[0].focus();
            }
        };

        /**
         * Shows a help text for the first visible entry of the current langvar category
         *
         * @param {string} lang
         * @param {jsu} list
         */
        let showTranslationHint = (lang, list) => {
            let defaultLang = s.helper.i18n.getDefaultLanguage();

            if (lang !== defaultLang && s.helper.model.getData("u/translationHelp")) { // only show one time
                let activeEntry = null;

                if (document.activeElement.tagName === "TEXTAREA") { // a textarea is focussed already -> show help text there
                    activeEntry = $(document.activeElement).parents("li").eq(0);
                } else { // show help text for the first entry of the list
                    activeEntry = list.children("li").eq(0);
                }

                activeEntry.addClass($.cl.settings.translation.mark);
                let label = activeEntry.find("label").text();


                $("<span />")
                    .addClass($.cl.settings.desc)
                    .html(s.helper.i18n.get("settings_translation_help", ["<strong>" + label + "</strong>"]))
                    .appendTo(activeEntry);

                s.helper.model.setData({"u/translationHelp": false});
            }
        };

        /**
         * Initialises the events for the textareas of the given wrapper element
         *
         * @param {jsu} elm
         */
        let initTextareaEvents = (elm) => {
            elm.find("textarea").on("change input", (e) => {
                let elmObj = $(e.currentTarget);
                let val = e.currentTarget.value;
                let category = elm.attr($.attr.name);
                let lang = elm.attr($.attr.settings.translation.language);

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
                elm.find("li").removeClass($.cl.general.hover);
                $(e.currentTarget).parents("li").eq(0).addClass($.cl.general.hover);
            }).on("blur", (e) => {
                let parentElm = $(e.currentTarget).parents("li").eq(0);
                $.delay(200).then(() => {
                    parentElm.removeClass($.cl.general.hover);
                });
            });

            $.delay().then(() => {
                elm.find("textarea").trigger("change");
            });
        };

        /**
         * Initialises the form with all language variables
         *
         * @param {string} lang
         */
        let initEditForm = (lang) => {
            s.helper.menu.addBreadcrumb({
                label: languages[lang].label,
                alias: lang,
                depth: 3
            });

            s.elm.translation.langvars.data("lang", lang);
            s.elm.translation.langvars.find("div." + $.cl.settings.boxWrapper).html("");
            s.elm.translation.wrapper.find("div." + $.cl.settings.translation.category).removeClass($.cl.general.visible);

            s.elm.buttons.save.removeClass($.cl.general.hidden);
            s.elm.translation.overview.removeClass($.cl.general.visible);
            s.elm.translation.langvars.addClass([$.cl.general.visible, $.cl.general.loading]);
            let loader = s.helper.template.loading().appendTo(s.elm.translation.langvars);

            getLanguageInfos(lang).then((obj) => {
                if (obj) {
                    let infos = obj[lang];

                    Object.keys(infos).forEach((category) => { // list all langvar categories
                        let elm = $("<div />")
                            .addClass($.cl.settings.box)
                            .data("lang", lang)
                            .data("info", {
                                category: infos[category],
                                defaults: obj["default"] ? obj["default"][category] : null
                            })
                            .append("<strong>" + category + "</strong>")
                            .appendTo(s.elm.translation.langvars.children("div." + $.cl.settings.boxWrapper));

                        let key = lang + "_" + category;

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

                s.elm.translation.langvars.removeClass($.cl.general.loading);
                loader.remove();
            });
        };
    };

})(jsu);