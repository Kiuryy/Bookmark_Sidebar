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

    console.log("Building release...");

    let start = +new Date();
    build.release().then(() => {
        console.log("Release built successfully (" + (+new Date() - start) + "ms)");
    });

    // SCSS Filewatcher -> <PATH_TO_node>/npm.cmd run scss
})();

