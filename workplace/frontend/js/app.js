
document.addEventListener("DOMContentLoaded", async () => {

    // カレンダー画面以外では実行しない
    const currentPage =
        window.location.pathname.split("/").pop();

    if (currentPage !== "calendar.html") {
        return;
    }

    // ログイン状態を確認
    const user = await requireAuth();

    // 未ログインなら処理を終了
    if (!user) {
        return;
    }

    // ユーザー名を表示
    const userNameElement =
        document.getElementById("user-name");

    if (userNameElement) {
        userNameElement.textContent =
            `${user.name || user.email} さん`;
    }

    // ログアウトボタン
    const logoutBtn =
        document.getElementById("logout-btn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {

            try {
                const res = await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "include"
                });

                if (!res.ok) {
                    alert("ログアウトに失敗しました");
                    return;
                }

                window.location.href = "login.html";

            } catch (err) {
                console.error("ログアウトエラー:", err);
                alert("通信エラーが発生しました");
            }

        });
    }
});
