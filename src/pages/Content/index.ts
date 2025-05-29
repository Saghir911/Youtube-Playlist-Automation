// content.ts

// Listen for single‐video automation triggers
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "startVideoAutomation") {
    (async () => {
      try {
        await automateThisVideo();
        sendResponse({ status: "done" });
      } catch (err: any) {
        console.error("[Content] Automation error:", err);
        sendResponse({ status: "error", error: err.message });
      }
    })();
    return true; // keep channel open for async sendResponse
  }
});

/** Automates subscribe, like, scroll, and AI‐generated comment***/
async function automateThisVideo() {
  const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
  const sel = {
    subscribeBtn: "ytd-subscribe-button-renderer button",
    subscribeSpan: "ytd-subscribe-button-renderer button span",
    likeBtn: "button[aria-pressed]",
    commentArea: "#placeholder-area",
    inputField: "#contenteditable-root",
    commentBtn: "yt-button-shape button"
  };

  // small delay for page elements
  await wait(1500);

  // Subscribe if needed
  const subBtn = document.querySelector(sel.subscribeBtn) as HTMLElement;
  const subSpan = document.querySelector(sel.subscribeSpan) as HTMLElement;
  if (subBtn && subSpan && !/subscribed/i.test(subSpan.textContent || "")) {
    subBtn.click();
    console.log("→ Subscribed");
    await wait(1000);
  }

  // Like if needed
  const likeBtn = document.querySelector(sel.likeBtn) as HTMLElement;
  if (likeBtn && likeBtn.getAttribute("aria-pressed") !== "true") {
    likeBtn.click();
    console.log("→ Liked");
    await wait(1000);
  }

  // Scroll down to comments
  for (let i = 0; i < 3; i++) {
    window.scrollBy(0, 200);
    await wait(500);
  }

  // Fetch and submit AI comment
  const prompt = document.title.replace(" - YouTube", "").trim();
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer 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",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `Generate a natural comment (10–15 words) for: ${prompt}` }],
      }),
    });
    const json = await res.json();
    const comment = (json.choices?.[0]?.message?.content || "").replace(/^"(.*)"$/, "$1").trim();
    if (comment) {
      const area = document.querySelector(sel.commentArea) as HTMLElement;
      area?.click();
      await wait(500);
      const input = document.querySelector(sel.inputField) as HTMLElement;
      input.innerText = comment;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(500);
      const submit = Array.from(document.querySelectorAll(sel.commentBtn))
        .find(el => /comment/i.test(el.getAttribute("aria-label") || "")) as HTMLElement;
      submit?.click();
      console.log("→ Commented:", comment);
      await wait(1000);
    }
  } catch (e) {
    console.error("[Content] Comment fetch failed:", e);
  }
}
