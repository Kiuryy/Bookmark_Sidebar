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
                $("<span />").attr($.attr.type, "activated").text("You are already using Premium").appendTo(introSlide);
            } else {
                s.elm.aside.find("li[" + $.attr.name + "='premium']").addClass($.cl.settings.inactive); // mark the premium menu point when the user has no premium

                elm.linkPremium = $("<a />").attr($.attr.type, "premium").text("Get Premium now").appendTo(introSlide);
                elm.showLicenseField = $("<a />").attr($.attr.type, "activate").text("I already have Premium").appendTo(introSlide);
                elm.licenseField = $("<div />")
                    .attr($.attr.type, "licenseKey")
                    .css("display", "none")
                    .append("<strong>License key</strong>")
                    .append("<input type='text' />")
                    .append("<button type='submit'>Activate Premium</button>")
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
                            alert("Couldn't activate Premium. Please enter a valid license key");
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