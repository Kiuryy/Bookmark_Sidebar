(() => {
    "use strict";

    /* global build */
    global.path = {
        src: "src/",
        dist: "dist/",
        tmp: "tmp/"
    };

    require("./_func");
    require("./_build");

    console.log("Building release...\n");

    let start = +new Date();
    build.release().then(() => {
        console.log("\nRelease built successfully\t[" + (+new Date() - start) + " ms]");
    });

    // SCSS Filewatcher -> <PATH_TO_node>/npm.cmd run scss
})();

