chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startAutomation") {
    const url = request.url;
    console.log("Received URL:", url);
    chrome.tabs.create({ url });
  }
});
