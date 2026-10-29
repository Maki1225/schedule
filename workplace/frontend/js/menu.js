
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
  const shareView = document.getElementById("shareView");

  // メニュー開閉
  if (menuButton && menuPanel) {
    menuButton.addEventListener("click", () => {
      menuPanel.classList.toggle("active");
    });
  }

  // 画面切り替え
  function switchView(targetView) {
    // すべてのビューを非表示
    const views = [
      calendarView,
      taskView,
      scheduleView,
      shareView
    ];

    views.forEach((view) => {
      if (view) view.style.display = "none";
    });

    // 対象のビューのみ表示
    if (targetView) {
      targetView.style.display = "block";
    }

    // メニューパネルを閉じる
    if (menuPanel) {
      menuPanel.classList.remove("active");
    }
  }

  // カレンダー表示
  if (calendarButton) {
    calendarButton.addEventListener("click", () => {
      switchView(calendarView);

      if (window.calendar) {
        window.calendar.updateSize();
      }

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  // 課題一覧表示
  if (taskButton) {
    taskButton.addEventListener("click", () => {
      switchView(taskView);
      displayTasks();
    });
  }

  // 予定一覧表示
  if (scheduleButton) {
    scheduleButton.addEventListener("click", () => {
      switchView(scheduleView);
      displaySchedules();
    });
  }

  // ログアウト
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      const result = confirm("ログアウトしますか？");
      if (!result) return;

      try {
        const res = await fetch(
          `${window.API_BASE_URL}/api/auth/logout`,
          {
            method: "POST",
            credentials: "include"
          }
        );

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

// =======================================
// 課題一覧表示
// =======================================
async function displayTasks() {
  const taskList = document.getElementById("taskList");
  if (!taskList) return;

  const groupId = localStorage.getItem("selectedGroupId");
  taskList.replaceChildren();

  if (!groupId) {
    taskList.textContent = "先にグループを作成するか、参加してください。";
    return;
  }

  try {
    const res = await fetch(
      `${window.API_BASE_URL}/api/events?groupId=${encodeURIComponent(groupId)}`,
      { credentials: "include" }
    );

    if (res.status === 401) {
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      throw new Error("課題の取得に失敗しました。");
    }

    const data = await res.json();
    const tasks = (data.events || []).filter(event =>
      (event.description || "").startsWith("[課題]")
    );

    if (tasks.length === 0) {
      taskList.textContent = "課題はありません。";
      return;
    }

    tasks.forEach(task => {
      const card = document.createElement("div");
      card.className = "task-card";

      const title = document.createElement("h3");
      title.textContent = task.title || "";

      const deadline = document.createElement("p");
      deadline.textContent = `📅 提出期限：${task.end_time
        ? new Date(task.end_time).toLocaleString("ja-JP")
        : "未設定"
        }`;

      card.append(title, deadline);
      taskList.appendChild(card);
    });
  } catch (error) {
    console.error("課題一覧の取得エラー:", error);
    taskList.textContent = "課題一覧を取得できませんでした。";
  }
}

// =======================================
// 予定一覧表示
// =======================================
async function displaySchedules() {
  const scheduleList = document.getElementById("scheduleList");
  if (!scheduleList) return;

  const groupId = localStorage.getItem("selectedGroupId");
  scheduleList.replaceChildren();

  if (!groupId) {
    scheduleList.textContent = "先にグループを作成するか、参加してください。";
    return;
  }

  try {
    const res = await fetch(
      `${window.API_BASE_URL}/api/events?groupId=${encodeURIComponent(groupId)}`,
      { credentials: "include" }
    );

    if (res.status === 401) {
      window.location.href = "login.html";
      return;
    }

    if (!res.ok) {
      throw new Error("予定の取得に失敗しました。");
    }

    const data = await res.json();
    const events = (data.events || []).filter(event =>
      (event.description || "").startsWith("[予定]")
    );

    if (events.length === 0) {
      scheduleList.textContent = "予定はありません。";
      return;
    }

    events.forEach(event => {
      const card = document.createElement("div");
      card.className = "schedule-card";

      const title = document.createElement("h3");
      title.textContent = event.title || "";

      const date = document.createElement("p");
      date.textContent = `📅 日付：${event.start_time
        ? new Date(event.start_time).toLocaleDateString("ja-JP", {
          timeZone: "Asia/Tokyo"
        })
        : "未設定"
        }`;

      const time = document.createElement("p");
      if (event.start_time && event.end_time) {
        const start = new Date(event.start_time).toLocaleTimeString(
          "ja-JP",
          {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo"
          }
        );

        const end = new Date(event.end_time).toLocaleTimeString(
          "ja-JP",
          {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Tokyo"
          }
        );

        time.textContent = `🕐 ${start} ～ ${end}`;
      }

      card.append(title, date, time);
      scheduleList.appendChild(card);
    });
  } catch (error) {
    console.error("予定一覧の取得エラー:", error);
    scheduleList.textContent = "予定一覧を取得できませんでした。";
  }
}

// =======================================
// HTMLエスケープ関数
// =======================================
function escapeHtmlMenu(text) {
  if (!text) return "";

  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
