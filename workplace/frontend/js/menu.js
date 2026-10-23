// =======================================
// menu.js
// メニューと一覧表示の管理
// =======================================

document.addEventListener("DOMContentLoaded", () => {

    const menuButton =
        document.getElementById("menuButton");

    const menuPanel =
        document.getElementById("menuPanel");

    const calendarButton =
        document.getElementById("calendarMenuButton");

    const taskButton =
        document.getElementById("taskMenuButton");

    const scheduleButton =
        document.getElementById("scheduleMenuButton");

    const logoutButton = 
        document.getElementById("logoutButton");


    // =========================
    // メニューボタン
    // =========================

    menuButton.addEventListener("click", () => {

        menuPanel.classList.toggle("active");

    });


    // =========================
    // カレンダー
    // =========================

    calendarButton.addEventListener("click", () => {

        closeAllPanels();

        // ホーム画面を表示
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

        menuPanel.classList.remove("active");

    });


    // =========================
    // 課題一覧
    // =========================

    taskButton.addEventListener("click", () => {

        closeAllPanels();

        const panel =
            document.getElementById("taskPanel");

        panel.classList.add("active");

        displayTasks();

        menuPanel.classList.remove("active");

    });


    // =========================
    // 予定一覧
    // =========================

    scheduleButton.addEventListener("click", () => {

        closeAllPanels();

        const panel =
            document.getElementById("schedulePanel");

        panel.classList.add("active");

        displaySchedules();

        menuPanel.classList.remove("active");

    });


    // =========================
    // ×ボタン
    // =========================

    document.querySelectorAll(".closePanel")
        .forEach(button => {

            button.addEventListener("click", () => {

                const panelId =
                    button.dataset.panel;

                document
                    .getElementById(panelId)
                    .classList.remove("active");

            });

        });

    // =========================
    // ログアウト
    // =========================

    if (logoutButton) {

        logoutButton.addEventListener("click", async () => {

            const result = confirm("ログアウトしますか？");

            if (!result) {
                return;
            }

            try {

                const res = await fetch("/api/auth/logout", {
                    method: "POST",
                    credentials: "include"
                });

                if (!res.ok) {
                    alert("ログアウトに失敗しました");
                    return;
                }

                // ログイン画面へ移動
                window.location.replace("login.html");

            } catch (error) {

                console.error("ログアウトエラー:", error);

                alert("サーバーとの通信に失敗しました");

            }

        });

    }

});


// =========================
// すべてのパネルを閉じる
// =========================

function closeAllPanels(){

    document
        .querySelectorAll(".overlay-panel")
        .forEach(panel => {

            panel.classList.remove("active");

        });

}


// =========================
// 課題一覧表示
// =========================

function displayTasks(){

    const taskList =
        document.getElementById("taskList");

    const tasks =
        JSON.parse(
            localStorage.getItem("tasks")
        ) || [];

    taskList.innerHTML = "";

    if(tasks.length === 0){

        taskList.innerHTML =
            "<p>課題はありません。</p>";

        return;
    }


    tasks.forEach(task => {

        const div =
            document.createElement("div");

        div.className = "task-card";

        div.innerHTML = `

            <h3>
                ${escapeHtmlMenu(task.title)}
            </h3>

            <p>
                📅 提出期限：
                ${escapeHtmlMenu(task.deadline)}
            </p>

            <p>
                📝 課題をする日：
                ${escapeHtmlMenu(
                    task.studyDate || "未設定"
                )}
            </p>

            <p>
                ⏰ 必要時間：
                ${escapeHtmlMenu(
                    String(task.studyTime || 0)
                )}時間
            </p>

            <p>
                ⭐ 優先順位：
                ${escapeHtmlMenu(task.priority)}
            </p>

        `;

        taskList.appendChild(div);

    });

}


// =========================
// 予定一覧表示
// =========================

function displaySchedules(){

    const scheduleList =
        document.getElementById("scheduleList");

    const schedules =
        JSON.parse(
            localStorage.getItem("schedules")
        ) || [];

    scheduleList.innerHTML = "";

    if(schedules.length === 0){

        scheduleList.innerHTML =
            "<p>予定はありません。</p>";

        return;
    }


    schedules.forEach(schedule => {

        const div =
            document.createElement("div");

        div.className = "schedule-card";

        div.innerHTML = `

            <h3>
                ${escapeHtmlMenu(schedule.title)}
            </h3>

            <p>
                📅 日付：
                ${escapeHtmlMenu(schedule.date)}
            </p>

            <p>
                🕐 時間：
                ${escapeHtmlMenu(schedule.startTime)}
                ～ 
                ${escapeHtmlMenu(schedule.endTime)}
            </p>

            ${
                schedule.memo
                ?
                `<p>
                    📝 メモ：
                    ${escapeHtmlMenu(schedule.memo)}
                </p>`
                :
                ""
            }

        `;

        scheduleList.appendChild(div);

    });

}



// =========================
// HTMLエスケープ
// =========================

function escapeHtmlMenu(text){

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;

}