($ => {
    "use strict";

    $.SettingsPremiumHelper = function (s) {

        let dialog = null;
        let activating = false;

        /**
         * Initialises the premium dialog and the links opening it
         *
         * @returns {Promise}
         */
        this.init = async () => {
            dialog = $(`section#premium-${$.cl.settings.dialog}`);

            initComparison();
            await initActions();
            initRestrictions();

            if ($.isDev) {
                initDevUserType();
            }

            $(`a.${$.cl.settings.premium.info}`).on("click", (e) => {
                e.preventDefault();
                s.helper.dialog.open("premium");
            });
        };

        /**
         * User types besides premium, which have access to a feature, users with a licence key (premium, premium-plus) can always use all features
         */
        const featureAccess = {
            importExport: [],
            themes: [],
            customCss: ["pre2018"],
            bothModes: ["pre2018", "pre2026"],
            lockPinned: ["pre2018", "pre2026"],
            expert: []
        };

        /**
         * Returns whether the user has a licence key for premium
         *
         * @returns {boolean}
         */
        this.isPremium = () => {
            const userType = s.helper.model.getUserType();
            return userType.startsWith("premium");
        };

        /**
         * Returns whether the user has access to the given feature (see featureAccess)
         *
         * @param {string} feature
         * @returns {boolean}
         */
        this.hasAccess = (feature) => {
            if (this.isPremium()) {
                return true;
            }

            if (!featureAccess[feature]) {
                // eslint-disable-next-line no-console
                console.warn(`Unknown premium feature: ${feature}`);
                return false;
            }

            return featureAccess[feature].includes(s.helper.model.getUserType());
        };

        /**
         * Disables the given element and places a banner in front of it, which tells the user that the feature requires premium
         * and links to the premium dialog, the banner is not added twice for the same element,
         * with replace the element is hidden instead of being displayed disabled below the banner
         *
         * @param {jsu} elm
         * @param {boolean} replace
         */
        this.addRestrictedBanner = (elm, replace = false) => {
            if (elm.hasClass($.cl.settings.premium.restricted)) {
                return;
            }

            const banner = $("<div></div>").addClass($.cl.settings.premium.banner);

            $("<p></p>") // keep the i18n attributes, so the text gets updated when the language is changed
                .attr($.attr.i18n, "premium_restricted_text")
                .text(s.helper.i18n.get("premium_restricted_text"))
                .appendTo(banner);

            $("<a href='#'></a>")
                .addClass("btn")
                .attr($.attr.i18n, "more_link")
                .text(s.helper.i18n.get("more_link"))
                .on("click", (e) => {
                    e.preventDefault();
                    s.helper.dialog.open("premium");
                })
                .appendTo(banner);

            banner.insertBefore(elm);
            elm.addClass($.cl.settings.premium.restricted).attr("inert", ""); // inert also prevents reaching the elements with the keyboard

            if (replace) {
                elm.addClass($.cl.settings.premium.replaced);
            }
        };

        /**
         * Marks the given button with the premium icon and opens the premium dialog when clicking it instead of its regular action,
         * the listener runs in the capture phase, so it is called before the regular click handlers of the button, regardless of when they were added
         *
         * @param {jsu} elm
         */
        this.addRestrictedButton = (elm) => {
            if (elm.hasClass($.cl.settings.premium.locked)) {
                return;
            }

            elm.addClass($.cl.settings.premium.locked).on("click", (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                s.helper.dialog.open("premium");
            }, {capture: true});
        };

        /**
         * Restricts all elements, which are marked with a premium feature (data-premium-feature), the user has no access to,
         * buttons get the premium icon and link to the premium dialog, form fields (see SettingsFormHelper) are replaced by the banner,
         * all other elements get disabled and the banner is placed in front of them,
         * elements marked with data-premium-hidden are hidden completely instead
         */
        const initRestrictions = () => {
            $(`[${$.attr.settings.premiumFeature}]`).forEach((node) => {
                const elm = $(node);

                if (this.hasAccess(elm.attr($.attr.settings.premiumFeature))) {
                    return;
                }

                if (elm.hasClass("btn")) {
                    this.addRestrictedButton(elm);
                } else {
                    this.addRestrictedBanner(elm, node.matches("input, select, textarea"));
                }
            });

            $(`[${$.attr.settings.premiumHidden}]`).forEach((node) => {
                const elm = $(node);

                if (!this.hasAccess(elm.attr($.attr.settings.premiumHidden))) {
                    elm.addClass($.cl.hidden);
                }
            });
        };

        /**
         * Highlights the column of the premium comparison table, which matches the tier of the user
         */
        const initComparison = () => {
            const table = dialog.find(`table.${$.cl.settings.premium.comparison}`);
            const tiers = [];
            table.find("thead th").forEach((elm) => {
                tiers.push($(elm).attr($.attr.name));
            });
            const idx = tiers.indexOf(this.isPremium() ? "premium" : "free");

            table.find("tr").forEach((row) => {
                $(row).children().eq(idx).addClass($.cl.active);
            });
        };

        /**
         * Initialises either the purchase link and the licence key form, or the licence key the user has activated
         * (which of both is visible is controlled by the data-usertype attribute of the body)
         *
         * @returns {Promise}
         */
        const initActions = async () => {
            if (this.isPremium()) {
                await initLicenseKeyInfo();
            } else {
                initPurchaseEvents();
            }
        };

        /**
         * Displays the licence key of the user (users of the old premium version have none, so the line stays hidden)
         *
         * @returns {Promise}
         */
        const initLicenseKeyInfo = async () => {
            const wrapper = dialog.find(`div.${$.cl.settings.premium.actions}[${$.attr.settings.userType}='premium'] p.${$.cl.settings.premium.licenseKey}`);
            const response = await s.helper.model.call("licenseKey");

            if (!response || !response.licenseKey) {
                wrapper.addClass($.cl.hidden);
                return;
            }

            wrapper.children("span").text(response.licenseKey);
        };

        /**
         * Dev only: Adds a dropdown to the dialog, which allows changing the user type for testing purposes,
         * premium can't be selected, since it requires activating a licence key the regular way,
         * the dropdown is hidden until the title of the dialog is triple clicked
         */
        const initDevUserType = () => {
            const userType = s.helper.model.getUserType();
            const wrapper = $("<div></div>")
                .addClass([$.cl.settings.premium.devUserType, $.cl.hidden])
                .insertBefore(dialog.find(`table.${$.cl.settings.premium.comparison}`));

            dialog.find("header > h2").on("click", (e) => {
                if (e.detail === 3) {
                    wrapper.removeClass($.cl.hidden);
                }
            });

            $("<strong></strong>").text("User type (dev only)").appendTo(wrapper);
            const select = $("<select></select>").appendTo(wrapper);

            ["free", "pre2018", "pre2026"].forEach((type) => {
                $("<option></option>").attr("value", type).text(type).appendTo(select);
            });

            if (this.isPremium()) { // only displayed as the current state
                $("<option></option>").attr({value: userType, disabled: true}).text(userType).appendTo(select);
            }

            select[0].value = userType;

            select.on("change", async () => {
                await s.helper.model.call("devUserType", {userType: select[0].value});
                location.reload();
            });
        };

        /**
         * Initialises the purchase link and the form to activate an existing licence key
         */
        const initPurchaseEvents = () => {
            const wrapper = dialog.find(`div.${$.cl.settings.premium.actions}[${$.attr.settings.userType}='free']`);
            const licenseField = wrapper.children(`div.${$.cl.settings.premium.licenseKey}`);
            const input = licenseField.find("input[type='text']");

            wrapper.find(`a[${$.attr.type}='checkout']`).on("click", (e) => {
                e.preventDefault();
                s.openLink($.opts.website.premium.checkout + "?lang=" + s.helper.i18n.getLanguage());
            });

            wrapper.find(`a[${$.attr.type}='showLicenseField']`).on("click", (e) => {
                e.preventDefault();
                licenseField.addClass($.cl.visible);
                input[0].focus();
            });

            wrapper.find(`a[${$.attr.type}='activate']`).on("click", (e) => {
                e.preventDefault();
                activateLicenseKey(input);
            });

            input.on("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    activateLicenseKey(input);
                }
            });

            input.on("input", () => {
                input.removeClass($.cl.error);
            });
        };

        /**
         * Checks whether the entered licence key is valid and activates premium if so
         *
         * @param {jsu} input
         * @returns {Promise}
         */
        const activateLicenseKey = async (input) => {
            if (activating) { // activation is already running
                return;
            }

            const licenseKey = input[0].value.replace(/\s/g, "");
            if (licenseKey.length === 0) {
                input.addClass($.cl.error);
                return;
            }

            activating = true;
            s.helper.dialog.setLoading("premium", true);

            const [info] = await Promise.all([
                s.helper.model.call("activatePremium", {licenseKey: licenseKey}),
                $.delay(1000)
            ]);

            if (info && info.success) { // activated successfully -> show success message and reload the page (the dialog keeps loading until then)
                s.showMessage("premium_activated", "success");
                await $.delay(1500);
                location.reload();
            } else { // invalid licence key or error storing the key
                s.helper.dialog.setLoading("premium", false);
                activating = false;
                input.addClass($.cl.error);
                await $.delay(100);
                alert((info && info.message) || s.helper.i18n.get("settings_premium_invalid_key"));
            }
        };
    };

})(jsu);
