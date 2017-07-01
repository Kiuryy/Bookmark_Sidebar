($ => {
    "use strict";

    window.ContributeHelper = function (s) {

        /**
         * Initialises the contribution tab
         */
        this.init = async () => {
            handleTranslationInfo();
            initEvents();
        };

        /**
         * Adds notices to the settings if the language of the user has published categories which are incomplete
         */
        let handleTranslationInfo = async () => {
            let language = s.helper.i18n.getLanguage();

            if (language !== s.helper.i18n.getDefaultLanguage()) {
                let xhr = new XMLHttpRequest();
                xhr.open("POST", s.opts.ajax.translationInfo, true);
                xhr.onload = () => {
                    let infos = JSON.parse(xhr.responseText);

                    if (infos && infos.languages) {
                        infos.languages.some((lang) => {
                            if (lang.name === language) { // current language
                                Object.keys(lang.categories).some((name) => {
                                    if ((name !== "Settings" || lang.categories[name] / infos.categories[name] * 100 > 75) && infos.categories[name] > lang.categories[name]) { // a published category of this language is imcomplete
                                        s.opts.elm.header.find("> ul." + s.opts.classes.tabs.list + " > li[" + s.opts.attr.name + "='contribute']")
                                            .attr("title", s.helper.i18n.get("translation_incomplete_info"))
                                            .addClass(s.opts.classes.incomplete);

                                        $("<br />").appendTo(s.opts.elm.contribute.translationTabContent);
                                        $("<p />")
                                            .addClass(s.opts.classes.incomplete)
                                            .text(s.helper.i18n.get("translation_incomplete_info"))
                                            .appendTo(s.opts.elm.contribute.translationTabContent);

                                        s.opts.elm.contribute.translationTabLink.trigger("click");
                                        return true;
                                    }
                                });

                                return true;
                            }
                        });
                    }
                };
                xhr.send();
            }
        };

        /**
         * Initialises the eventhandler for the contribution tab
         */
        let initEvents = async () => {
            chrome.storage.sync.get(["shareUserdata"], (obj) => {
                if (obj.shareUserdata && obj.shareUserdata === true) {
                    s.opts.elm.checkbox.shareUserdata.trigger("click");
                }

                s.opts.elm.checkbox.shareUserdata.children("input[type='checkbox']").on("change", () => { // update the shareUserdata checkbox
                    chrome.storage.sync.set({
                        shareUserdata: s.helper.checkbox.isChecked(s.opts.elm.checkbox.shareUserdata)
                    }, () => {
                        s.showSuccessMessage("saved_share_userdata");
                    });
                });
            });

            s.opts.elm.contribute.action.on("click", (e) => {
                e.preventDefault();
                let type = $(e.currentTarget).parents("[" + s.opts.attr.name + "]").eq(0).attr(s.opts.attr.name);
                switch (type) {
                    case "donation": { // open donation link in new tab
                        window.open(s.opts.donateLink, '_blank');
                        break;
                    }
                    case "translation": { // open translation overview in new tab
                        window.open(chrome.extension.getURL("html/translate.html"), '_blank');
                        break;
                    }
                }
            });
        };
    };

})(jsu);