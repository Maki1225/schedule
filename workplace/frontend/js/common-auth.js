
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
