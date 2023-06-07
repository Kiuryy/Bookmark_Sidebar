($ => {
    "use strict";

    const Sidepanel = function () {

        /**
         * Constructor
         */
        this.run = async () => {
            loadSidebar();
        };

        /**
         * Injects the scripts and stylesheets to load the sidebar
         *
         * @returns {Promise}
         */
        const loadSidebar = () => {
            return new Promise((resolve) => {
                $("[" + $.attr.type + "='script_sidebar']").remove();

                $.opts.manifest.content_scripts[0].css.forEach((css) => {
                    $("<link />").attr({
                        href: $.api.runtime.getURL(css),
                        type: "text/css",
                        rel: "stylesheet",
                        [$.attr.type]: "script_sidebar"
                    }).appendTo("head");
                });

                const loadJs = (i = 0) => {
                    let js = $.opts.manifest.content_scripts[0].js[i];

                    if (typeof js !== "undefined") {
                        const script = document.createElement("script");
                        document.head.appendChild(script);
                        script.onload = () => loadJs(i + 1); // load one after another
                        if (!js.includes("://")) {
                            js = "/" + js;
                        }
                        script.src = js;
                        $(script).attr($.attr.type, "script_sidebar");
                    } else {
                        resolve();
                    }
                };

                loadJs();
            });
        };
    };

    new Sidepanel().run();
})(jsu);