($ => {
    "use strict";

    $.SettingsVideoHelper = function (s) {

        let animationFrame = null;
        let sliderBackground = null;
        let scrubbing = false;
        let pendingSeek = null;

        /**
         * Opens the video dialog when clicking a button with a video name (<a data-video="<name>">),
         * and loads the videos embedded in the page (<video data-video="<name>">),
         * the video is loaded from /video/<name>.webm, or from its alias for the current browser (see $.opts.urlAliases),
         * the optional data-video-title of a button contains the language variable for the headline of the dialog
         */
        this.init = () => {
            const dialog = $(`body > section#video-${$.cl.settings.dialog}`);

            $(`video[${$.attr.settings.video.name}]`).forEach((elm) => {
                const video = $(elm);
                addSource(video, video.attr($.attr.settings.video.name));
            });

            $(`a[${$.attr.settings.video.name}]`).on("click", (e) => {
                e.preventDefault();
                open($(e.currentTarget));
            });

            initControls(dialog);

            dialog.on("close", async () => { // stop the video and remove it after the closing transition, so it doesn't continue loading in the background
                const wrapper = dialog.find(`div.${$.cl.settings.video}`);
                wrapper.find("video").forEach((node) => {
                    node.pause();
                });
                stopPositionUpdates();

                await $.delay(300);
                if (!dialog.hasClass($.cl.visible)) { // the dialog could have been opened again with another video in the meantime
                    wrapper.html("");
                }
            });
        };

        /**
         * Shows the video of the given button in the video dialog, playing muted in a loop
         *
         * @param {jsu} button
         */
        const open = (button) => {
            const dialog = $(`body > section#video-${$.cl.settings.dialog}`);
            const name = button.attr($.attr.settings.video.name);
            const titleVar = button.attr($.attr.settings.video.title) || "settings_example";

            dialog.find("header > h2")
                .attr($.attr.i18n, titleVar)
                .text(s.helper.i18n.get(titleVar));

            const wrapper = dialog.find(`div.${$.cl.settings.video}`).html("");
            const video = $("<video></video>").appendTo(wrapper);
            video.forEach((node) => { // set as properties, since the muted attribute alone doesn't reliably allow autoplay
                node.muted = true;
                node.loop = true;
                node.autoplay = true;
                node.playsInline = true;
            });

            pendingSeek = null;
            const slider = getSlider(dialog);
            slider.attr("max", 0);
            slider[0].value = 0;
            updateSliderFill(slider);
            setPlayState(dialog, true); // autoplay, the play and pause events correct the state if the browser doesn't start it

            video.on("loadedmetadata", (e) => {
                slider.attr("max", e.currentTarget.duration || 0);
                updatePosition(dialog);
            }).on("play", () => {
                setPlayState(dialog, true);
                startPositionUpdates(dialog);
            }).on("pause", () => {
                setPlayState(dialog, false);
                stopPositionUpdates();
                updatePosition(dialog);
            }).on("seeked", (e) => {
                if (pendingSeek !== null) { // the slider was moved further while seeking, continue with the latest position
                    const time = pendingSeek;
                    pendingSeek = null;
                    e.currentTarget.currentTime = time;
                } else {
                    updatePosition(dialog);
                }
            });

            addSource(video, name);
            s.helper.dialog.open("video");
        };

        /**
         * Binds the events of the play/pause button and the position slider in the header of the video dialog,
         * touching or moving the slider pauses the video and jumps to the selected position
         *
         * @param {jsu} dialog
         */
        const initControls = (dialog) => {
            const controls = dialog.find(`div.${$.cl.settings.videoControls}`);
            const slider = getSlider(dialog);

            controls.children(`a.${$.cl.settings.playPause}`).on("click", (e) => {
                e.preventDefault();
                const video = getVideo(dialog);
                if (!video) {
                    return;
                }

                if (video.paused) {
                    video.play()["catch"](() => {
                        // playback is not possible (e.g. the video failed to load)
                    });
                } else {
                    video.pause();
                }
            });

            slider.on("pointerdown", () => {
                scrubbing = true;
                const video = getVideo(dialog);
                if (video) {
                    video.pause();
                }
            }).on("input", (e) => {
                const video = getVideo(dialog);
                if (video) {
                    video.pause();
                    seekTo(video, +e.currentTarget.value);
                }
                updateSliderFill(slider);
            });

            $(document).on("pointerup pointercancel", () => { // on the document, since the pointer can be released outside of the slider
                scrubbing = false;
            });
        };

        /**
         * Jumps to the given position of the video, while the video is still seeking, only the latest position is remembered and applied afterwards (see the seeked event),
         * otherwise every move of the slider would restart the seeking and the video would only show a frame once the slider stops
         *
         * @param {HTMLVideoElement} video
         * @param {number} time
         */
        const seekTo = (video, time) => {
            if (video.seeking) {
                pendingSeek = time;
            } else {
                video.currentTime = time;
            }
        };

        /**
         * Shows the play or the pause icon in the play/pause button, depending on whether the video is playing
         *
         * @param {jsu} dialog
         * @param {boolean} playing
         */
        const setPlayState = (dialog, playing) => {
            const button = dialog.find(`div.${$.cl.settings.videoControls} > a.${$.cl.settings.playPause}`);
            const titleVar = playing ? "settings_video_pause" : "settings_video_play";

            s.setConditionalClass(button, $.cl.settings.paused, !playing);
            button
                .attr($.attr.i18nTitle, titleVar)
                .attr("title", s.helper.i18n.get(titleVar));
        };

        /**
         * Moves the slider along with the video on every frame while it is playing,
         * the timeupdate event only fires a few times per second, which would let the slider jump
         *
         * @param {jsu} dialog
         */
        const startPositionUpdates = (dialog) => {
            stopPositionUpdates();

            const update = () => {
                updatePosition(dialog);
                const video = getVideo(dialog);
                if (video && !video.paused) {
                    animationFrame = requestAnimationFrame(update);
                }
            };
            update();
        };

        /**
         * Stops moving the slider along with the video
         */
        const stopPositionUpdates = () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
        };

        /**
         * Sets the slider to the current position of the video, unless the user is moving the slider
         *
         * @param {jsu} dialog
         */
        const updatePosition = (dialog) => {
            const video = getVideo(dialog);
            if (!video || scrubbing || pendingSeek !== null) { // the slider already shows the position the user selected
                return;
            }

            const slider = getSlider(dialog);
            slider[0].value = video.currentTime;
            updateSliderFill(slider);
        };

        /**
         * Fills the track of the slider up to the current position, like the range fields of the form (see SettingsFormHelper)
         *
         * @param {jsu} slider
         */
        const updateSliderFill = (slider) => {
            if (sliderBackground === null) {
                const background = slider.css("background-image");
                sliderBackground = background && background.indexOf("linear-gradient") === 0 ? background.replace(/-1px/g, "{percent}") : "";
            }

            if (sliderBackground) {
                const node = slider[0];
                const max = +node.max || 0;
                const percent = max > 0 ? 100 * node.value / max : 0;
                slider.css("background-image", sliderBackground.replace(/{percent}/g, percent + "%"));
            }
        };

        /**
         * Returns the slider for the position of the video in the header of the video dialog
         *
         * @param {jsu} dialog
         * @returns {jsu}
         */
        const getSlider = (dialog) => dialog.find(`div.${$.cl.settings.videoControls} > input[type='range']`);

        /**
         * Returns the video element which is currently shown in the video dialog, or null
         *
         * @param {jsu} dialog
         * @returns {HTMLVideoElement|null}
         */
        const getVideo = (dialog) => {
            const video = dialog.find(`div.${$.cl.settings.video} > video`);
            return video.length() > 0 ? video[0] : null;
        };

        /**
         * Adds the source for the video with the given name to the given video element,
         * browsers with an own variant of the video (e.g. Edge) use the alias of the url
         *
         * @param {jsu} video
         * @param {string} name
         */
        const addSource = (video, name) => {
            const src = `/video/${name}.webm`;
            const aliases = $.opts.urlAliases[$.browserName] || {};

            $("<source />")
                .attr({src: aliases[src] || src, type: "video/webm"})
                .appendTo(video);
        };
    };

})(jsu);
