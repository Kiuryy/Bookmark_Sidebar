($ => {
    "use strict";

    window.translation = function () {

        /*
         * ################################
         * PUBLIC
         * ################################
         */

        this.languages = {
            af: "Afrikaans",
            ar: "Arabic",
            hy: "Armenian",
            be: "Belarusian",
            bg: "Bulgarian",
            ca: "Catalan",
            "zh-CN": "Chinese (Simplified)",
            "zh-TW": "Chinese (Traditional)",
            hr: "Croatian",
            cs: "Czech",
            da: "Danish",
            nl: "Dutch",
            en: "English",
            eo: "Esperanto",
            et: "Estonian",
            tl: "Filipino",
            fi: "Finnish",
            fr: "French",
            de: "German",
            el: "Greek",
            iw: "Hebrew",
            hi: "Hindi",
            hu: "Hungarian",
            is: "Icelandic",
            id: "Indonesian",
            it: "Italian",
            ja: "Japanese",
            ko: "Korean",
            lv: "Latvian",
            lt: "Lithuanian",
            no: "Norwegian",
            fa: "Persian",
            pl: "Polish",
            pt: "Portuguese",
            ro: "Romanian",
            ru: "Russian",
            sr: "Serbian",
            sk: "Slovak",
            sl: "Slovenian",
            es: "Spanish",
            sw: "Swahili",
            sv: "Swedish",
            th: "Thai",
            tr: "Turkish",
            uk: "Ukrainian",
            vi: "Vietnamese"
        };

        this.opts = {
            elm: {
                content: $("section#content"),
                wrapper: {
                    overview: $("section#content > div[data-name='overview']"),
                    langvars: $("section#content > div[data-name='langvars']")
                }
            },
            classes: {
                hidden: "hidden",
                progress: "progress"
            },
            ajax: {
                info: "https://moonware.de/ajax/extensions/bs/i18n/info",
                langvars: "https://moonware.de/ajax/extensions/bs/i18n/langvars"
            }
        };

        /**
         * Constructor
         */
        this.run = () => {
            this.opts.elm.wrapper.langvars.addClass(this.opts.classes.hidden);
            initHelpers();

            this.helper.template.footer().insertAfter(this.opts.elm.content);

            let xhr = new XMLHttpRequest();
            xhr.open("POST", this.opts.ajax.info, true);
            xhr.onload = () => {
                let infos = JSON.parse(xhr.responseText);

                if (infos && infos.languages) {
                    let list = $("<ul />").appendTo(this.opts.elm.wrapper.overview.children("div"));
                    infos.languages.unshift({name: "sw", varsAmount: 111});
                    infos.languages.unshift({name: "pl", varsAmount: 31});
                    infos.languages.unshift({name: "fr", varsAmount: 156});
                    infos.languages.unshift({name: "cs", varsAmount: 179});

                    infos.languages.sort((a, b) => {
                        return b.varsAmount - a.varsAmount;
                    });

                    let missingLanguages = Object.assign({}, this.languages);

                    infos.languages.forEach((lang) => {
                        delete missingLanguages[lang.name];

                        if (this.languages[lang.name]) {
                            let c = Math.PI * 12 * 2;
                            let percentage = lang.varsAmount / infos.varsAmount * 100;

                            // @toDo Info whether draft or released
                            $("<li />")
                                .append("<strong>" + this.languages[lang.name] + "</strong>")
                                .append("<svg class=" + this.opts.classes.progress + " width='32' height='32' viewPort='0 0 16 16'><circle r='12' cx='16' cy='16'></circle><circle r='12' cx='16' cy='16' stroke-dashoffset='" + ((100 - percentage) / 100 * c) + "' stroke-dasharray='" + c + "'></circle></svg>")
                                .append("<span class='" + this.opts.classes.progress + "'>" + Math.round(lang.varsAmount / infos.varsAmount * 100) + "%</span>")
                                .appendTo(list);
                        }
                    });

                    let select = $("<select name='language' />").appendTo(this.opts.elm.wrapper.overview.children("div"));
                    $("<option value='' />").text("Add language").appendTo(select);

                    Object.keys(missingLanguages).forEach((lang) => {
                        $("<option value='" + lang + "' />").text(this.languages[lang]).appendTo(select);
                    });
                }
            };
            xhr.send();
        };


        /*
         * ################################
         * PRIVATE
         * ################################
         */

        /**
         * Initialises the helper objects
         */
        let initHelpers = () => {
            this.helper = {
                template: new window.TemplateHelper(this)
            };
        };

    };


    new window.translation().run();

})(jsu);