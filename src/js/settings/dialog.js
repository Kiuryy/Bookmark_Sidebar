($ => {
    "use strict";

    $.SettingsDialogHelper = function (s) {

        let previousDialogs = []; // dialogs which were open when another one was opened from them, the last one is shown again when closing the current one

        /**
         * Adds a close button to every dialog of the page (into the header, so it stays visible when scrolling) and binds the events to close them again
         */
        this.init = () => {
            $(`body > section.${$.cl.settings.dialog}`).forEach((elm) => {
                const dialog = $(elm);
                const box = dialog.children("div");
                const header = box.children("header");

                $(`<a class="${$.cl.close}"></a>`)
                    .attr("title", s.helper.i18n.get("overlay_close"))
                    .on("click", (e) => {
                        e.preventDefault();
                        this.close();
                    })
                    .appendTo(header.length() > 0 ? header : box);

                dialog.on("click", (e) => { // click on the area outside the dialog box
                    if (e.target === elm) {
                        this.close();
                    }
                });
            });

            $(document).on("keydown", (e) => {
                if (e.key === "Escape" && this.isOpen()) {
                    this.close();
                }
            });
        };

        /**
         * Opens the dialog with the given name (<section id="<name>-dialog" class="dialog">),
         * an already opened dialog is only hidden and shown again at the same scroll position when the new one gets closed,
         * opening a dialog which is already further down in this history discards everything above it, so it can't end up in a loop
         *
         * @param {string} name
         */
        this.open = (name) => {
            const dialog = $(`body > section#${name}-${$.cl.settings.dialog}`);
            if (dialog.length() === 0) {
                return;
            }

            const current = getOpenDialog();
            if (current && current[0] !== dialog[0]) {
                previousDialogs.push({elm: current[0], scrollTop: current.children("div")[0].scrollTop});
                current.removeClass($.cl.visible);
            }

            const index = previousDialogs.findIndex((entry) => entry.elm === dialog[0]);
            if (index !== -1) {
                previousDialogs = previousDialogs.slice(0, index);
            }

            dialog.addClass($.cl.visible);
            $("body").addClass($.cl.settings.dialogOpen);
        };

        /**
         * Closes the currently opened dialog, a "close" event is triggered on it,
         * so helpers can clean up their dialog (e.g. stop a playing video),
         * if it was opened from another dialog, that one is shown again at its previous scroll position
         */
        this.close = () => {
            const current = getOpenDialog();
            if (current) {
                current.removeClass($.cl.visible).trigger("close");
            }

            const previous = previousDialogs.pop();
            if (previous) {
                $(previous.elm).addClass($.cl.visible).children("div")[0].scrollTop = previous.scrollTop;
            } else {
                $("body").removeClass($.cl.settings.dialogOpen);
            }
        };

        /**
         * Shows a loading indicator in the dialog with the given name instead of its content, or restores the content again
         *
         * @param {string} name
         * @param {boolean} loading
         */
        this.setLoading = (name, loading) => {
            const box = $(`body > section#${name}-${$.cl.settings.dialog} > div`);
            box.children("svg.loading").remove();

            if (loading) {
                s.helper.template.loading().appendTo(box);
                box.addClass($.cl.loading);
            } else {
                box.removeClass($.cl.loading);
            }
        };

        /**
         * Returns whether a dialog is currently opened
         *
         * @returns {boolean}
         */
        this.isOpen = () => getOpenDialog() !== null;

        /**
         * Returns the currently opened dialog or null if there is none
         *
         * @returns {jsu|null}
         */
        const getOpenDialog = () => {
            const dialog = $(`body > section.${$.cl.settings.dialog}.${$.cl.visible}`);
            return dialog.length() > 0 ? dialog : null;
        };
    };

})(jsu);
