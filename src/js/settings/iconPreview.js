($ => {
    "use strict";

    $.SettingsIconPreviewHelper = function (s) {

        /**
         * Renders the shapes into the options of the icon selectors
         */
        this.init = () => {
            $(".icon-selector ul > li").forEach((option) => {
                s.helper.utility.getIconImageData({
                    shape: $(option).attr($.attr.value),
                    color: "#ffffff",
                    background: "transparent",
                    padding: 0
                }).then((faviconBase64) => {
                    $(option).find("> span > span").css("background-image", `url(${faviconBase64})`);
                });
            });
        };

        /**
         * Creates a preview, which draws the icon described by getImageOptions() into the canvas of the given wrapper,
         * the wrapper shows the browser mockup in the surface of the operating system, since the browser ui follows it independently of the theme of the settings page,
         * the preview is rendered again when the system surface changes
         *
         * @param {string} wrapperSelector
         * @param {function} getImageOptions returns the options for utility.getIconImageData()
         * @returns {function} renders the preview with the current options, calls while rendering are combined into one additional run
         */
        this.create = (wrapperSelector, getImageOptions) => {
            let running = false;
            let awaitUpdate = false;

            const render = async () => {
                if (running) { // already running -> render again, after the current run is ready
                    awaitUpdate = true;
                    return;
                }

                awaitUpdate = false;
                running = true;

                const wrapper = $(wrapperSelector);
                s.setConditionalClass(wrapper, $.cl.page.dark, s.helper.stylesheet.getSystemSurface() === "dark");

                const canvas = wrapper.children("canvas")[0];
                const image = new Image();
                image.onload = async () => {
                    const ctx = canvas.getContext("2d");
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(image, 0, 0);

                    running = false;
                    if (awaitUpdate) {
                        await render();
                    }
                };

                image.src = await s.helper.utility.getIconImageData(getImageOptions());
            };

            $(document).on($.opts.events.systemColorChanged, render);

            return render;
        };
    };

})(jsu);
