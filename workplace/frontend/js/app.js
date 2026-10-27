
document.addEventListener("DOMContentLoaded", async () => {

    // カレンダー画面以外では実行しない
    const currentPage =
        window.location.pathname.split("/").pop();

    if (currentPage !== "calendar.html") {
        return;
    }

    // ログイン状態を確認
    const user = await requireAuth();

  // 2. ログアウトボタンの処理設定
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          credentials: 'include',
        });
        // ログアウト完了後、ログイン画面へ遷移
        window.location.href = '/login.html';
      } catch (err) {
        console.error('ログアウトエラー:', err);
      }
    });
  }
});
