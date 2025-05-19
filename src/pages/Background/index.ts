chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const url = request.url;
  console.log(`So this is the current URL: ${url}`);
  if (request.action === "startAutomation") {
    console.log("Received URL:", url);
    chrome.tabs.create({ url }, (tab) => {
      // Wait for the tab to finish loading, then send the message
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
    });
  }
   else if (request.action === "callAPI") {
    apiCall(url)
    .then((data) => {
      console.log("API call success:", data);
      chrome.runtime.sendMessage({ action: "apiReady", result : data } ) 
        sendResponse({ status: "done", data });
      })
      .catch((err) => {
        console.error("API call failed:", err);
        sendResponse({ status: "error", error: err.message });
      });
    // IMPORTANT: return true to keep the message channel open
    return true;
  }
});



const apiCall = async (idOfPlayList: string) => {
  const playlistId: string = idOfPlayList
  const apiKey = "AIzaSyALjT29oH51saHoZUczQvhbHz_zophOLBw";
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  const data = await response.json();
  return data;    
};



