($ => {
    "use strict";

    window.TranslationHelper = function (s) {

        let languages = {};
        let langvarsCache = {};
        let varsAmount = {};
        let available = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = () => {
            return new Promise((resolve) => {
                initLanguages().then(() => {
                    return s.helper.model.call("websiteStatus");
                }).then((opts) => {
                    initEvents();
                    available = opts.status === "available";

                    if (available) {
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
                let lang = s.opts.elm.translation.langvars.data("lang");

                if (lang) {
                    let loadStartTime = +new Date();
                    let loader = s.helper.template.loading().appendTo(s.opts.elm.body);
                    s.opts.elm.body.addClass(s.opts.classes.loading);

                    let vars = {};

                    s.opts.elm.translation.wrapper.find("div." + s.opts.classes.translation.category + "[" + s.opts.attr.translation.language + "='" + lang + "']").forEach((wrapper) => {
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

                    $.xhr(s.opts.ajax.translation.submit, {
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
                        s.opts.elm.body.removeClass(s.opts.classes.loading);
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
                s.opts.elm.translation.overview.children("div." + s.opts.classes.boxWrapper).html("");

                $.xhr(s.opts.ajax.translation.info).then((xhr) => {
                    let infos = JSON.parse(xhr.responseText);

                    if (infos && infos.languages) {
                        let language = s.helper.i18n.getLanguage();

                        infos.languages.sort((a, b) => {
                            if (b.varsAmount !== a.varsAmount) {
                                return b.varsAmount - a.varsAmount
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

                                if (percentage > 10) { // only list languages with more then 10% variables filled
                                    delete missingLanguages[lang.name];

                                    let percent = lang.varsAmount / infos.varsAmount * 100;
                                    let status = "draft";

                                    if (languages[lang.name].available) {
                                        status = hasImcompleteCategories(lang.categories, infos.categories) ? "incomplete" : "released";
                                    }

                                    let elm = $("<div />")
                                        .data("lang", lang.name)
                                        .addClass(s.opts.classes.box)
                                        .attr(s.opts.attr.translation.releaseStatus, status)
                                        .append("<a href='#' class='" + s.opts.classes.translation.edit + "'></a>")
                                        .append("<strong>" + languages[lang.name].label + "</strong>")
                                        .append("<div class=" + s.opts.classes.translation.progress + " " + s.opts.attr.value + "='" + Math.round(percent) + "%'><div style='width:" + percent + "%'></div></div>")
                                        .append("<span title='" + s.helper.i18n.get("settings_translation_status_" + status) + "'></span>")
                                        .appendTo(s.opts.elm.translation.overview.children("div." + s.opts.classes.boxWrapper));

                                    if (language === lang.name) {
                                        if (infos.varsAmount > lang.varsAmount) { // translation is incomplete -> show icon in menu
                                            s.opts.elm.aside.find("li[" + s.opts.attr.name + "='language']").addClass(s.opts.classes.incomplete);

                                            $("<span />")
                                                .attr("title", s.helper.i18n.get("settings_translation_incomplete_info"))
                                                .appendTo(s.opts.elm.aside.find("li[" + s.opts.attr.name + "='language'] > a"));
                                        }

                                        elm.addClass(s.opts.classes.translation.mark);
                                    }
                                }
                            }
                        });

                        addSelectForMissingLangs(missingLanguages);
                    }

                    s.opts.elm.translation.overview.addClass(s.opts.classes.visible);
                    resolve();
                });
            });
        };

        /**
         * Initialises the general eventhandlers for the translation pages
         */
        let initEvents = () => {
            s.opts.elm.translation.goto.on("click", (e) => {
                e.preventDefault();
                s.opts.elm.aside.find("li[" + s.opts.attr.name + "='translate'] > a").trigger("click");
            });

            $(document).on(s.opts.events.pageChanged, (e) => {
                if (e.detail.path && e.detail.path[1] === "translate") {
                    if (e.detail.path[2]) {
                        initEditForm(e.detail.path[2]);
                    } else if (available) {
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
            s.opts.elm.translation.overview.find("select." + s.opts.classes.translation.select).on("change", (e) => {
                initEditForm(e.currentTarget.value);
            });

            s.opts.elm.translation.overview.find("div." + s.opts.classes.box).on("click", (e) => {
                e.preventDefault();
                let lang = $(e.currentTarget).data("lang");
                if (lang) {
                    initEditForm(lang);
                }
            });
        };

        let gotoOverview = () => {
            s.opts.elm.translation.wrapper.find("." + s.opts.classes.visible).removeClass(s.opts.classes.visible);
            s.opts.elm.translation.overview.addClass(s.opts.classes.visible);
            s.opts.elm.buttons.save.addClass(s.opts.classes.hidden);
        };

        let showUnavailableText = () => {
            s.opts.elm.translation.unavailable.addClass(s.opts.classes.visible);
            s.opts.elm.buttons.save.addClass(s.opts.classes.hidden);
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
                if (allCategories[name] > langCategories[name]) {
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
                .addClass(s.opts.classes.box)
                .appendTo(s.opts.elm.translation.overview.children("div." + s.opts.classes.boxWrapper));

            let select = $("<select class='" + s.opts.classes.translation.select + "' />").appendTo(box);
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
                    $.xhr(s.opts.ajax.translation.langvars, {
                        method: "POST",
                        data: {
                            lang: lang,
                            n: 1 // @deprecated parameter just for backward compatibility
                        }
                    }).then((xhr) => {
                        let infos = JSON.parse(xhr.responseText);

                        if (infos && Object.getOwnPropertyNames(infos).length > 0) {
                            let ret = {[lang]: infos};
                            let defaultLang = s.helper.i18n.getDefaultLanguage();

                            if (lang !== defaultLang) {
                                getLanguageInfos(defaultLang).then((infos) => {
                                    ret.default = infos[defaultLang];
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
            s.opts.elm.translation.wrapper.on("click", "a." + s.opts.classes.translation.back, (e) => {
                e.preventDefault();
                let lang = $(e.currentTarget).parents("div." + s.opts.classes.translation.category).eq(0).attr(s.opts.attr.translation.language);

                initEditForm(lang);
            });

            s.opts.elm.translation.wrapper.on("click", "a." + s.opts.classes.translation.goto, (e) => {
                e.preventDefault();
                let dir = $(e.currentTarget).attr(s.opts.attr.value);
                let list = $(e.currentTarget).parent("header").next("ul");
                let entries = null;

                if (list.find("li." + s.opts.classes.translation.hover).length() > 0) {
                    if (dir === "up") {
                        entries = list.find("li." + s.opts.classes.translation.hover).eq(0).prevAll("li." + s.opts.classes.translation.empty);
                    } else {
                        entries = list.find("li." + s.opts.classes.translation.hover).eq(0).nextAll("li." + s.opts.classes.translation.empty);
                    }
                } else if (dir === "down") {
                    entries = list.find("li." + s.opts.classes.translation.empty);
                }

                if (entries && entries.length() > 0) {
                    let entry = entries.eq(0);
                    s.opts.elm.content[0].scrollTop = Math.max(0, entry[0].offsetTop - 40);
                    entry.find("textarea")[0].focus();
                }
            });

            s.opts.elm.translation.langvars.on("click", "div." + s.opts.classes.box, (e) => {
                e.preventDefault();
                let wrapper = $(e.currentTarget);
                let lang = wrapper.data("lang");
                let name = wrapper.children("strong").text();

                let elm = s.opts.elm.translation.wrapper.find("div." + s.opts.classes.translation.category + "[" + s.opts.attr.name + "='" + name + "'][" + s.opts.attr.translation.language + "='" + lang + "']");
                if (elm.length() === 0) {
                    let info = wrapper.data("info");
                    let key = lang + "_" + name;

                    elm = $("<div />")
                        .attr(s.opts.attr.name, name)
                        .attr(s.opts.attr.translation.language, lang)
                        .addClass(s.opts.classes.translation.category)
                        .addClass(s.opts.classes.contentBox)
                        .appendTo(s.opts.elm.translation.wrapper);

                    let header = $("<header />").appendTo(elm);
                    $("<a />").text(s.helper.i18n.get("settings_translation_back_to_overview")).addClass(s.opts.classes.translation.back).appendTo(header);

                    if (varsAmount[key].total !== varsAmount[key].filled) {
                        $("<a />").addClass(s.opts.classes.translation.goto).attr(s.opts.attr.value, "down").appendTo(header);
                        $("<a />").addClass(s.opts.classes.translation.goto).attr(s.opts.attr.value, "up").appendTo(header);
                    }

                    $("<span />").addClass(s.opts.classes.translation.amountInfo).html("<span>" + varsAmount[key].filled + "</span>&thinsp;/&thinsp;" + varsAmount[key].total).appendTo(header);

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
                            entry.addClass(s.opts.classes.translation.empty);
                        }
                    });

                    initTextareaEvents(elm);
                }

                s.opts.elm.translation.langvars.removeClass(s.opts.classes.visible);
                elm.addClass(s.opts.classes.visible);


                s.helper.menu.addBreadcrumb({
                    label: name,
                    alias: name,
                    depth: 4
                });
            });
        };

        /**
         * Initialises the events for the textareas of the given wrapper element
         *
         * @param {jsu} elm
         */
        let initTextareaEvents = (elm) => {
            elm.find("textarea").on("change input", (e) => {
                let val = e.currentTarget.value;
                let category = elm.attr(s.opts.attr.name);
                let lang = elm.attr(s.opts.attr.translation.language);

                if (val) {
                    $(e.currentTarget).parents("li").eq(0).removeClass(s.opts.classes.translation.empty);
                } else {
                    $(e.currentTarget).parents("li").eq(0).addClass(s.opts.classes.translation.empty);
                }

                let filled = 0;
                elm.find("textarea").forEach((textarea) => {
                    if (textarea.value && textarea.value.trim().length > 0) {
                        filled++;
                    }
                });
                varsAmount[lang + "_" + category].filled = filled;

                elm.find("span." + s.opts.classes.translation.amountInfo + " > span").text(filled); // change counter
            }).on("focus", (e) => { // mark row and textarea if it has the focus
                elm.find("li").removeClass(s.opts.classes.translation.hover);
                $(e.currentTarget).parents("li").eq(0).addClass(s.opts.classes.translation.hover);
            }).on("blur", (e) => {
                let parentElm = $(e.currentTarget).parents("li").eq(0);
                $.delay(200).then(() => {
                    parentElm.removeClass(s.opts.classes.translation.hover);
                });
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

            s.opts.elm.translation.langvars.data("lang", lang);
            s.opts.elm.translation.langvars.find("div." + s.opts.classes.boxWrapper).html("");
            s.opts.elm.translation.wrapper.find("div." + s.opts.classes.translation.category).removeClass(s.opts.classes.visible);

            s.opts.elm.buttons.save.removeClass(s.opts.classes.hidden);
            s.opts.elm.translation.overview.removeClass(s.opts.classes.visible);
            s.opts.elm.translation.langvars.addClass([s.opts.classes.visible, s.opts.classes.loading]);
            let loader = s.helper.template.loading().appendTo(s.opts.elm.translation.langvars);

            getLanguageInfos(lang).then((obj) => {
                if (obj) {
                    let infos = obj[lang];

                    Object.keys(infos).forEach((category) => { // list all langvar categories
                        let elm = $("<div />")
                            .addClass(s.opts.classes.box)
                            .data("lang", lang)
                            .data("info", {
                                category: infos[category],
                                defaults: obj.default ? obj.default[category] : null
                            })
                            .append("<strong>" + category + "</strong>")
                            .appendTo(s.opts.elm.translation.langvars.children("div." + s.opts.classes.boxWrapper));

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
                            $("<span />").addClass(s.opts.classes.translation.requiredInfo).text("(" + s.helper.i18n.get("settings_translation_required_category") + ")").appendTo(elm);
                        }

                        $("<span />").addClass(s.opts.classes.translation.amountInfo).html("<span>" + varsAmount[key].filled + "</span>&thinsp;/&thinsp;" + varsAmount[key].total).appendTo(elm);

                        if (varsAmount[key].total > varsAmount[key].filled) { // incomplete notice for already released translations
                            elm.addClass(s.opts.classes.incomplete);
                            elm.children("a").attr("title", s.helper.i18n.get("settings_translation_incomplete_info"));
                        }
                    });
                } else {
                    gotoOverview();
                }

                s.opts.elm.translation.langvars.removeClass(s.opts.classes.loading);
                loader.remove();
            });
        };
    };

})(jsu);