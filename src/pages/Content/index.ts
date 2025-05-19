chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "apiReady") {
    const data = request.result;
    console.log("API data received:", data);
    // Process the data as needed
  }
});