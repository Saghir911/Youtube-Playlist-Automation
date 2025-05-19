"use strict";
self["webpackHotUpdatechrome_extension_boilerplate_react"]("background",{

/***/ "./src/pages/Background/index.ts":
/*!***************************************!*\
  !*** ./src/pages/Background/index.ts ***!
  \***************************************/
/***/ (() => {


chrome.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "startAutomation") {
        var url = request.url;
        console.log("Received URL:", url);
        // Perform automation logic here
        // For example, you can open the URL in a new tab
        chrome.tabs.create({ url: url });
    }
});


/***/ })

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("9896c928f8cc397e3c03")
/******/ })();
/******/ 
/******/ }
);
//# sourceMappingURL=background.8632e4643ac37076186a.hot-update.js.map