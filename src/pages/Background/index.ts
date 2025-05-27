let activeTabId: number | null = null;
let contentScriptReadyTabs: Set<number> = new Set();
const API_KEY = "AIzaSyALjT29oH51saHoZUczQvhbHz_zophOLBw";

// --- Combined and cleaned up message listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action, url, playlistId } = request;
  switch (action) {
    case "startAutomation": {
      const id =
        playlistId || (url ? new URL(url).searchParams.get("list") : undefined);
      if (!id) {
        sendResponse({ status: "error", error: "Invalid playlist ID." });
        return;
      }
      const playlistUrl = `https://www.youtube.com/playlist?list=${id}`;
      chrome.tabs.create({ url: playlistUrl }, (playlistTab) => {
        if (!playlistTab?.id) {
          sendResponse({
            status: "error",
            error: "Failed to open playlist tab",
          });
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
    case "callAPI": {
      const id = playlistId || url;
      fetchAllPlaylistItems(id, API_KEY)
        .then(({ videoUrls }) => {
          sendResponse({ status: "done", videoUrls });
        })
        .catch((err) => {
          sendResponse({ status: "error", error: err.message });
        });
      return true;
    }
    case "contentScriptReady": {
      if (sender.tab?.id !== undefined) {
        contentScriptReadyTabs.add(sender.tab.id);
        console.log(`Content script ready in tab ${sender.tab.id}`);
        sendResponse({ status: "success" });
      } else {
        console.log("Content script ready from unknown sender");
        sendResponse({ status: "error" });
      }
      return true;
    }
    case "closePlaylistTab": {
      if (activeTabId !== null) {
        chrome.tabs.remove(activeTabId, () => {
          console.log(`Closed playlist tab with ID ${activeTabId}`);
          activeTabId = null;
        });
      }
      return true;
    }

    default:
      sendResponse({ status: "unknown action" });
      return false;
  }
});

// --- Clean up contentScriptReadyTabs when a tab is closed ---
chrome.tabs.onRemoved.addListener((tabId) => {
  if (contentScriptReadyTabs.has(tabId)) {
    contentScriptReadyTabs.delete(tabId);
    if (activeTabId === tabId) activeTabId = null;
  }
});

// --- Main automation logic (unchanged, but now only one message listener exists) ---
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

function openAndAutomateVideo(
  videoUrl: string,
  playlistTabId: number
): Promise<void> {
  return new Promise((resolve) => {
    chrome.tabs.create({ url: videoUrl, active: true }, (tab) => {
      if (!tab?.id) return resolve();
      const vidTabId = tab.id;
      // Add listener BEFORE sending message to avoid race condition
      const automationDoneListener = (request: any, sender: any) => {
        if (
          request.action === "automationDone" &&
          sender.tab?.id === vidTabId
        ) {
          chrome.runtime.onMessage.removeListener(automationDoneListener);
          chrome.tabs.remove(vidTabId, () => {
            resolve();
          });
        }
      };
      chrome.runtime.onMessage.addListener(automationDoneListener);
      // Wait for the tab to be fully loaded before sending message
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === vidTabId && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.sendMessage(
            vidTabId,
            { action: "startVideoAutomation" },
            (response) => {
              if (chrome.runtime.lastError) {
                console.error(
                  "SendMessage failed:",
                  chrome.runtime.lastError.message
                );
                resolve(); // Resolve even on error to avoid hanging
              } else {
                console.log(
                  "startVideoAutomation message sent, response:",
                  response
                );
              }
            }
          );
        }
      });
    });
  });
}

export async function automateAllVideos(playlistTabId: number) {
  chrome.storage.local.get("videoUrls", async (result) => {
    let urls = result.videoUrls || [];
    for (let i = 0; i < urls.length; i++) {
      await openAndAutomateVideo(urls[i], playlistTabId);
    }
    chrome.tabs.update(playlistTabId, { active: true }, () => {
      console.log("All videos automated! Playlist tab focused.");
    });
  });
}

const sendMessageToTab = (tabId: number, action: string): void => {
  chrome.tabs.sendMessage(tabId, { action }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("sendMessage error:", chrome.runtime.lastError.message);
    } else {
      console.log("Message sent to content script:", response);
    }
  });
};
