($ => {
    "use strict";

    window.FeedbackHelper = function (s) {

        let data = null;
        let suggestionInfo = {
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
                initEvents();
                initSuggestions().then(() => {
                    let path = s.helper.menu.getPath();

                    if (path.length >= 2 && path[0] === "feedback" && path[1] === "notification") {
                        showCommonSuggestions();
                    }
                });
            } else {
                s.opts.elm.feedback.form.addClass(s.opts.classes.hidden);

                $("<p />")
                    .addClass(s.opts.classes.error)
                    .html(s.helper.i18n.get("status_feedback_unavailable_desc") + "<br />")
                    .append("<a href='mailto:feedback@blockbyte.de'>feedback@blockbyte.de</a>")
                    .insertAfter(s.opts.elm.feedback.form);
            }
        };

        /**
         * Updates the height of the suggestion wrapper,
         * the height needs to be a defined value, because otherwise new suggestions wouldn't push old suggestions to the top1
         */
        let updateSuggestionWrapperHeight = () => {
            let height = s.opts.elm.feedback.feedback[0].offsetHeight;
            s.opts.elm.feedback.suggestions.css("max-height", height + "px");
        };

        /**
         *
         * @returns {Promise}
         */
        let initSuggestions = () => {
            return new Promise((resolve) => {
                $.xhr(s.opts.ajax.feedback.suggestions).then((xhr) => {
                    if (xhr && xhr.responseText) {
                        let response = JSON.parse(xhr.responseText);

                        if (response && response.suggestions && response.controls) {
                            data = response;
                        }
                    }

                    resolve();
                });
            });
        };

        /**
         * Shows the most common reasons why the sidebar could not be opened,
         * Will be called when a user clicks the notification, that the sidebar could not be opened
         */
        let showCommonSuggestions = () => {
            ["not_working", "webstore", "system_pages"].forEach((key, i) => {
                $.delay(i * 700).then(() => {
                    if (data && data.suggestions && data.suggestions[key]) {
                        suggestionInfo.displayed.push(key);
                        showSuggestion(key, data.suggestions[key]);
                    }
                });
            });
        };

        /**
         * Scans the text for keywords and show the appropriate suggestion, if a keyword is found
         *
         * @param {string} text
         */
        let scanForKeywords = (text) => {
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
         */
        let showSuggestion = (key, obj) => {
            if (data && data.controls) {
                s.helper.model.call("trackEvent", {
                    category: "settings",
                    action: "suggestion_display",
                    label: key
                });

                let suggestion = $("<div />")
                    .addClass([s.opts.classes.feedback.suggestion, s.opts.classes.hidden, s.opts.classes.feedback.absolute])
                    .attr(s.opts.attr.type, key)
                    .append("<strong>" + obj.question.message + "</strong>")
                    .append("<div class='" + s.opts.classes.feedback.answer + "'>" + obj.answer.message + "</div>")
                    .appendTo(s.opts.elm.feedback.suggestions);

                $("<p />")
                    .append("<a " + s.opts.attr.value + "='1'>" + data.controls.yes.message + "</a>")
                    .append("<a " + s.opts.attr.value + "='0'>" + data.controls.no.message + "</a>")
                    .appendTo(suggestion);

                suggestion.data("links", obj.answer.links || []);

                let answer = suggestion.children("div." + s.opts.classes.feedback.answer);

                $.delay().then(() => {
                    answer.css("height", answer[0].offsetHeight + "px");
                    answer.addClass([s.opts.classes.feedback.noHeight, s.opts.classes.hidden]);

                    return $.delay(300);
                }).then(() => {
                    suggestion.css("height", suggestion[0].offsetHeight + "px");
                    suggestion.addClass(s.opts.classes.feedback.noHeight);

                    return $.delay(300);
                }).then(() => {
                    suggestion.removeClass([s.opts.classes.feedback.absolute, s.opts.classes.feedback.noHeight]);
                    return $.delay(300);
                }).then(() => {
                    suggestion
                        .css("height", "")
                        .removeClass(s.opts.classes.hidden);

                    s.opts.elm.feedback.suggestions.addClass(s.opts.classes.visible);
                });
            }
        };

        /**
         *
         * @param {jsu} suggestion
         */
        let showSuggestionAnswer = (suggestion) => {
            let type = suggestion.attr(s.opts.attr.type);
            suggestionInfo.opened.push(type);

            s.helper.model.call("trackEvent", {
                category: "settings",
                action: "suggestion_true",
                label: type
            });

            let controlWrapper = suggestion.children("p").html("");

            suggestion.data("links").forEach((link) => {
                $("<a />")
                    .attr("href", link.target)
                    .text(link.message)
                    .appendTo(controlWrapper);
            });

            $("<a />")
                .attr(s.opts.attr.value, "0")
                .text(data.controls.close.message)
                .appendTo(controlWrapper);

            suggestion.children("div." + s.opts.classes.feedback.answer).removeClass(s.opts.classes.feedback.noHeight);

            $.delay(300).then(() => {
                suggestion.children("div." + s.opts.classes.feedback.answer).removeClass(s.opts.classes.hidden);
            });
        };

        /**
         *
         * @param {jsu} suggestion
         */
        let hideSuggestion = (suggestion) => {
            suggestionInfo.closed.push(suggestion.attr(s.opts.attr.type));

            suggestion
                .css("height", suggestion[0].offsetHeight + "px")
                .addClass(s.opts.classes.hidden);

            $.delay(200).then(() => {
                suggestion.addClass(s.opts.classes.feedback.noHeight);
                return $.delay(300);
            }).then(() => {
                suggestion.remove();
                return $.delay();
            }).then(() => {
                if (s.opts.elm.feedback.suggestions.children("div." + s.opts.classes.feedback.suggestion).length() === 0) {
                    s.opts.elm.feedback.suggestions.removeClass(s.opts.classes.visible);
                }
            });
        };

        /**
         * Initialises the eventhandlers
         *
         * @returns {Promise}
         */
        let initEvents = async () => {
            $(window).on("resize", () => {
                updateSuggestionWrapperHeight();
            });

            s.opts.elm.textarea.feedbackMsg.on("mouseup", () => {
                updateSuggestionWrapperHeight();
            }).on("keyup", (e) => {
                scanForKeywords(e.currentTarget.value);
            });

            s.opts.elm.feedback.suggestions.on("click", "a[href]:not([href^='#'])", (e) => { // open non local links in the suggestion in a new tab
                e.preventDefault();
                chrome.tabs.create({
                    url: $(e.currentTarget).attr("href"),
                    active: true
                });
            });

            s.opts.elm.feedback.suggestions.on("click", "a[" + s.opts.attr.value + "]", (e) => { // hide suggestion when user clicked 'no' or show answer when user clicked 'yes'
                e.preventDefault();
                let val = +$(e.currentTarget).attr(s.opts.attr.value);
                let suggestion = $(e.currentTarget).parents("div." + s.opts.classes.feedback.suggestion).eq(0);

                if (val === 1) { // show answer of the suggestion
                    showSuggestionAnswer(suggestion);
                } else { // hide suggestion
                    hideSuggestion(suggestion);
                }
            });

            s.opts.elm.feedback.send.on("click", (e) => { // submit feedback form
                e.preventDefault();
                sendFeedback();
            });
        };

        /**
         * Checks the content of the feedback fields and sends the content via ajax if they are filled properly
         */
        let sendFeedback = () => {
            let messageText = s.opts.elm.textarea.feedbackMsg[0].value;
            let emailText = s.opts.elm.field.feedbackEmail[0].value;
            let isEmailValid = emailText.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailText);
            let isMessageValid = messageText.length > 0;

            if (isEmailValid && isMessageValid) {
                let loadStartTime = +new Date();
                let loader = s.helper.template.loading().appendTo(s.opts.elm.body);
                s.opts.elm.body.addClass(s.opts.classes.loading);
                let infos = null;

                $.xhr(s.opts.ajax.feedback.form, {
                    method: "POST",
                    data: {
                        email: emailText,
                        msg: messageText,
                        version: s.opts.manifest.version_name,
                        ua: navigator.userAgent,
                        lang: s.helper.i18n.getLanguage(),
                        config: s.helper.importExport.getExportConfig(),
                        suggestions: suggestionInfo
                    }
                }).then((xhr) => {
                    infos = JSON.parse(xhr.responseText);
                    return $.delay(Math.max(0, 1000 - (+new Date() - loadStartTime))); // load at least 1s
                }).then(() => {
                    s.opts.elm.body.removeClass(s.opts.classes.loading);
                    loader.remove();

                    if (infos && infos.success && infos.success === true) { // successfully submitted -> show message and clear form
                        s.opts.elm.textarea.feedbackMsg[0].value = "";
                        s.opts.elm.field.feedbackEmail[0].value = "";
                        s.showSuccessMessage("feedback_sent_message");
                    } else { // not submitted -> raise error
                        $.delay().then(() => {
                            alert(s.helper.i18n.get("settings_feedback_send_failed"));
                        });
                    }
                });
            } else if (!isEmailValid) {
                s.opts.elm.field.feedbackEmail.addClass(s.opts.classes.error);
            } else if (!isMessageValid) {
                s.opts.elm.textarea.feedbackMsg.addClass(s.opts.classes.error);
            }

            $.delay(700).then(() => {
                $("." + s.opts.classes.error).removeClass(s.opts.classes.error);
            });
        };
    };

})(jsu);