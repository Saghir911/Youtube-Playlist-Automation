chrome.runtime.sendMessage({ action: "contentScriptReady" });
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startVideoAutomation") {
    console.log("[ContentScript] ✅ Received automation trigger");    // Respond immediately to avoid "port closed" error
    sendResponse({ status: "started" });
    PlaylistVideoAutomations();
    return true; // Needed for async sendResponse
  }
});

// async function closePlaylistTab() {
//   chrome.runtime.sendMessage({ action: "closePlaylistTab" });
//   console.log("[ContentScript] Closed playlist tab");
// }

const PlaylistVideoAutomations = async () => {
  console.log("on top of PlaylistVideoAutomations");
  const S = {
    thumbnail: "#content ytd-thumbnail yt-image",
    subscribeBtn: "ytd-subscribe-button-renderer button",
    subscribeSpan: "ytd-subscribe-button-renderer button span",
    likeBtn: "button-view-model button",
    inputComment: "#placeholder-area",
    inputValue: "#contenteditable-root",
    commentBtn: "yt-button-shape button",
  };

  // Utility: query selector helper
  const $ = (selector: string) =>
    document.querySelector(selector) as HTMLElement | null;
  const $$ = (selector: string) =>
    Array.from(document.querySelectorAll(selector)) as HTMLElement[];

  // State
  const state = {
    homeHandled: false,
    videoHandled: false,
    clickDone: false,
    commentDone: false,
    checked: false,
  };

  // Listener from background script
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    console.log("Received:", msg.action);
    // Store the checked value from the message (default to false if not present)
    if (msg.action === "handleHomePage" && !state.homeHandled) {
      state.homeHandled = true;
      state.checked = !!msg.checked;
      setTimeout(clickFirstThumbnail, 1500);
      sendResponse({ status: "homepage queued" });
    } else if (msg.action === "handleVideoPage" && !state.videoHandled) {
      state.videoHandled = true;
      state.checked = !!msg.checked;
      setTimeout(processVideoPage, 1500);
      sendResponse({ status: "video page queued" });
    }
    return true;
  });

  // Wait helper
  const wait = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Click the first thumbnail
  async function clickFirstThumbnail(): Promise<void> {
    try {
      console.log("Looking for video thumbnail...");
      await wait(4000);
      const vid = $(S.thumbnail);
      if (vid) {
        console.log("Clicking first thumbnail...");
        vid.click();
      } else {
        console.warn("No video thumbnail found");
      }
    } catch (error) {
      console.error("Error clicking thumbnail:", error);
    }
  }

  // Process video page
  async function processVideoPage(): Promise<void> {
    try {
      console.log("Processing video page...");
      await wait(5000);
      await clickSubAndLike();
      await scrollToComments();
      await getCommentText(videoURL, cleanTitle);
      await wait(3000);
    } catch (error) {
      console.error("Error processing video page:", error);
    }
  }

  // Subscribe and like
  async function clickSubAndLike(): Promise<void> {
    if (state.clickDone)
      return console.log("Already processed this video—skipping.");
    state.clickDone = true;
    console.log("Processing subscribe & like...");
    const btn = $(S.subscribeBtn);
    const span = $(S.subscribeSpan);
    if (btn && span && !/subscribed/i.test(span.textContent?.trim() || "")) {
      console.log("→ Subscribing");
      btn.click();
      await wait(2000);
    } else {
      console.log("→ Already subscribed or button missing");
    }
    try {
      const likeBtn = $(S.likeBtn);
      if (likeBtn && likeBtn.getAttribute("aria-pressed") !== "true") {
        console.log("→ Liking");
        likeBtn.click();
        await wait(2000);
      } else {
        console.log("→ Already liked or button missing");
      }
    } catch (error) {
      console.error("Error liking video:", error);
    }
    await wait(2000);
  }

  // Scroll to comments
  async function scrollToComments(): Promise<void> {
    console.log("Scrolling to comments section...");
    for (let i = 0; i < 3; i++) {
      window.scrollBy(0, 100);
      await wait(500);
    }
  }

  // Comment handler
  async function customComment(aiComment: string): Promise<void> {
    if (state.commentDone)
      return console.log("Comment already added—skipping.");
    try {
      console.log("Attempting to add comment...");
      const inputComment = $(S.inputComment);
      if (!inputComment) return console.warn("Comment input area not found");
      inputComment.click();
      await wait(3000);
      const inputValue = $(S.inputValue);
      if (!inputValue)
        return console.warn("Comment input value field not found");
      // Use the checked value from state (set by background message)
      if (state.checked) {
        inputValue.innerText = aiComment;
      } else {
        inputValue.innerText = `Great Video`;
      }
      inputValue.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(2000);
      const commentBtn = $$(S.commentBtn).find((btn) =>
        btn.getAttribute("aria-label")?.toLowerCase().includes("comment")
      );
      if (commentBtn) {
        console.log("→ Submitting comment");
        commentBtn.click();
        state.commentDone = true;
        await wait(2000);
      } else {
        console.log("→ Comment button not found with aria-label 'Comment'");
      }
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  }

  const cleanTitle = document.title.replace(" - YouTube", "").trim();
  const videoURL = window.location.href;

  // AI Comment Fetcher
  async function getCommentText(
    videoUrl: string,
    prompt: string
  ): Promise<void> {
    try {
      console.log(videoUrl, prompt);

      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization:
              "Bearer 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",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "user",
                content: `Generate a natural and engaging YouTube comment 10-15 words based on the given video title. The comment should sound like a real person, be relevant to the title, and feel authentic. Avoid generic AI-like responses. Here’s the video title: ${prompt}. Give only the comment as the output.`,
              },
            ],
          }),
        }
      );

      const data = await response.json();
      console.log(data);

      const commentFromAi = (
        data?.choices?.[0]?.message?.content || ""
      ).replace(/^"(.*)"$/, "$1");

      if (commentFromAi) {
        console.log(`Comment Content is this: ${commentFromAi}`);
        await customComment(commentFromAi);
      } else {
        console.warn("No comment returned from API");
      }
    } catch (error) {
      console.error("Error fetching AI comment:", error);
    }
  }

  console.log("Make it to the end of PlaylistVideoAutomations");
};

// Close tab
chrome.runtime.sendMessage({ action: "contentScriptReady" });
