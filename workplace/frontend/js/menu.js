// =======================================
// menu.js
// メニューと一覧表示の管理
// =======================================

document.addEventListener("DOMContentLoaded", () => {

    const menuButton = document.getElementById("menuButton");
    const menuPanel = document.getElementById("menuPanel");

    const calendarButton = document.getElementById("calendarMenuButton");
    const taskButton = document.getElementById("taskMenuButton");
    const scheduleButton = document.getElementById("scheduleMenuButton");
    const logoutButton = document.getElementById("logoutButton");

    // 表示エリア（ビュー）要素の取得
    const calendarView = document.getElementById("calendarView");
    const taskView = document.getElementById("taskView");
    const scheduleView = document.getElementById("scheduleView");

    // =========================
    // メニュー開閉ボタン
    // =========================
    menuButton.addEventListener("click", () => {
        menuPanel.classList.toggle("active");
    });

    // =========================
    // 画面切り替え関数
    // =========================
    function switchView(targetView) {
        // すべてのビューを非表示
        calendarView.style.display = "none";
        taskView.style.display = "none";
        scheduleView.style.display = "none";

        // 対象のビューのみ表示
        targetView.style.display = "block";

        // メニューパネルを閉じる
        menuPanel.classList.remove("active");
    }

    // =========================
    // 1. カレンダー表示ボタン
    // =========================
    calendarButton.addEventListener("click", () => {
        switchView(calendarView);

        // FullCalendarの崩れ防止（非表示から表示への変更時に再描画）
        if (window.calendar) {
            window.calendar.updateSize();
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

    // =========================
    // 2. 課題一覧表示ボタン
    // =========================
    taskButton.addEventListener("click", () => {
        switchView(taskView);
        displayTasks();
    });

    // =========================
    // 3. 予定一覧表示ボタン
    // =========================
    scheduleButton.addEventListener("click", () => {
        switchView(scheduleView);
        displaySchedules();
    });

    // =========================
    // ログアウト処理
    // =========================
    if (logoutButton) {
        logoutButton.addEventListener("click", async () => {
            const result = confirm("ログアウトしますか？");

            if (!result) return;

            try {
                const res = await fetch("http://localhost:5000/api/auth/logout", {
                    method: "POST",
                    credentials: "include"
                });

                if (res.ok) {
                    alert("ログアウトしました");
                    window.location.href = "login.html";
                } else {
                    alert("ログアウトに失敗しました");
                }
            } catch (error) {
                console.error("ログアウトエラー:", error);
                alert("サーバーとの通信に失敗しました");
            }
        });
    }

});


// =========================
// 課題一覧表示
// =========================
function displayTasks() {
    const taskList = document.getElementById("taskList");
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

    taskList.innerHTML = "";

    if (tasks.length === 0) {
        taskList.innerHTML = "<p>課題はありません。</p>";
        return;
    }

    tasks.forEach(task => {
        const div = document.createElement("div");
        div.className = "task-card";

        div.innerHTML = `
            <h3>${escapeHtmlMenu(task.title)}</h3>
            <p>📅 提出期限：${escapeHtmlMenu(task.deadline)}</p>
            <p>📝 課題をする日：${escapeHtmlMenu(task.studyDate || "未設定")}</p>
            <p>⏰ 必要時間：${escapeHtmlMenu(String(task.studyTime || 0))}時間</p>
            <p>⭐ 優先順位：${escapeHtmlMenu(task.priority)}</p>
        `;

        taskList.appendChild(div);
    });
}


// =========================
// 予定一覧表示
// =========================
function displaySchedules() {
    const scheduleList = document.getElementById("scheduleList");
    const schedules = JSON.parse(localStorage.getItem("schedules")) || [];

    scheduleList.innerHTML = "";

    if (schedules.length === 0) {
        scheduleList.innerHTML = "<p>予定はありません。</p>";
        return;
    }

    schedules.forEach(schedule => {
        const div = document.createElement("div");
        div.className = "schedule-card";

        div.innerHTML = `
            <h3>${escapeHtmlMenu(schedule.title)}</h3>
            <p>📅 日付：${escapeHtmlMenu(schedule.date)}</p>
            <p>🕐 時間：${escapeHtmlMenu(schedule.startTime)} ～ ${escapeHtmlMenu(schedule.endTime)}</p>
            ${schedule.memo ? `<p>📝 メモ：${escapeHtmlMenu(schedule.memo)}</p>` : ""}
        `;

        scheduleList.appendChild(div);
    });
}


// =========================
// HTMLエスケープ関数
// =========================
function escapeHtmlMenu(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}