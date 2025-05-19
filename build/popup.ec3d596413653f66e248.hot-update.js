"use strict";
self["webpackHotUpdatechrome_extension_boilerplate_react"]("popup",{

/***/ "./src/pages/Popup/Popup.tsx":
/*!***********************************!*\
  !*** ./src/pages/Popup/Popup.tsx ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "./node_modules/react/index.js");
/* harmony import */ var _popup_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./popup.css */ "./src/pages/Popup/popup.css");


var URL_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
var Popup = function () {
    var _a = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(""), playlistUrl = _a[0], setPlaylistUrl = _a[1];
    var _b = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(""), error = _b[0], setError = _b[1];
    var _c = (0,react__WEBPACK_IMPORTED_MODULE_0__.useState)(false), isLoading = _c[0], setIsLoading = _c[1];
    (0,react__WEBPACK_IMPORTED_MODULE_0__.useEffect)(function () {
        if (error && URL_REGEX.test(playlistUrl)) {
            setError("");
        }
    }, [playlistUrl, error]);
    var handleStartAutomation = function () {
        if (!URL_REGEX.test(playlistUrl.trim())) {
            setError("Invalid YouTube playlist URL.");
            return;
        }
        setError("");
        setIsLoading(true);
        // Background script or async logic
        setTimeout(function () {
            chrome.runtime.sendMessage();
            console.log("Automation started for:", playlistUrl);
            setIsLoading(false);
        }, 2000);
    };
    return (react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "glass-card" },
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "header" },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "logo-text" },
                "YT",
                react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "logo-accent" }, "Auto"))),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "input-group" },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("input", { id: "playlistUrl", type: "text", value: playlistUrl, onChange: function (e) { return setPlaylistUrl(e.target.value); }, className: "input ".concat(error ? 'shake' : ''), required: true }),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("label", { htmlFor: "playlistUrl", className: playlistUrl ? 'filled' : '' }, "Paste playlist URL"),
            error && react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "error-msg" }, error)),
        react__WEBPACK_IMPORTED_MODULE_0__.createElement("button", { className: "btn", onClick: handleStartAutomation, disabled: isLoading },
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("span", { className: "btn-text" }, isLoading ? 'Loading...' : 'Start Automation'),
            react__WEBPACK_IMPORTED_MODULE_0__.createElement("div", { className: "ripple-container" }))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Popup);


/***/ })

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("f35efd1704be1877dc96")
/******/ })();
/******/ 
/******/ }
);
//# sourceMappingURL=popup.ec3d596413653f66e248.hot-update.js.map