($ => {
    "use strict";

    $.PremiumHelper = function (s) {

        let elm = {};

        /**
         * Initialises the premium tab
         *
         * @returns {Promise}
         */
        this.init = async () => {
            initLayout();
            initEvents();
        };

        /**
         * Initialises the links and info texts in the intro slide
         */
        let initLayout = () => {
            if (s.elm.premium.wrapper.hasClass($.cl.active)) {
                loadBackgroundImages();
            }

            let introSlide = s.elm.premium.wrapper.children("section[" + $.attr.type + "='intro']");

            if (s.helper.model.getUserType() === "premium") {
                $("<span />").attr($.attr.type, "activated").text(s.helper.i18n.get("premium_already_activated")).appendTo(introSlide);
            } else {
                s.elm.aside.find("li[" + $.attr.name + "='premium']").addClass($.cl.settings.inactive); // mark the premium menu point when the user has no premium

                elm.linkPremium = $("<a />").attr($.attr.type, "premium").text(s.helper.i18n.get("premium_get_now")).appendTo(introSlide);
                elm.showLicenseField = $("<a />").attr($.attr.type, "activate").text(s.helper.i18n.get("premium_show_license_input")).appendTo(introSlide);
                elm.licenseField = $("<div />")
                    .attr($.attr.type, "licenseKey")
                    .css("display", "none")
                    .append("<strong>" + s.helper.i18n.get("premium_license_key") + "</strong>")
                    .append("<input type='text' />")
                    .append("<button type='submit'>" + s.helper.i18n.get("premium_activate") + "</button>")
                    .appendTo(introSlide);
            }
        };

        /**
         * Initialises the eventhandler for the premium tab
         */
        let initEvents = () => {
            $(document).on($.opts.events.pageChanged, (e) => {
                if (e.detail.path && e.detail.path[0] === "premium") {
                    loadBackgroundImages();
                }
            });

            elm.linkPremium && elm.linkPremium.on("click", (e) => {
                e.preventDefault();
                chrome.tabs.create({url: $.opts.website.premium + "?lang=" + s.helper.i18n.getLanguage()});
            });

            elm.showLicenseField && elm.showLicenseField.on("click", (e) => {
                e.preventDefault();
                elm.licenseField.css("display", "block");

                $.delay(100).then(() => {
                    elm.licenseField.addClass($.cl.visible);
                });
            });

            elm.licenseField && elm.licenseField.children("button").on("click", (e) => {
                e.preventDefault();
                let loader = s.helper.template.loading().appendTo(s.elm.body);
                s.elm.body.addClass($.cl.loading);

                let licenseKey = elm.licenseField.children("input[type='text']")[0].value;

                Promise.all([
                    s.helper.model.call("activatePremium", {licenseKey: licenseKey}),
                    $.delay(1000)
                ]).then(([info]) => {
                    s.elm.body.removeClass($.cl.loading);
                    loader.remove();

                    if (info && info.success) { // activated successfully -> show success message
                        s.showSuccessMessage("premium_activated");
                    } else { // invalid license key
                        $.delay(100).then(() => {
                            alert(s.helper.i18n.get("settings_premium_invalid_key"));
                        });
                    }
                });

            });
        };

        /**
         * Loads the background images of the slides by replacing the data-src attribute with src attributes
         */
        let loadBackgroundImages = () => {
            s.elm.premium.wrapper.find("img[" + $.attr.src + "]").forEach((_self) => {
                let img = $(_self);
                let src = img.attr($.attr.src);
                img.removeAttr($.attr.src);
                img.attr("src", src);

                $.delay().then(() => {
                    img.addClass($.cl.visible);
                });
            });
        };
    };

})(jsu);