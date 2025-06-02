// background.ts

let playlistTabId: number | null = null;
let automationState = false;
const API_KEY = "AIzaSyALjT29oH51saHoZUczQvhbHz_zophOLBw"; // your YouTube‐API key here

// 1) Listen for start/stop messages from content (or elsewhere)
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "startAutomation") {
    // If someone asks us to start, flip our state to true and begin
    if (automationState) {
      // already running; ignore
      sendResponse({ status: "already_running" });
      return true;
    }
    automationState = true;
    sendResponse({ status: "started" });

    (async () => {
      // Extract playlist ID from the URL the content script sent
      const rawUrl = request.url as string;
      const id = new URL(rawUrl).searchParams.get("list");
      if (!id) {
        // no playlist ID in URL
        return;
      }

      // 1️⃣ Open the playlist tab
      const playlistUrl = `https://www.youtube.com/playlist?list=${id}`;
      const tab = await chrome.tabs.create({ url: playlistUrl });
      playlistTabId = tab.id!;

      // 2️⃣ Wait for it to finish loading
      await new Promise<void>((resolve) => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === playlistTabId && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        });
      });

      // 3️⃣ Fetch all video URLs in that playlist
      const videoUrls = await fetchAllPlaylistItems(id);

      // 4️⃣ Small delay before starting the per‐video loop
      await new Promise((r) => setTimeout(r, 2000));

      // 5️⃣ Loop through each video, but check automationState each time
      for (const videoUrl of videoUrls) {
        if (!automationState) {
          // user clicked “Stop” -> break out
          break;
        }
        await openAndAutomateVideo(videoUrl);
      }

      // 6️⃣ Once done (or stopped), refocus and close the playlist tab
      if (playlistTabId !== null) {
        await chrome.tabs.update(playlistTabId, { active: true });
        setTimeout(() => {
          chrome.tabs.remove(playlistTabId!);
          playlistTabId = null;
        }, 2000);
      }
    })();

    return true; // keep the sendResponse channel open
  }

  // “Stop Automation” message from content.ts
  if (request.action === "stopAutomation") {
    automationState = false;
    sendResponse({ status: "stopped" });
    return true;
  }

  return false;
});

// === Helpers below ===

async function fetchAllPlaylistItems(playlistId: string): Promise<string[]> {
  const items: any[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", API_KEY);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`YouTube API ${res.status}`);
    const json = await res.json();
    items.push(...json.items);
    pageToken = json.nextPageToken;
  } while (pageToken);

  return items
    .map((i) => i.snippet.resourceId.videoId as string)
    .filter(Boolean)
    .map((id) => `https://www.youtube.com/watch?v=${id}`);
}

async function openAndAutomateVideo(videoUrl: string): Promise<void> {
  // Open each video in a new tab, wait for load, send the “startVideoAutomation” message,
  // then wait for the content script’s response before closing the tab.
  const tab = await chrome.tabs.create({ url: videoUrl, active: true });
  const vidId = tab.id!;

  await new Promise<void>((resolve) => {
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === vidId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.sendMessage(
          vidId,
          { action: "startVideoAutomation" },
          (res) => {
            console.log("Content script replied:", res);
            resolve();
            chrome.tabs.remove(vidId);
          }
        );
      }
    });
  });
}
