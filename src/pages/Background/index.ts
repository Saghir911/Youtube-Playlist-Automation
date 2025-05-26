// background.ts (service worker)
const API_KEY = "AIzaSyALjT29oH51saHoZUczQvhbHz_zophOLBw";

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const { action, url, playlistId } = request;

  if (action === "startAutomation") {
    const id = playlistId || new URL(url).searchParams.get("list");
    if (!id) {
      sendResponse({ status: "error", error: "Invalid playlist ID." });
      return;
    }

    const playlistUrl = `https://www.youtube.com/playlist?list=${id}`;
    chrome.tabs.create({ url: playlistUrl }, (playlistTab) => {
      if (!playlistTab?.id) {
        sendResponse({ status: "error", error: "Failed to open playlist tab" });
        return;
      }

      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === playlistTab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);

          fetchAllPlaylistItems(id, API_KEY)
            .then(({ videoUrls }) => {
              chrome.storage.local.set({ videoUrls });
              automateAllVideos(playlistTab.id!);
              sendResponse({ status: "tab_created", tabId: playlistTab.id });
            })
            .catch((err) => {
              sendResponse({ status: "error", error: err.message });
            });
        }
      });
    });

    return true; // Keep message channel open for async sendResponse
  }

  if (action === "callAPI") {
    const id = playlistId || url;
    fetchAllPlaylistItems(id, API_KEY)
      .then(({ videoUrls }) => {
        sendResponse({ status: "done", videoUrls });
      })
      .catch((err) => {
        sendResponse({ status: "error", error: err.message });
      });
    return true; // Keep message channel open
  }
});

async function fetchAllPlaylistItems(playlistId: string, apiKey: string) {
  const baseUrl = "https://www.googleapis.com/youtube/v3/playlistItems";
  let allItems: any[] = [];
  let pageToken: string | undefined;

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
  } while (pageToken);

  const videoUrls = allItems
    .map((item) => item.snippet?.resourceId?.videoId)
    .filter(Boolean)
    .map((videoId) => `https://www.youtube.com/watch?v=${videoId}`);

  return { videoUrls };
}

// FIXED openAndAutomateVideo function:
function openAndAutomateVideo(
  videoUrl: string,
  playlistTabId: number,
  onDone: () => void
) {
  chrome.tabs.create({ url: videoUrl, active: true }, (tab) => {
    if (!tab?.id) return;
    const vidTabId = tab.id;

    // Add listener BEFORE sending message to avoid race condition
    const automationDoneListener = (request: any, sender: any) => {
      if (request.action === "automationDone" && sender.tab?.id === vidTabId) {
        chrome.runtime.onMessage.removeListener(automationDoneListener);
        chrome.tabs.remove(vidTabId, () => {
          onDone();
        });
      }
    };
    chrome.runtime.onMessage.addListener(automationDoneListener);

    // Wait for the tab to be fully loaded before sending message
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === vidTabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);

        chrome.tabs.sendMessage(vidTabId, { action: "startVideoAutomation" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("SendMessage failed:", chrome.runtime.lastError.message);
            // Optional: you can call onDone() here or retry logic
          } else {
            console.log("startVideoAutomation message sent, response:", response);
          }
        });
      }
    });
  });
}

export function automateAllVideos(playlistTabId: number) {
  chrome.storage.local.get("videoUrls", (result) => {
    let urls = result.videoUrls || [];
    let index = 0;

    function next() {
      if (index < urls.length) {
        openAndAutomateVideo(urls[index], playlistTabId, () => {
          index++;
          next();
        });
      } else {
        chrome.tabs.update(playlistTabId, { active: true }, () => {
          console.log("All videos automated! Playlist tab focused.");
        });
      }
    }

    next();
  });
}



let activeTabId: number | null = null;
let contentScriptReadyTabs: Set<number> = new Set();
let lastChecked: boolean = false;

// Fix: sendMessageToTab should forward checked value to content script
const sendMessageToTab = (
  tabId: number,
  action: string,
  checked?: boolean
): void => {
  chrome.tabs.sendMessage(tabId, { action, checked }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("sendMessage error:", chrome.runtime.lastError.message);
    } else {
      console.log("Message sent to content script:", response);
    }
  });
};

function handleTabUpdate(tabId: number, url?: string) {
  if (tabId !== activeTabId || !contentScriptReadyTabs.has(tabId)) return;
  if (!url) return;
  if (url.includes("/watch")) {
    sendMessageToTab(tabId, "handleVideoPage", lastChecked);
  } else if (url.includes("youtube.com")) {
    sendMessageToTab(tabId, "handleHomePage", lastChecked);
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "startAutomation":
      lastChecked = !!request.checked; // store the value from popup
      chrome.tabs.create({ url: "https://www.youtube.com" }, (tab) => {
        if (tab.id !== undefined) {
          activeTabId = tab.id;
          console.log(`YouTube tab created: ${activeTabId}`);
          const waitForContentScript = () => {
            if (contentScriptReadyTabs.has(activeTabId!)) {
              sendMessageToTab(activeTabId!, "handleHomePage", lastChecked);
              sendResponse({ status: "success" });
            } else {
              setTimeout(waitForContentScript, 500);
            }
          };
          waitForContentScript();
        } else {
          sendResponse({ status: "error" });
        }
      });
      return true;
    case "contentScriptReady":
      if (sender.tab?.id !== undefined) {
        contentScriptReadyTabs.add(sender.tab.id);
        console.log(`Content script ready in tab ${sender.tab.id}`);
        sendResponse({ status: "success" });
      } else {
        console.log("Content script ready from unknown sender");
        sendResponse({ status: "error" });
      }
      return true;
    case "closeTab":
      if (activeTabId !== null) {
        chrome.tabs.remove(activeTabId);
        console.log(`Closed tab ${activeTabId}`);
        contentScriptReadyTabs.delete(activeTabId);
        activeTabId = null;
        sendResponse({ status: "success" });
      } else {
        sendResponse({ status: "error" });
      }
      return true;
    default:
      sendResponse({ status: "unknown action" });
      return false;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    handleTabUpdate(tabId, tab.url);
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  handleTabUpdate(details.tabId, details.url);
});

