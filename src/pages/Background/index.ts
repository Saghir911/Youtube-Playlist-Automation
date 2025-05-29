// background.ts

let playlistTabId: number | null = null;
const API_KEY = "AIzaSyALjT29oH51saHoZUczQvhbHz_zophOLBw";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startAutomation") {
    // Kick off the entire workflow
    (async () => {
      const id = request.playlistId || extractPlaylistId(request.url);
      if (!id) {
        sendResponse({ status: "error", error: "No playlist ID" });
        return;
      }

      // 1️⃣ Open playlist tab
      const playlistUrl = `https://www.youtube.com/playlist?list=${id}`;
      const tab = await chrome.tabs.create({ url: playlistUrl });
      playlistTabId = tab.id!;

      // 2️⃣ Wait for it to finish loading
      await new Promise<void>(resolve => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === playlistTabId && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        });
      });

      // 3️⃣ Fetch all video URLs
      const videoUrls = await fetchAllPlaylistItems(id);
      sendResponse({ status: "started", count: videoUrls.length });

      // 4️⃣ Automate each video, one by one
      for (const videoUrl of videoUrls) {
        await openAndAutomateVideo(videoUrl);
      }

      // 5️⃣ Refocus playlist tab & close after 2 s
      if (playlistTabId !== null) {
        await chrome.tabs.update(playlistTabId, { active: true });
        setTimeout(() => {
          chrome.tabs.remove(playlistTabId!);
          playlistTabId = null;
        }, 2000);
      }
    })();
    return true; // keep sendResponse channel open
  }
});

// Helper: fetch every item in a playlist via YouTube Data API v3
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
    .map(i => i.snippet.resourceId.videoId)
    .filter(Boolean)
    .map(id => `https://www.youtube.com/watch?v=${id}`);
}

// Helper: open a video tab, trigger content script, wait for it to finish, then close
async function openAndAutomateVideo(videoUrl: string): Promise<void> {
  const tab = await chrome.tabs.create({ url: videoUrl, active: true });
  const vidId = tab.id!;

  await new Promise<void>(resolve => {
    // Wait page load…
    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
      if (tabId === vidId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        // Tell content to automate…
        chrome.tabs.sendMessage(vidId, { action: "startVideoAutomation" }, () => {
          // And resolve after content responds
          resolve();
          // Close the video tab immediately
          chrome.tabs.remove(vidId);
        });
      }
    });
  });
}

// Extract playlist ID from any YouTube URL
function extractPlaylistId(url?: string): string | undefined {
  try {
    return url ? new URL(url).searchParams.get("list") || undefined : undefined;
  } catch {
    return undefined;
  }
}
