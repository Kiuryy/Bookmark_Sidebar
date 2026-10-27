($ => {
    "use strict";

    $.SettingsShareInfoHelper = function (s) {

        const checkboxes = {};

        /**
         * Adds a switch to the headline of each category in the share information dialog,
         * changing a switch stores the preference instantly (independent of the "Save changes" button)
         *
         * @returns {Promise}
         */
        this.init = async () => {
            const obj = await $.api.storage.sync.get(["shareInfo"]);
            const shareInfo = obj.shareInfo || {};

            $(`section#share-info-${$.cl.settings.dialog} div.${$.cl.settings.box}`).forEach((elm) => {
                const box = $(elm);
                const name = box.attr($.attr.name);
                const headline = box.children("h3");

                checkboxes[name] = s.helper.checkbox.get($("body"), {[$.attr.name]: name}, "checkbox", "switch").appendTo(headline);

                if (shareInfo[name] === true) {
                    checkboxes[name].trigger("click");
                }

                headline.on("click", () => { // allow toggling the switch by clicking the headline as well
                    checkboxes[name].trigger("click");
                });
            });

            Object.values(checkboxes).forEach((checkbox) => { // bind after setting the initial state, so that doesn't count as a change
                checkbox.children("input[type='checkbox']").on("change", async () => {
                    await s.helper.model.call("updateShareInfo", {
                        config: s.helper.checkbox.isChecked(checkboxes.config),
                        activity: s.helper.checkbox.isChecked(checkboxes.activity)
                    });
                    s.showMessage("share_info_saved", "success");
                });
            });
        };
    };

})(jsu);
