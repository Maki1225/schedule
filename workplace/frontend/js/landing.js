document.addEventListener("DOMContentLoaded", async () => {
  const links = document.querySelectorAll("[data-auth-link]");
  const demoButton = document.getElementById("demoModeButton");
  const heroDemoButton = document.getElementById("heroDemoModeButton");
  const demoOptions = document.getElementById("demoModeOptions");
  const demoMessage = document.getElementById("demoModeMessage");

  try {
    const user = await checkAuth();
    if (user) {
      links.forEach((link) => {
        link.href = "calendar.html";
        link.textContent = "カレンダーへ";
      });
    }
  } catch (error) {
    console.error("ログイン状態の確認に失敗しました:", error);
  }

  function showDemoOptions() {
    demoOptions.hidden = false;
    demoButton.setAttribute("aria-expanded", "true");
    demoOptions.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  demoButton.addEventListener("click", () => {
    const isExpanded = demoButton.getAttribute("aria-expanded") === "true";
    demoOptions.hidden = isExpanded;
    demoButton.setAttribute("aria-expanded", String(!isExpanded));
  });
  heroDemoButton.addEventListener("click", showDemoOptions);

  demoOptions.addEventListener("click", async (event) => {
    const button = event.target instanceof Element
      ? event.target.closest("[data-demo-persona]")
      : null;
    if (!(button instanceof HTMLButtonElement)) return;

    button.disabled = true;
    demoMessage.textContent = "デモを準備しています...";
    try {
      const baseUrl = window.API_BASE_URL || "https://schedule-backend-navy.vercel.app";
      const response = await fetch(`${baseUrl}/api/demo/sessions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: button.dataset.demoPersona }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "デモを開始できませんでした。");
      }
      if (typeof data.sessionToken !== "string" || !data.sessionToken) {
        throw new Error("デモセッションを開始できませんでした。");
      }
      sessionStorage.setItem("demoSessionToken", data.sessionToken);
      window.location.href = "demo.html";
    } catch (error) {
      console.error("デモの開始に失敗しました:", error);
      demoMessage.textContent = error.message || "デモを開始できませんでした。";
      button.disabled = false;
    }
  });
});
