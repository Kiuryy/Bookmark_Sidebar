module.exports = function (grunt) {
    "use strict";

    let path = {
        src: "src/",
        dist: "dist/"
    };

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        sass: {
            src: {
                options: {
                    update: true,
                    sourcemap: 'auto',
                    style: 'expanded'
                },
                files: [{
                    expand: true,
                    cwd: path.src + 'scss',
                    src: ['**/*.scss'],
                    dest: path.src + 'css/',
                    ext: '.css'
                }]
            },
            dist: {
                options: {
                    sourcemap: 'none',
                    style: 'compressed'
                },
                files: [{
                    expand: true,
                    cwd: path.src + 'scss',
                    src: ['**/*.scss'],
                    dest: path.dist + 'css/',
                    ext: '.css'
                }]
            }
        },
        concat: {
            distExtension: {
                options: {},
                src: [path.src + 'js/lib/jsu.js', path.src + 'js/helper/*.js', path.src + 'js/extension.js', path.src + 'js/init.js'],
                dest: 'tmp/extension-merged.js'
            },
            distSettings: {
                options: {},
                src: [path.src + 'js/lib/colorpicker.js', path.src + 'js/helper/checkbox.js', path.src + 'js/settings/*.js', path.src + 'js/settings.js'],
                dest: 'tmp/settings-merged.js'
            }
        },
        babel: {
            dist: {
                options: {
                    presets: ['babel-preset-es2015', 'babel-preset-es2016', 'babel-preset-es2017']
                },
                files: {
                    ['tmp/extension-es5.js']: 'tmp/extension-merged2.js',
                    ['tmp/settings-es5.js']: 'tmp/settings-merged2.js',
                    ['tmp/lib/jsu-es5.js']: path.src + 'js/lib/jsu.js',
                    ['tmp/lib/i18n-es5.js']: path.src + 'js/helper/i18n.js',
                    ['tmp/lib/model-es5.js']: path.src + 'js/helper/model.js',
                    ['tmp/lib/template-es5.js']: path.src + 'js/helper/template.js',
                    ['tmp/translation-es5.js']: path.src + 'js/translation.js',
                    ['tmp/howto-es5.js']: path.src + 'js/howto.js',
                    ['tmp/changelog-es5.js']: path.src + 'js/changelog.js',
                    ['tmp/model-es5.js']: path.src + 'js/model.js'
                }
            }
        },
        uglify: {
            dist: {
                options: {
                    banner: '/*! (c) <%= pkg.author %> under <%= pkg.license %> */',
                    mangle: {
                        toplevel: true,
                        except: ['jsu']
                    }
                },
                files: {
                    ['tmp/js/extension.js']: 'tmp/extension-es5.js',
                    ['tmp/js/lib/jsu.js']: 'tmp/lib/jsu-es5.js',
                    ['tmp/js/lib/i18n.js']: 'tmp/lib/i18n-es5.js',
                    ['tmp/js/lib/model.js']: 'tmp/lib/model-es5.js',
                    ['tmp/js/lib/template.js']: 'tmp/lib/template-es5.js',
                    ['tmp/js/settings.js']: 'tmp/settings-es5.js',
                    ['tmp/js/translation.js']: 'tmp/translation-es5.js',
                    ['tmp/js/howto.js']: 'tmp/howto-es5.js',
                    ['tmp/js/changelog.js']: 'tmp/changelog-es5.js',
                    ['tmp/js/model.js']: 'tmp/model-es5.js'
                }
            }
        },
        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true
                },
                files: [{
                    expand: true,
                    cwd: path.src + "html",
                    src: '**/*.html',
                    dest: path.dist + "html/"
                }, {
                    expand: true,
                    cwd: "tmp/html",
                    src: "*.html",
                    dest: path.dist + "html/"
                }]
            }
        },
        'string-replace': {
            distJs: {
                options: {
                    replacements: [{
                        pattern: /\}\)\(jsu\);[\s\S]*?\(\$\s*\=\>\s*\{[\s\S]*?\"use strict\";/mig,
                        replacement: ''
                    }]
                },
                files: {
                    ['tmp/extension-merged2.js']: 'tmp/extension-merged.js',
                    ['tmp/settings-merged2.js']: 'tmp/settings-merged.js',
                    ['tmp/translation-merged2.js']: 'tmp/translation-merged.js',
                }
            },
            distHtml: {
                options: {
                    replacements: [{
                        pattern: /<\!\-\-\s*\[START\sREMOVE\]\s*\-\->[\s\S]*?<\!\-\-\s*\[END\sREMOVE\]\s*\-\->/mig,
                        replacement: ''
                    }, {
                        pattern: /\/js\/helper\//ig,
                        replacement: '/js/lib/'
                    }]
                },
                files: {
                    ['tmp/html/settings.html']: path.src + 'html/settings.html',
                    ['tmp/html/translate.html']: path.src + 'html/translate.html',
                    ['tmp/html/changelog.html']: path.src + 'html/changelog.html',
                    ['tmp/html/howto.html']: path.src + 'html/howto.html',
                }
            },
            distManifest: {
                options: {
                    replacements: [{
                        pattern: /("content_scripts":[\s\S]*?"js":\s?\[)([\s\S]*?)(\])/mig,
                        replacement: '$1"js/extension.js"$3'
                    }, {
                        pattern: /("version":[\s]*")[^"]*("[\s]*,)/ig,
                        replacement: '$1<%= pkg.version %>$2'
                    }, {
                        pattern: /"version_name":[^,]*,/ig,
                        replacement: ''
                    }, {
                        pattern: /(img\/icon\/)dev\/(.*)\.png/ig,
                        replacement: '$1$2.webp'
                    }]
                },
                files: {
                    ['tmp/manifest.json']: path.src + 'manifest.json'
                }
            }
        },
        json_minification: {
            dist: {
                files: [
                    {expand: true, cwd: "tmp", src: ['manifest.json'], dest: path.dist},
                    {expand: true, cwd: path.src + "_locales", src: ['**/*.json'], dest: path.dist + "_locales"}
                ]
            }
        },
        copy: {
            dist: {
                files: [
                    {expand: true, cwd: path.src, src: ['img/**', '!**/*.xcf', '!img/icon/dev/**'], dest: path.dist},
                    {expand: true, cwd: "tmp/", src: ['js/**'], dest: path.dist}
                ]
            }
        },
        clean: {
            sass: {
                src: ['.sass-cache/**']
            },
            distPre: {
                src: ['dist/*']
            },
            distPost: {
                src: ['tmp/**']
            }
        }
    });


    [
        'grunt-contrib-sass',
        'grunt-contrib-concat',
        'grunt-babel',
        'grunt-contrib-uglify',
        'grunt-contrib-htmlmin',
        'grunt-string-replace',
        'grunt-json-minification',
        'grunt-contrib-copy',
        'grunt-contrib-clean'
    ].forEach((task) => {
        grunt.loadNpmTasks(task);
    });

    grunt.registerTask('scss', ['sass:src', 'clean:sass']);
    grunt.registerTask('release', [
        'clean:distPre',
        'concat:distExtension',
        'concat:distSettings',
        'string-replace:distJs',
        'string-replace:distHtml',
        'babel:dist',
        'uglify:dist',
        'htmlmin:dist',
        'string-replace:distManifest',
        'json_minification:dist',
        'sass:dist',
        'copy:dist',
        'clean:sass',
        'clean:distPost'
    ]);

    // UPDATE NPM devDependencies -> 'npm update --dev --save'
};