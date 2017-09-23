($ => {
    "use strict";

    window.EditHelper = function (n) {

        let editMode = false;

        /**
         *
         * @returns {Promise}
         */
        this.init = async () => {
            editMode = location.href.search(/#edit$/) > -1;

            $("EDITBUTTON").on("click", (e) => {
                e.preventDefault();

                if (!editMode) {
                    history.pushState({}, null, location.href + "#edit");
                }
            });
        };

    };

})(jsu);