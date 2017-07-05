($ => {
    "use strict";

    window.FeedbackHelper = function (s) {

        /**
         *
         */
        this.init = async () => {
            s.opts.elm.feedback.faq.children("strong").on("click", (e) => { // faq toggle
                e.preventDefault();
                $(e.currentTarget).next("p").toggleClass(s.opts.classes.visible);
            });

            s.opts.elm.feedback.faq.children("p > a").on("click", (e) => { // handle links inside the faq answers
                e.preventDefault();
                let type = $(e.currentTarget).parent("p").attr(s.opts.attr.type);

                if (type === "usage") {
                    window.open(chrome.extension.getURL("html/intro.html") + "?skip=1", '_blank');
                }
            });

            let loader = s.helper.template.loading().appendTo(s.opts.elm.feedback.form);
            s.opts.elm.feedback.send.addClass(s.opts.classes.hidden);
            s.opts.elm.feedback.form.addClass(s.opts.classes.loading);

            s.helper.model.call("websiteStatus").then((opts) => {
                loader.remove();
                s.opts.elm.feedback.form.removeClass(s.opts.classes.loading);

                if (opts.status === "available") {
                    s.opts.elm.feedback.send.removeClass(s.opts.classes.hidden);
                } else {
                    s.opts.elm.feedback.form.addClass(s.opts.classes.hidden);

                    $("<p />")
                        .addClass(s.opts.classes.error)
                        .html(s.helper.i18n.get("status_feedback_unavailable_desc") + "<br />")
                        .append("<a href='mailto:feedback@blockbyte.de'>feedback@blockbyte.de</a>")
                        .insertAfter(s.opts.elm.feedback.form);
                }
            });
        };

        /**
         * Checks the content of the feedback fields and sends the content via ajax if they are filled properly
         */
        this.send = () => {
            let messageText = s.opts.elm.textarea.feedbackMsg[0].value;
            let emailText = s.opts.elm.field.feedbackEmail[0].value;
            let isEmailValid = emailText.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailText);
            let isMessageValid = messageText.length > 0;

            if (isEmailValid && isMessageValid) {
                let loadStartTime = +new Date();
                let loader = s.helper.template.loading().appendTo(s.opts.elm.body);
                s.opts.elm.body.addClass(s.opts.classes.loading);

                let xhr = new XMLHttpRequest();
                xhr.open("POST", s.opts.ajax.feedback, true);
                xhr.onload = () => {
                    let infos = JSON.parse(xhr.responseText);

                    $.delay(Math.max(0, 1000 - (+new Date() - loadStartTime))).then(() => { // load at least 1s
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
                };
                let formData = new FormData();
                formData.append('email', emailText);
                formData.append('msg', messageText);
                formData.append('version', s.opts.manifest.version);
                formData.append('ua', navigator.userAgent);
                formData.append('lang', s.helper.i18n.getLanguage());
                formData.append('config', JSON.stringify(s.helper.importExport.getExportConfig()));
                xhr.send(formData);

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