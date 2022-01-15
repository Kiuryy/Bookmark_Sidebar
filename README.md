# <img src="https://raw.githubusercontent.com/Kiuryy/Bookmark_Sidebar/master/src/img/icon/256x256.png" width="88" align="left" /> Bookmark Sidebar

[![GitHub release](https://img.shields.io/badge/dynamic/json?label=Version&color=6494f4&cacheSeconds=86400&query=%24.version&url=https%3A%2F%2Fextensions.redeviation.com%2Fajax%2Finfo%2Fbs)](https://github.com/Kiuryy/Bookmark_Sidebar/releases)
[![Chrome Web Store](https://img.shields.io/badge/dynamic/json?label=Users&color=ff8aaf&cacheSeconds=86400&query=%24.users&url=https%3A%2F%2Fextensions.redeviation.com%2Fajax%2Finfo%2Fbs)](https://chrome.google.com/webstore/detail/bookmark-sidebar/jdbnofccmhefkmjbkkdkfiicjkgofkdh)
[![Chrome Web Store](https://img.shields.io/badge/dynamic/json?label=Rating&color=37d102&cacheSeconds=86400&query=%24.rating_avg&url=https%3A%2F%2Fextensions.redeviation.com%2Fajax%2Finfo%2Fbs)](https://chrome.google.com/webstore/detail/bookmark-sidebar/jdbnofccmhefkmjbkkdkfiicjkgofkdh)
[![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-lightgray.svg)](https://www.gnu.org/licenses/gpl-3.0)

---

Bookmark Sidebar is a browser extension, which adds a toggleable sidebar with all your bookmarks on the left or right side of your screen. You can sort, edit, delete or rearrange your bookmarks easily from within the sidebar. There are many configuration options, and the appearance is fully customizable. 

<a href="https://chrome.google.com/webstore/detail/bookmark-sidebar/jdbnofccmhefkmjbkkdkfiicjkgofkdh" target="_blank"><img src="https://extensions.redeviation.com/img/github_download_chrome.png" width="160" /></a>&ensp;
<a href="https://microsoftedge.microsoft.com/addons/detail/lmjefbghkfeppnpofmbfmhgodpclipbl" target="_blank"><img src="https://extensions.redeviation.com/img/github_download_edge.png" width="160" /></a>

The extension should work with all Chromium-based browsers, while officially only Chrome and Edge are fully supported.

If you want to help to translate the extension, feel free to contribute by submitting some translations. Currently, 40 different languages are available.

You have questions, problems or ideas? ... Please do not hesitate to contact me by submitting the feedback form. I'm reading all messages and trying to get back to you as soon as possible.

<a href="https://extensions.redeviation.com/feedback/bs"><img src="https://extensions.redeviation.com/img/github_contact.png" width="160" /></a>

### Release History
See the [Release History](https://github.com/Kiuryy/Bookmark_Sidebar/releases) for an overview about all versions. There is also a compact [Changelog](https://extensions.redeviation.com/changelog/bs) you can take a look at.

### License
This project is licensed under the GNU General Public License v3.0 - see the [license file](license.txt) for details. Any copyright infringement will be legally pursued.

---

## Development

[![JavaScript](https://img.shields.io/badge/JavaScript-efd81d.svg)](https://developer.mozilla.org/de/docs/Web/JavaScript)
[![Node.js](https://img.shields.io/badge/Node.js-74b758.svg)](https://nodejs.org/)
[![SASS](https://img.shields.io/badge/Sass-bf4080.svg)](https://sass-lang.com/)


### Prerequisition

To start with the development of new features for this project you first need to set up your developer environment by installing the following software:
- Nodejs
- Python
- Visual Studio (with C++ core features!)
- Visual Studio Build Tools

### Commands

**_Init_**

This will install all dependencies and rebuild node-sass for your environment. After running this once, you can use the other commands listed below.

```
npm run init
```

**_Update_**

This will update the versions of the dependencies in the `package.json` and install them afterwards.

```
npm run update
```

**_Release_**

This will create a minified version of the source code and place it in a folder `__dist`.

```
npm run release
```

**_SCSS_**

This will parse the scss files to create the css files.

```
npm run scss
```