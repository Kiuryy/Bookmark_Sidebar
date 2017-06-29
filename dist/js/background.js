/*! (c) Philipp König under GPL-3.0 */
!(()=>{"use strict";let e=null,a={},t=null,o=[],n=!1,r={check404:"https://blockbyte.de/extensions",updateUrls:"https://blockbyte.de/ajax/extensions/updateUrls",userdata:"https://blockbyte.de/ajax/extensions/userdata",uninstall:"https://blockbyte.de/extensions/bs/uninstall",onboarding:"https://blockbyte.de/extensions/bs/install"},i={},s={af:"Afrikaans",ar:"Arabic",hy:"Armenian",be:"Belarusian",bg:"Bulgarian",ca:"Catalan","zh-CN":"Chinese (Simplified)","zh-TW":"Chinese (Traditional)",hr:"Croatian",cs:"Czech",da:"Danish",nl:"Dutch",en:"English",eo:"Esperanto",et:"Estonian",tl:"Filipino",fi:"Finnish",fr:"French",de:"German",el:"Greek",iw:"Hebrew",hi:"Hindi",hu:"Hungarian",is:"Icelandic",id:"Indonesian",it:"Italian",ja:"Japanese",ko:"Korean",lv:"Latvian",lt:"Lithuanian",no:"Norwegian",fa:"Persian",pl:"Polish",pt:"Portuguese",ro:"Romanian",ru:"Russian",sr:"Serbian",sk:"Slovak",sl:"Slovenian",es:"Spanish",sw:"Swahili",sv:"Swedish",ta:"Tamil",th:"Thai",tr:"Turkish",uk:"Ukrainian",vi:"Vietnamese"},l={get:(e,a)=>{chrome.bookmarks.get(""+e,a)},getSubTree:(e,a)=>{chrome.bookmarks.getSubTree(""+e,a)},removeTree:(e,a)=>{chrome.bookmarks.removeTree(""+e,a)},update:(e,a,t)=>{chrome.bookmarks.update(""+e,a,t)},create:(e,a)=>{chrome.bookmarks.create(e,a)},move:(e,a,t)=>{chrome.bookmarks.move(""+e,a,t)},search:(e,a)=>{chrome.bookmarks.search(e,a)}},c=e=>{e.id&&p(()=>{void 0===t[e.id]&&(void 0!==t["node_"+e.id]?t[e.id]={c:t["node_"+e.id]}:t[e.id]={c:0}),"object"!=typeof t[e.id]&&(t[e.id]={c:t[e.id]}),t[e.id].c++,t[e.id].d=+new Date,delete t["node_"+e.id],chrome.storage.local.set({clickCounter:t},()=>{void 0===chrome.runtime.lastError&&(a.clickCounter&&(delete a.clickCounter,g()),chrome.storage.sync.remove(["clickCounter"]))})})},d=(e,a)=>{if(e.lang){let t=void 0===e.cache||!0===e.cache;if(i[e.lang]&&t)a({langVars:i[e.lang]});else{let o=o=>{let n=o.langVars,r=new XMLHttpRequest;r.open("GET",chrome.extension.getURL("_locales/"+e.lang+"/messages.json"),!0),r.onload=(()=>{let o=JSON.parse(r.responseText);Object.assign(n,o),t&&(i[e.lang]=n),a({langVars:n})}),r.send()};e.defaultLang&&e.defaultLang!==e.lang?d({lang:e.defaultLang,cache:!1},o):o({langVars:{}})}}},u=e=>{chrome.tabs.query({},a=>{a.forEach(a=>{chrome.tabs.sendMessage(a.id,{action:"refresh",scrollTop:e.scrollTop||!1,type:e.type})})})},h=(a,t=!1)=>{!window.ga||!0!==e&&!0!==t||window.ga("send",{hitType:"event",eventCategory:a.category,eventAction:a.action,eventLabel:a.label,eventValue:a.value||1})},m={realUrl:(e,a)=>{if(e.abort&&!0===e.abort)o.forEach(e=>{e.abort()});else{let t=new XMLHttpRequest;t.open("POST",r.updateUrls,!0),t.onload=(()=>{let e=JSON.parse(t.responseText);a(e)});let n=new FormData;n.append("url",e.url),n.append("ua",navigator.userAgent),n.append("lang",chrome.i18n.getUILanguage()),t.send(n),o.push(t)}},addViewAmount:e=>{void 0===a.openedByExtension&&l.search({url:e.url},a=>{a.some(a=>a.url===e.url&&(c(a),!0))}),delete a.openedByExtension,g()},bookmarks:(e,a)=>{l.getSubTree(e.id,e=>{a({bookmarks:e})})},searchBookmarks:(e,a)=>{l.search(e.searchVal,e=>{a({bookmarks:e})})},moveBookmark:(e,a)=>{let t={parentId:""+e.parentId,index:e.index};l.move(e.id,t,()=>{a({moved:e.id})})},updateBookmark:(e,a)=>{let t={title:e.title};e.url&&(t.url=e.url),l.update(e.id,t,()=>{let t=chrome.runtime.lastError;a(void 0===t?{updated:e.id}:{error:t.message})})},createBookmark:(e,a)=>{let t={parentId:e.parentId,index:e.index||0,title:e.title,url:e.url?e.url:null};l.create(t,()=>{let t=chrome.runtime.lastError;a(void 0===t?{created:e.id}:{error:t.message})})},deleteBookmark:(e,a)=>{l.removeTree(e.id,()=>{a({deleted:e.id})})},refreshAllTabs:u,shareUserdata:a=>{chrome.storage.sync.set({shareUserdata:a.share}),e=a.share,g()},onboarding:(e,t)=>{t({showOnboarding:void 0===a.inited,defaultPage:r.onboarding}),a.inited=!0,g()},shareUserdataMask:(t,o)=>{let n=!1;null===e&&(+new Date-a.installationDate)/864e5>5&&(n=!0),o({showMask:n})},languageInfos:(e,a)=>{k(e=>{a({infos:e})})},langvars:d,favicon:(e,a)=>{let t=new Image;t.onload=function(){let e=document.createElement("canvas");e.width=this.width,e.height=this.height,e.getContext("2d").drawImage(this,0,0);let t=e.toDataURL("image/png");a({img:t})},t.src="chrome://favicon/size/16@2x/"+e.url},openLink:e=>{if(c(e),e.newTab&&!0===e.newTab){let t=(t=null)=>{chrome.tabs.query({active:!0,currentWindow:!0},o=>{chrome.tabs.create({url:e.href,active:void 0===e.active||!!e.active,index:t||o[0].index+1,openerTabId:o[0].id},e=>{a.openedByExtension=e.id,g()})})};e.afterLast&&!0===e.afterLast?chrome.tabs.query({},e=>{t(e[e.length-1].index+1)}):t()}else e.incognito&&!0===e.incognito?chrome.windows.create({url:e.href,state:"maximized",incognito:!0}):chrome.tabs.query({active:!0,currentWindow:!0},t=>{chrome.tabs.update(t[0].id,{url:e.href},e=>{a.openedByExtension=e.id,g()})})},websiteStatus:(e,a)=>{let t=new XMLHttpRequest;["load","error","timeout"].forEach(e=>{t.addEventListener(e,()=>{a({status:("load"!==e||t.status>=400?"un":"")+"available"})})}),t.timeout=5e3,t.open("HEAD",r.check404,!0),t.send()},trackPageView:(a,t=!1)=>{!window.ga||!0!==e&&!0!==t||window.ga("send","pageview",a.page)},trackEvent:h,viewAmounts:(e,o)=>{p(()=>{o({viewAmounts:t,counterStartDate:a.installationDate})})}};chrome.extension.onMessage.addListener((e,a,t)=>(m[e.type]&&m[e.type](e,t),!0)),chrome.browserAction.onClicked.addListener(()=>{chrome.tabs.query({active:!0,currentWindow:!0},e=>{chrome.tabs.sendMessage(e[0].id,{action:"toggleSidebar"})})}),chrome.bookmarks.onImportBegan.addListener(()=>{n=!0}),chrome.bookmarks.onImportEnded.addListener(()=>{n=!1,u({type:"Created"})}),["Changed","Created","Removed"].forEach(e=>{chrome.bookmarks["on"+e].addListener(()=>{!1!==n&&"Created"===e||u({type:e})})}),chrome.runtime.setUninstallURL(r.uninstall),chrome.runtime.onInstalled.addListener(e=>{if("install"===e.reason)chrome.tabs.create({url:chrome.extension.getURL("html/intro.html")});else if("update"===e.reason){let t=chrome.runtime.getManifest().version,o=e.previousVersion.split("."),n=t.split(".");chrome.storage.local.remove(["languageInfos"]),h({category:"extension",action:"update",label:e.previousVersion+" -> "+t},!0),o[0]===n[0]&&o[1]===n[1]||(chrome.storage.sync.get(["model"],e=>{void 0===e.model||void 0!==e.model.updateNotification&&e.model.updateNotification===t||(a.updateNotification=t,g(()=>{chrome.tabs.create({url:chrome.extension.getURL("html/changelog.html")})}))}),chrome.storage.sync.get(null,e=>{void 0===e.behaviour&&(e.behaviour={}),void 0===e.appearance&&(e.appearance={}),delete e.behaviour.scrollSensitivity,void 0===e.appearance.styles&&(e.appearance.styles={}),void 0===e.appearance.styles.directoriesIconSize&&void 0!==e.appearance.styles.bookmarksIconSize&&(e.appearance.styles.directoriesIconSize=e.appearance.styles.bookmarksIconSize),delete e.behaviour.hideEmptyDirs,void 0===e.appearance.styles.colorScheme&&(e.appearance.styles.colorScheme="rgb(0,137,123)"),void 0===e.behaviour.initialOpenOnNewTab&&(e.behaviour.initialOpenOnNewTab="de"===chrome.i18n.getUILanguage()),delete e.appearance.addVisual,delete e.behaviour.rememberScroll,delete e.behaviour.model,delete e.behaviour.clickCounter,delete e.behaviour.clickCounterStartDate,void 0!==e.appearance.styles.bookmarksDirIcon&&"dir"===e.appearance.styles.bookmarksDirIcon&&(e.appearance.styles.bookmarksDirIcon="dir-1"),chrome.storage.sync.set({behaviour:e.behaviour}),chrome.storage.sync.set({appearance:e.appearance})}))}});let g=e=>{Object.getOwnPropertyNames(a).length>0&&chrome.storage.sync.set({model:a},()=>{"function"==typeof e&&e()})},p=e=>{chrome.storage.local.get(["clickCounter"],o=>{t={},void 0===o.clickCounter?chrome.storage.sync.get(["clickCounter"],o=>{void 0!==o.clickCounter?t=o.clickCounter:a.clickCounter&&(t=a.clickCounter),t.data&&(t=t.data),"function"==typeof e&&e()}):void 0!==o.clickCounter&&((t=o.clickCounter).data&&(t=t.data),"function"==typeof e&&e())})},b=()=>{chrome.storage.sync.get(["model","shareUserdata"],t=>{a=t.model||{},e=void 0===t.shareUserdata?null:t.shareUserdata,void 0===a.installationDate&&(a.installationDate=+new Date);let o=+(new Date).setHours(0,0,0,0);void 0!==a.lastTrackDate&&a.lastTrackDate===o||(a.lastTrackDate=o,v()),p(),g()})},k=e=>{chrome.storage.local.get(["languageInfos"],a=>{if(a&&a.languageInfos&&(+new Date-a.languageInfos.updated)/36e5<8)"function"==typeof e&&e(a.languageInfos.infos);else{let a=Object.keys(s).length,t=0,o={};Object.keys(s).forEach(n=>{o[n]={name:n,label:s[n],available:!1};let r=new XMLHttpRequest;["load","error"].forEach(i=>{r.addEventListener(i,()=>{t++,"load"===i&&(o[n].available=!0),t===a&&(chrome.storage.local.set({languageInfos:{infos:o,updated:+new Date}}),"function"==typeof e&&e(o))})}),r.open("HEAD",chrome.extension.getURL("_locales/"+n+"/messages.json"),!0),r.send()})}})},v=()=>{let t=chrome.runtime.getManifest(),o="not_set";if(!0===e?o="allowed":!1===e&&(o="not_allowed"),h({category:"extension",action:"user",label:"share_"+o},!0),h({category:"extension",action:"version",label:t.version},!0),!0===e){a.installationDate&&setTimeout(()=>{h({category:"extension",action:"installationDate",label:new Date(a.installationDate).toISOString().slice(0,10)})},1200),l.getSubTree("0",e=>{let a=0,t=e=>{for(let o=0;o<e.length;o++){let n=e[o];n.url?a++:n.children&&t(n.children)}};e&&e[0]&&e[0].children&&e[0].children.length>0&&t(e[0].children),h({category:"extension",action:"bookmarks",label:"amount",value:a})});let e=["behaviour","appearance"],t=1,o=(e,a)=>{Object.keys(a).forEach(n=>{"object"==typeof a[n]?o(e+"_"+n,a[n]):(t++,"string"!=typeof a[n]&&(a[n]=JSON.stringify(a[n])),setTimeout(()=>{h({category:"configuration",action:e+"_"+n,label:a[n]})},1200*t))})};chrome.storage.sync.get(e,a=>{e.forEach(e=>{"object"==typeof a[e]&&o(e,a[e])})})}};(()=>{window.GoogleAnalyticsObject="ga",window.ga=window.ga||function(){(window.ga.q=window.ga.q||[]).push(arguments)},window.ga.l=+new Date;let e=document.createElement("script");e.async=1,e.src="https://www.google-analytics.com/analytics.js";let a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(e,a);let t=chrome.runtime.getManifest();window.ga("create","UA-"+("Dev"!==t.version_name&&"update_url"in t?"100595538-2":"100595538-3"),"auto"),window.ga("set","checkProtocolTask",null),window.ga("set","transport","beacon")})(),b()})();