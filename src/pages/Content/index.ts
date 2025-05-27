// content.ts

// Let background know this tab's ready
chrome.runtime.sendMessage({ action: "contentScriptReady" });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "startVideoAutomation") {
    console.log("[ContentScript] ✅ Received automation trigger");
    sendResponse({ status: "started" });
    PlaylistVideoAutomations();
    return true; // keep the channel open
  }
});

async function closePlaylistTab() {
  chrome.runtime.sendMessage({ action: "closePlaylistTab" });
  console.log("[ContentScript] Closed playlist tab");
}

const PlaylistVideoAutomations = async () => {
  console.log("on top of PlaylistVideoAutomations");
  const S = {
    subscribeBtn: "ytd-subscribe-button-renderer button",
    subscribeSpan: "ytd-subscribe-button-renderer button span",
    likeBtn: "button-view-model button",
    inputComment: "#placeholder-area",
    inputValue: "#contenteditable-root",
    commentBtn: "yt-button-shape button",
  };

  const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;
  const $$ = (sel: string) =>
    Array.from(document.querySelectorAll(sel)) as HTMLElement[];

  const state = {
    clickDone: false,
    commentDone: false,
  };

  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  // short initial delay
  await wait(1500);
  await processVideoPage();

  async function processVideoPage() {
    try {
      console.log("Processing video page...");
      await wait(5000);
      await clickSubAndLike();
      await scrollToComments();
      await getCommentText(videoURL, cleanTitle);
    } catch (e) {
      console.error("Error processing video page:", e);
    }
  }

  async function clickSubAndLike() {
    if (state.clickDone)
      return console.log("Already processed this video—skipping.");
    state.clickDone = true;
    console.log("Processing subscribe & like…");

    const btn = $(S.subscribeBtn),
      span = $(S.subscribeSpan);
    if (btn && span && !/subscribed/i.test(span.textContent?.trim() || "")) {
      btn.click();
      console.log("→ Subscribing");
      await wait(2000);
    }

    const likeBtn = $(S.likeBtn);
    if (likeBtn && likeBtn.getAttribute("aria-pressed") !== "true") {
      likeBtn.click();
      console.log("→ Liking");
      await wait(2000);
    }
    await wait(1000);
  }

  async function scrollToComments() {
    console.log("Scrolling to comments section…");
    for (let i = 0; i < 3; i++) {
      window.scrollBy(0, 100);
      await wait(500);
    }
  }

  async function customComment(aiComment: string) {
    if (state.commentDone)
      return console.log("Comment already added—skipping.");
    state.commentDone = true;

    console.log("Attempting to add comment…");
    const commentArea = $(S.inputComment);
    if (!commentArea) return console.warn("💬 No comment area");
    commentArea.click();
    await wait(2000);

    const inputValue = $(S.inputValue);
    if (!inputValue) return console.warn("✍️ No input field");
    inputValue.innerText = aiComment;
    inputValue.dispatchEvent(new Event("input", { bubbles: true }));
    await wait(1000);

    const commentBtn = $$(S.commentBtn).find((btn) =>
      btn.getAttribute("aria-label")?.toLowerCase().includes("comment")
    );
    if (commentBtn) {
      commentBtn.click();
      console.log("→ Comment submitted");
      await wait(2000);
    }
  }

  const cleanTitle = document.title.replace(" - YouTube", "").trim();
  const videoURL = window.location.href;

  async function getCommentText(videoUrl: string, prompt: string) {
    try {
      console.log("Fetching AI comment for:", prompt);
      const res = await fetch(
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
                content: `Generate a natural, 10–15 word comment for: ${prompt}`,
              },
            ],
          }),
        }
      );
      const data = await res.json();
      const comment = (data?.choices?.[0]?.message?.content || "").replace(
        /^"(.*)"$/,
        "$1"
      );
      if (comment) await customComment(comment);
    } catch (err) {
      console.error("Error fetching AI comment:", err);
    }
  }

  console.log("Make it to the end of PlaylistVideoAutomations");

  // *** THIS is the crucial part: ***
  // only now do we tell background we're done
  await chrome.runtime.sendMessage({ action: "automationDone" });
  console.log("[ContentScript] 📩 automationDone sent");

  // and immediately ask it to close the playlist tab
  await closePlaylistTab();
};
