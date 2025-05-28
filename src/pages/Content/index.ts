// content.ts

// Notify background that content script is ready
chrome.runtime.sendMessage({ action: "contentScriptReady" });

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "startVideoAutomation") {
    console.log("[ContentScript] ✅ Received automation trigger");
    PlaylistVideoAutomations().catch(console.error);
    sendResponse({ status: "started" });
    return true;
  }
});

const $ = (sel: string) => document.querySelector(sel) as HTMLElement | null;
const $$ = (sel: string) =>
  Array.from(document.querySelectorAll(sel)) as HTMLElement[];
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function PlaylistVideoAutomations() {
  console.log("[ContentScript] ▶️ Starting automation");
  const S = {
    subscribeBtn: "ytd-subscribe-button-renderer button",
    subscribeSpan: "ytd-subscribe-button-renderer button span",
    likeBtn: "button-view-model button",
    inputComment: "#placeholder-area",
    inputValue: "#contenteditable-root",
    commentBtn: "yt-button-shape button",
  };
  const state = { clickDone: false, commentDone: false };
  const cleanTitle = document.title.replace(" - YouTube", "").trim();

  try {
    await wait(1500);
    await processVideoPage();
    console.log("[ContentScript] ✅ Automation complete");
  } catch (e) {
    console.error("[ContentScript] ❌ Automation error:", e);
  }

  // Notify background script that automation is done
  await chrome.runtime.sendMessage({ action: "automationDone" });
  console.log("[ContentScript] 📩 Sent automationDone");

  async function processVideoPage() {
    await wait(5000);
    await clickSubAndLike();
    await scrollToComments();
    await getCommentText(cleanTitle);
  }

  async function clickSubAndLike() {
    if (state.clickDone)
      return console.log("Already processed this video—skipping.");
    state.clickDone = true;
    const btn = $(S.subscribeBtn);
    const span = $(S.subscribeSpan);
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

  async function getCommentText(prompt: string) {
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
}
