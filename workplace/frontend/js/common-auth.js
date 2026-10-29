
// バックエンドAPIのURL
window.API_BASE_URL =
  window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://schedule-backend-navy.vercel.app";

// 全画面共通の認証確認関数
async function requireAuth() {
  const publicPages = [
    "index.html",
    "login.html",
    "privacy-policy.html",
    "terms-of-service.html"
  ];

  const currentPage =
    window.location.pathname.split("/").pop() || "index.html";

  if (publicPages.includes(currentPage)) {
    return null;
  }

  try {
    const res = await fetch(
      `${window.API_BASE_URL}/api/auth/me`,
      {
        method: "GET",
        credentials: "include"
      }
    );

    if (!res.ok) {
      window.location.replace("login.html");
      return null;
    }

    const data = await res.json();
    return data.user;

  } catch (err) {
    console.error("認証チェックエラー:", err);
    window.location.replace("login.html");
    return null;
  }
}
