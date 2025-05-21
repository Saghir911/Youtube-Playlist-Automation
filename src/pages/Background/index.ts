const API_KEY = "AIzaSyALjT29oH51saHoZUczQvhbHz_zophOLBw";

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const { action, url } = request;

  if (action === "startAutomation") {
    chrome.tabs.create({ url }, (tab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
        }
      });
      // Always send a response to avoid port closed error
      sendResponse({ status: "tab_created", tabId: tab?.id });
    });
    // Return true because sendResponse is called asynchronously
    return true;
  }

  if (action === "callAPI") {
    fetchAllPlaylistItems(url, API_KEY)
      .then(({ allItems, lastResponse }) => {
        sendResponse({ status: "done", allItems, lastResponse });
      })
      .catch((err) => sendResponse({ status: "error", error: err.message }));
    return true; // keep channel open
  }
});

async function fetchAllPlaylistItems(playlistId: string, apiKey: string) {
  const baseUrl = "https://www.googleapis.com/youtube/v3/playlistItems";
  let allItems: any[] = [];
  let pageToken: string | undefined;
  let lastResponse: any;

  do {
    const url = new URL(baseUrl);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error: ${res.statusText}`);

    const data = await res.json();
    allItems = allItems.concat(data.items);

    pageToken = data.nextPageToken;
    lastResponse = data;
  } while (pageToken);

  // Modern, concise way to get all video URLs
  const videoUrls = allItems
    .map((item) => item.snippet?.resourceId?.videoId)
    .filter(Boolean)
    .map((videoId) => `https://www.youtube.com/watch?v=${videoId}`);

  chrome.storage.local.set({ videoUrls });

  return { allItems, videoUrls, lastResponse };
}


chrome.storage.local.get("videoUrls", (result) => {
  console.log(result.videoUrls);
});

// You can now remove storeVideoId and makeUrlOfVideos from this file.
