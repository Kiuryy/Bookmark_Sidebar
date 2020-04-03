($ => {
    "use strict";

    $.PremiumHelper = function (s) {

        const elm = {};

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
        const initLayout = () => {
            const introSlide = s.elm.premium.wrapper.children("section[" + $.attr.type + "='intro']");

            if (s.helper.model.getUserType() === "premium") { // user has already premium -> show text and the license key
                $("<span />").attr($.attr.type, "activated").text(s.helper.i18n.get("premium_already_activated")).appendTo(introSlide);

                s.helper.model.call("licenseKey").then((response) => { // show the used license key
                    if (response && response.licenseKey) {
                        $("<span />")
                            .attr($.attr.type, "key")
                            .append("<strong>" + s.helper.i18n.get("premium_license_key") + ":</strong>")
                            .append("<span>" + response.licenseKey + "</span>")
                            .appendTo(introSlide);
                    }
                });
            } else { // user is not using premium
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
        const initEvents = () => {
            elm.linkPremium && elm.linkPremium.on("click", (e) => {
                e.preventDefault();
                $.api.tabs.create({url: $.opts.website.premium.checkout + "?lang=" + s.helper.i18n.getLanguage()});
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
                const loader = s.helper.template.loading().appendTo(s.elm.body);
                s.elm.body.addClass($.cl.loading);

                let licenseKey = elm.licenseField.children("input[type='text']")[0].value;
                licenseKey = licenseKey.replace(/\s/g, "");

                Promise.all([
                    s.helper.model.call("activatePremium", {licenseKey: licenseKey}),
                    $.delay(1000)
                ]).then(([info]) => {
                    s.elm.body.removeClass($.cl.loading);
                    loader.remove();

                    if (info && info.success) { // activated successfully -> show success message
                        s.showSuccessMessage("premium_activated");
                        $.delay(1500).then(() => {
                            location.reload(true);
                        });
                    } else { // invalid license key or error storing the key
                        $.delay(100).then(() => {
                            alert(info.message || s.helper.i18n.get("settings_premium_invalid_key"));
                        });
                    }
                });

            });
        };
    };

})(jsu);