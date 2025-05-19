"use strict";
self["webpackHotUpdatechrome_extension_boilerplate_react"]("background",{

/***/ "./src/pages/Background/index.ts":
/*!***************************************!*\
  !*** ./src/pages/Background/index.ts ***!
  \***************************************/
/***/ (() => {


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
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
/******/ 	__webpack_require__.h = () => ("ee8cf692d964a5c94707")
/******/ })();
/******/ 
/******/ }
);
//# sourceMappingURL=background.02053ebb498836446be6.hot-update.js.map