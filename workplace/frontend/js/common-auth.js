
// 全画面共通の認証確認関数
async function requireAuth() {

  // 認証不要の公開ページ
  const publicPages = [
    "index.html",
    "login.html",
    "privacy-policy.html",
    "terms-of-service.html"
  ];

  // 現在のファイル名を取得
  const currentPage =
    window.location.pathname.split("/").pop() || "index.html";

  // 公開ページでは認証チェックを行わない
  if (publicPages.includes(currentPage)) {
    return null;
  }

  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include"
    });

    if (!res.ok) {
      // 未ログインならログイン画面へ
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

// メイン画面（index.html等）用：未ログインなら login.html へ飛ばす
async function requireAuth(baseUrl = window.API_BASE_URL) {
  const user = await checkAuth(baseUrl);
  if (!user) {
    if (!window.location.pathname.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
    return null;
  }
  return user;
}

// ログイン画面（login.html）用：ログイン済みなら index.html へ飛ばす
async function redirectIfAuthenticated(baseUrl = window.API_BASE_URL) {
  const user = await checkAuth(baseUrl);
  if (user) {
    window.location.href = 'index.html';
  }
}