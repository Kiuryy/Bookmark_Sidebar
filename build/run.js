(() => {
    "use strict";

    /* eslint-disable no-console */
    /* global build */
    global.path = {
        src: "src/",
        dist: "dist/",
        tmp: "__tmp/"
    };

    require("./_func");
    require("./_build");

    console.log("Building release...\n");

    const start = +new Date();
    build.release().then(() => {
        console.log("\nRelease built successfully\t[" + (+new Date() - start) + " ms]");
    });

    // SCSS Filewatcher -> <PATH_TO_node>/npm.cmd run scss
})();