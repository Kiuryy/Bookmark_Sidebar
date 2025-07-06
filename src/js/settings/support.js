($ => {
    "use strict";

    $.SupportHelper = function (s) {

        let data = null;
        const suggestionInfo = {
            displayed: [],
            opened: [],
            closed: []
        };

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            if (s.serviceAvailable) {
                const path = s.helper.menu.getPath();
                const showOnlySuggestions = path.length >= 2 && path[0] === "support" && path[1] === "error" && path[2];

                if (showOnlySuggestions) { // user is visiting the page from the fallback new tab page -> do not show faq/form, but suggestions first
                    s.elm.support.wrapper.addClass($.cl.settings.support.onlySuggestions);
                }

                s.elm.field.feedbackEmail.attr("placeholder", "your@mail.com");

                initEvents();
                await initSuggestions();

                if (showOnlySuggestions) { // show suggestions why the fallback new tab page was shown
                    showCommonSuggestions(path[2]);
                }

                if (path[0] === "support") {
                    initFaq();
                }

                await $.delay(500);
            } else {
                s.elm.support.form.addClass($.cl.hidden);
                s.elm.support.faq.addClass($.cl.hidden);

                $("<p></p>")
                    .addClass($.cl.error)
                    .html(s.helper.i18n.get("status_feedback_unavailable_desc") + "<br />")
                    .append("<a href='mailto:feedback@redeviation.com'>feedback@redeviation.com</a>")
                    .insertAfter(s.elm.support.form);
            }
        };

        /**
         * Updates the height of the suggestion wrapper,
         * the height needs to be a defined value, because otherwise new suggestions wouldn't push old suggestions to the top1
         */
        const updateSuggestionWrapperHeight = () => {
            const height = s.elm.support.feedback[0].offsetHeight;
            s.elm.support.suggestions.css("max-height", height + "px");
        };

        /**
         *
         * @returns {Promise}
         */
        const initSuggestions = async () => {
            const xhr = await $.xhr($.opts.website.feedback.suggestions);
            if (xhr && xhr.responseText) {
                const responseString = xhr.responseText.replace(/\{browserName\}/gi, $.browserName);
                const response = JSON.parse(responseString);

                if (response && response.suggestions && response.controls) {
                    data = response;
                }
            }

            const suggestionKey = "other_browser";
            if (isUnsupportedBrowser() && data && data.suggestions && data.suggestions && data.suggestions[suggestionKey]) {
                suggestionInfo.displayed.push(suggestionKey);
                showSuggestion(suggestionKey, data.suggestions[suggestionKey]);
            }
        };

        /**
         * Returns whether the browser is known for incompatibilities
         *
         * @returns {boolean}
         */
        const isUnsupportedBrowser = () => {
            try {
                return navigator.userAgentData.brands.map((b) => b.brand).includes("Brave");
            } catch (e) {
                //
            }
            return /OPERA|OPR\//i.test(navigator.userAgent);
        };

        /**
         * Shows the most common reasons why the sidebar could not be opened,
         * Will be called when a user clicks the notification, that the sidebar could not be opened
         *
         * @param {string} type
         */
        const showCommonSuggestions = (type) => {
            let suggestions = [];
            let showAnswer = false;

            if (type === "general") {
                suggestions = ["not_working", "webstore", "system_pages"];
            } else if (type === "filter") {
                suggestions = ["blacklisted_whitelisted"];
                showAnswer = true;
            }

            suggestions.forEach((key) => {
                if (data && data.suggestions && data.suggestions[key]) {
                    suggestionInfo.displayed.push(key);
                    showSuggestion(key, data.suggestions[key], showAnswer);
                }
            });
        };

        /**
         * Scans the text for keywords and show the appropriate suggestion, if a keyword is found
         *
         * @param {string} text
         */
        const scanForKeywords = (text) => {
            if (data && data.suggestions) {
                Object.entries(data.suggestions).some(([key, suggestion]) => {
                    let foundMatch = false;

                    suggestion.keywords.some((keyword) => { // search keywords in the text
                        if (text.search(new RegExp(keyword, "i")) > -1) {
                            foundMatch = true;
                            return true;
                        }
                    });

                    if (foundMatch && suggestionInfo.displayed.indexOf(key) === -1) { // found suggestion -> show if not already displayed yet
                        suggestionInfo.displayed.push(key);
                        showSuggestion(key, suggestion);
                        return true;
                    }
                });
            }
        };

        /**
         * Shows the given suggestion
         *
         * @param {string} key
         * @param {object} obj
         * @param {boolean} showAnswer
         */
        const showSuggestion = (key, obj, showAnswer = false) => {
            if (data && data.controls) {
                s.helper.model.call("track", {
                    name: "action",
                    value: {name: "suggestion_display", value: key},
                    always: true
                });

                const suggestion = $("<div></div>")
                    .addClass([$.cl.settings.suggestion, $.cl.hidden, $.cl.settings.support.absolute])
                    .attr($.attr.type, key)
                    .append("<strong>" + obj.question.message + "</strong>")
                    .append("<div class='" + $.cl.settings.support.answer + "'>" + obj.answer.message + "</div>")
                    .appendTo(s.elm.support.suggestions);

                $("<p></p>")
                    .append("<a " + $.attr.value + "='1'>" + data.controls.yes.message + "</a>")
                    .append("<a " + $.attr.value + "='0'>" + data.controls.no.message + "</a>")
                    .appendTo(suggestion);

                suggestion.data("links", obj.answer.links || []);

                const answer = suggestion.children("div." + $.cl.settings.support.answer);

                $.delay().then(() => {
                    answer.css("height", answer[0].offsetHeight + "px");
                    answer.addClass([$.cl.settings.support.noHeight, $.cl.hidden]);
                    return $.delay(300);
                }).then(() => {
                    suggestion.css("height", suggestion[0].offsetHeight + "px");
                    suggestion.addClass($.cl.settings.support.noHeight);
                    return $.delay(300);
                }).then(() => {
                    suggestion.removeClass([$.cl.settings.support.absolute, $.cl.settings.support.noHeight]);
                    return $.delay(300);
                }).then(() => {
                    suggestion
                        .css("height", "")
                        .removeClass($.cl.hidden);

                    s.elm.support.suggestions.addClass($.cl.visible);

                    if (showAnswer) {
                        showSuggestionAnswer(suggestion);
                    }
                });
            }
        };

        /**
         *
         * @param {jsu} suggestion
         */
        const showSuggestionAnswer = (suggestion) => {
            const type = suggestion.attr($.attr.type);
            suggestionInfo.opened.push(type);

            s.helper.model.call("track", {
                name: "action",
                value: {name: "suggestion_clicked", value: type},
                always: true
            });

            const controlWrapper = suggestion.children("p").html("");
            controlWrapper.attr($.attr.type, "answer");

            suggestion.data("links").forEach((link) => {
                let href = link.target;
                if ($.opts.urlAliases[$.browserName] && $.opts.urlAliases[$.browserName][href]) { // check, whether there is an alias for this URL for the current browser
                    href = $.opts.urlAliases[$.browserName][href];
                }

                $("<a></a>")
                    .attr("href", href)
                    .text(link.message)
                    .appendTo(controlWrapper);
            });

            if (suggestion.parent()[0] !== s.elm.support.faq[0]) {
                $("<a></a>")
                    .attr($.attr.value, "0")
                    .text(data.controls.close.message)
                    .appendTo(controlWrapper);
            }
            suggestion.children("div." + $.cl.settings.support.answer).removeClass($.cl.settings.support.noHeight);

            $.delay(300).then(() => {
                suggestion.children("div." + $.cl.settings.support.answer).removeClass($.cl.hidden);
            });
        };

        /**
         *
         * @param {jsu} suggestion
         */
        const hideSuggestion = (suggestion) => {
            suggestionInfo.closed.push(suggestion.attr($.attr.type));

            suggestion
                .css("height", suggestion[0].offsetHeight + "px")
                .addClass($.cl.hidden);

            $.delay(200).then(() => {
                suggestion.addClass($.cl.settings.support.noHeight);
                return $.delay(300);
            }).then(() => {
                suggestion.remove();
                return $.delay();
            }).then(() => {
                if (s.elm.support.suggestions.children("div." + $.cl.settings.suggestion).length() === 0) {
                    s.elm.support.suggestions.removeClass($.cl.visible);

                    $.delay(300).then(() => {
                        s.elm.support.wrapper.removeClass($.cl.settings.support.onlySuggestions);
                    });
                }
            });
        };

        /**
         * Initialises the FAQ section
         */
        const initFaq = () => {
            if (s.elm.support.faq.children("div." + $.cl.settings.suggestion).length() > 0) {
                return;
            }

            if (data && data.suggestions && data.controls) {
                s.elm.support.faq.addClass($.cl.loading);
                s.elm.support.feedback.addClass($.cl.hidden);

                Object.entries(data.suggestions).some(([key, obj]) => {
                    if (obj.question && obj.question.faq) {
                        const suggestion = $("<div></div>")
                            .addClass($.cl.settings.suggestion)
                            .attr($.attr.type, key)
                            .append("<strong>" + obj.question.faq + "</strong>")
                            .append("<div class='" + $.cl.settings.support.answer + "'>" + obj.answer.message + "</div>")
                            .append("<p></p>")
                            .appendTo(s.elm.support.faq);

                        suggestion.data("links", obj.answer.links || []);

                        const answer = suggestion.children("div." + $.cl.settings.support.answer);

                        $.delay().then(() => {
                            answer.css("height", answer[0].offsetHeight + "px");
                            answer.addClass([$.cl.settings.support.noHeight, $.cl.hidden]);
                            s.elm.support.faq.removeClass($.cl.hidden);
                            return $.delay(300);
                        }).then(() => {
                            suggestion
                                .css("height", "")
                                .removeClass($.cl.hidden);

                            s.elm.support.faq.removeClass($.cl.loading);

                            return $.delay(120);
                        }).then(() => {
                            s.elm.support.feedback.removeClass($.cl.hidden);
                        });
                    }
                });
            } else {
                s.elm.support.faq.addClass($.cl.hidden);
            }
        };

        /**
         * Initialises the eventhandlers
         */
        const initEvents = () => {
            $(document).on($.opts.events.pageChanged, (e) => {
                if (e.detail.path && e.detail.path[0] === "support") {
                    initFaq();
                }
            });

            $(window).on("resize", () => {
                updateSuggestionWrapperHeight();
            }, {passive: true});

            s.elm.textarea.feedbackMsg.on("mouseup", () => {
                updateSuggestionWrapperHeight();
            }).on("keyup", (e) => {
                scanForKeywords(e.currentTarget.value);
            });

            s.elm.support.showForm.on("click", (e) => { // show feedback form -> is only visible if the feedback form is hidden
                e.preventDefault();
                s.elm.support.wrapper.removeClass($.cl.settings.support.onlySuggestions);

                const rect = s.elm.support.feedback[0].getBoundingClientRect();
                s.elm.content[0].scrollTop = rect.y;
            });

            $([s.elm.support.suggestions, s.elm.support.faq]).on("click", "a[href]:not([href^='#'])", (e) => { // open non local links in the suggestion in a new tab
                e.preventDefault();
                $.api.tabs.create({
                    url: $(e.currentTarget).attr("href"),
                    active: true
                });
            });

            s.elm.support.suggestions.on("click", "a[" + $.attr.value + "]", (e) => { // hide suggestion when user clicked 'no' or show answer when user clicked 'yes'
                e.preventDefault();
                const val = +$(e.currentTarget).attr($.attr.value);
                const suggestion = $(e.currentTarget).parents("div." + $.cl.settings.suggestion).eq(0);

                if (val === 1) { // show answer of the suggestion
                    showSuggestionAnswer(suggestion);
                } else { // hide suggestion
                    hideSuggestion(suggestion);
                }
            });

            s.elm.support.faq.on("click", "div." + $.cl.settings.suggestion + " > strong", (e) => {
                const suggestion = $(e.currentTarget).parent().eq(0);
                showSuggestionAnswer(suggestion);
            });

            s.elm.support.uploadField.on("change", (e) => { // upload screenshots
                if (e.currentTarget.files) {
                    handleFileUpload(e.currentTarget.files);
                }
            });

            s.elm.support.uploadedFiles.on("click", "a." + $.cl.close, (e) => { // remove uploaded screenshot from the list
                e.preventDefault();
                $(e.currentTarget).parent("li").remove();
            });

            s.elm.support.send.on("click", (e) => { // submit feedback form
                e.preventDefault();
                sendFeedback();
            });
        };

        /**
         * Adds the files from the screenshot upload to the list below the message textarea
         *
         * @param {Array} files
         */
        const handleFileUpload = (files) => {
            if (files.length + s.elm.support.uploadedFiles.children("li").length() > 3) { // too many files -> cancel and show error message
                window.alert(s.helper.i18n.get("settings_support_feedback_screenshot_error_amount", [3]));
                return;
            }

            for (const file of files) {
                if (!file.type.match("image")) {
                    continue;
                }

                const reader = new FileReader();
                const filesize = ((file.size / 1024)).toFixed(4); // KB

                if (filesize > 1024) { // filesize is too big -> show error message
                    window.alert(s.helper.i18n.get("settings_support_feedback_screenshot_error_filesize", [file.name]));
                } else {
                    reader.onload = (e) => {
                        try {
                            $("<li></li>")
                                .append("<img src='" + e.target.result + "' />")
                                .append("<span>" + file.name + "</span>")
                                .append("<a class='" + $.cl.close + "'></a>")
                                .appendTo(s.elm.support.uploadedFiles);
                        } catch (e) {
                            //
                        }
                    };

                    reader.readAsDataURL(file);
                }
            }

            s.elm.support.uploadField[0].value = "";
        };


        /**
         * Checks the content of the feedback fields and sends the content via ajax if they are filled properly
         */
        const sendFeedback = async () => {
            const messageText = s.elm.textarea.feedbackMsg[0].value;
            const emailText = s.elm.field.feedbackEmail[0].value;

            const isEmailValid = emailText.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailText);
            const isMessageValid = messageText.length > 0;

            if (isEmailValid && isMessageValid) { // email is valid and the message is not empty
                const loadStartTime = +new Date();
                const loader = s.helper.template.loading().appendTo(s.elm.body);
                s.elm.body.addClass($.cl.loading);

                let infos = null;
                const screenshots = [];

                s.elm.support.uploadedFiles.find("> li > img").forEach((screenshot) => {
                    screenshots.push($(screenshot).attr("src"));
                });

                const config = s.helper.importExport.getExportConfig();
                if (config.utility && config.utility.newtabBackground) { // don't send newtab background
                    delete config.utility.newtabBackground;
                }

                try {
                    const xhr = await $.xhr($.opts.website.feedback.form, {
                        method: "POST",
                        timeout: 30000,
                        data: {
                            email: emailText,
                            msg: messageText,
                            version: $.opts.manifest.version_name || $.opts.manifest.version,
                            lastUpdate: await s.helper.model.call("lastUpdateDate"),
                            ua: navigator.userAgent,
                            browser: $.ua().browser,
                            lang: s.helper.i18n.getLanguage(),
                            userType: s.helper.model.getUserType(),
                            screenshots: JSON.stringify(screenshots),
                            config: JSON.stringify(config, null, 2),
                            suggestions: suggestionInfo
                        }
                    });

                    infos = JSON.parse(xhr.responseText);
                } catch (e) {
                    console.error(e);
                    infos = {success: false};
                }

                await $.delay(Math.max(0, 1000 - (+new Date() - loadStartTime))); // load at least 1s

                s.elm.body.removeClass($.cl.loading);
                loader.remove();

                if (infos && infos.success && infos.success === true) { // successfully submitted -> show message and clear form
                    s.helper.model.call("track", {
                        name: "action",
                        value: {name: "feedback", value: "true"},
                        always: true
                    });

                    s.elm.textarea.feedbackMsg[0].value = "";
                    s.elm.field.feedbackEmail[0].value = "";
                    s.elm.support.uploadedFiles.html("");

                    s.showSuccessMessage("support_feedback_sent_message");
                } else { // not submitted -> raise error
                    await $.delay();
                    alert(s.helper.i18n.get("settings_support_feedback_send_failed"));
                }
            } else if (!isEmailValid) {
                s.elm.field.feedbackEmail.addClass($.cl.error);
            } else if (!isMessageValid) {
                s.elm.textarea.feedbackMsg.addClass($.cl.error);
            }

            await $.delay(700);
            $("." + $.cl.error).removeClass($.cl.error);
        };
    };

})(jsu);