document.addEventListener("DOMContentLoaded", async () => {
  // ログイン確認（共通認証関数の実行）
  if (typeof requireAuth === "function") {
    const user = await requireAuth(API_BASE_URL);
    if (!user) return; // 未ログインなら requireAuth 内で login.html にリダイレクト
  }

  initializeApp();
});

// ---------------------------------------
// アプリ初期化
// ---------------------------------------
function initializeApp() {
  console.log("初期化完了");

  updateClock();

  // 1秒ごとに現在時刻を更新
  setInterval(updateClock, 1000);

  // ダッシュボード更新 (APIからデータ取得)
  updateDashboard();
}
function updateClock() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");

  const text = `${year}/${month}/${day} ${hour}:${minute}:${second}`;

  const clock = document.getElementById("clock");
  if (clock) {
    clock.textContent = text;
  }
}

async function updateDashboard() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/events`, {
      method: "GET",
      credentials: "include", // Cookie送信
    });

    if (!res.ok) {
      console.error("ダッシュボードデータの取得に失敗しました");
      return;
    }

    const tasks = await res.json();

    // 2. 全登録数
    const taskCountEl = document.getElementById("taskCount");
    if (taskCountEl) taskCountEl.textContent = tasks.length;

    // 3. 今日締切の計算 (日付フォーマット YYYY-MM-DD を抽出)
    const today = new Date().toISOString().split("T")[0];

    const todayTasks = tasks.filter((task) => {
      if (!task.end_time) return false;
      // DB側の end_time (ISO文字列) から年月日(YYYY-MM-DD)部分を取り出して比較
      const taskDeadlineDate = new Date(task.end_time).toISOString().split("T")[0];
      return taskDeadlineDate === today;
    });

    const todayTaskCountEl = document.getElementById("todayTaskCount");
    if (todayTaskCountEl) todayTaskCountEl.textContent = todayTasks.length;

    // 4. 優先度：高 のカウント
    // ※ DBのイベントテーブルに priority または description 等で判定する場合の処理
    const highPriority = tasks.filter(
      (task) => task.priority === "高" || (task.description && task.description.includes("優先度:高"))
    );

    const highPriorityCountEl = document.getElementById("highPriorityCount");
    if (highPriorityCountEl) highPriorityCountEl.textContent = highPriority.length;

  } catch (err) {
    console.error("通信エラー:", err);
  }
}