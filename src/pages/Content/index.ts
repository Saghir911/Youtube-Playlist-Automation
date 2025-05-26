chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startVideoAutomation") {
    console.log("[ContentScript] ✅ Received automation trigger");

    // Respond immediately to avoid "port closed" error
    sendResponse({ status: "started" });

    // Do your automation
    setTimeout(() => {
      console.log("[ContentScript] ✅ Automation done");
      chrome.runtime.sendMessage({ action: "automationDone" });
    }, 3000);

    return true; // Optional: only needed if you're doing async work before calling sendResponse
  }
});
