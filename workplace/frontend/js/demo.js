(() => {
  const baseUrl = window.API_BASE_URL || "https://schedule-backend-navy.vercel.app";
  const userName = document.getElementById("demoUserName");
  const status = document.getElementById("demoStatus");
  const taskList = document.getElementById("demoTasks");
  const scheduleList = document.getElementById("demoSchedules");
  const taskForm = document.getElementById("demoTaskForm");
  const groupSelect = document.getElementById("demoTaskGroup");
  const logoutButton = document.getElementById("demoLogoutButton");

  let sampleEvents = [];
  let userTasks = [];
  let userId = "";
  let nextTaskId = 0;
  let calendar;

  function isTask(event) {
    return String(event.description || "").startsWith("[課題]");
  }

  function renderEvent(event, isUserTask = false) {
    const card = document.createElement("article");
    card.className = "demo-event-card";
    card.dataset.kind = isUserTask ? "user-task" : isTask(event) ? "task" : "schedule";

    const title = document.createElement("h3");
    title.textContent = event.title || "名称未設定";
    card.appendChild(title);

    const group = document.createElement("p");
    group.textContent = `👥 ${event.group_name || "グループ"}`;
    card.appendChild(group);

    const date = document.createElement("p");
    const dateValue = isTask(event) ? event.end_time : event.start_time;
    date.textContent = dateValue
      ? `${isTask(event) ? "期限" : "日時"}：${new Date(dateValue).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`
      : "";
    card.appendChild(date);

    const detailText = String(event.description || "").replace(/^\[(?:課題|予定)\]\s*/, "").trim();
    if (detailText) {
      const detail = document.createElement("p");
      detail.textContent = detailText;
      card.appendChild(detail);
    }

    if (isUserTask) {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.textContent = "この課題を削除";
      removeButton.addEventListener("click", () => {
        userTasks = userTasks.filter((task) => task.id !== event.id);
        render();
      });
      card.appendChild(removeButton);
    } else if (event.creator_name) {
      const creator = document.createElement("p");
      creator.textContent = `作成者：${event.creator_name}`;
      card.appendChild(creator);
    }

    return card;
  }

  function render() {
    const allEvents = [...sampleEvents, ...userTasks];
    const tasks = allEvents.filter(isTask);
    const schedules = allEvents.filter((event) => !isTask(event));

    document.getElementById("demoTaskCount").textContent = String(tasks.length);
    document.getElementById("demoScheduleCount").textContent = String(schedules.length);

    taskList.replaceChildren();
    scheduleList.replaceChildren();
    tasks.forEach((task) => {
      taskList.appendChild(renderEvent(task, userTasks.includes(task)));
    });
    schedules.forEach((schedule) => scheduleList.appendChild(renderEvent(schedule)));

    if (tasks.length === 0) taskList.textContent = "課題はありません。";
    if (schedules.length === 0) scheduleList.textContent = "共有予定はありません。";

    if (calendar) {
      calendar.removeAllEvents();
      allEvents.forEach((event) => {
        const color = isTask(event) ? "#E53935" : "#4285F4";
        calendar.addEvent({
          id: String(event.id),
          title: event.title,
          start: event.start_time,
          end: event.end_time,
          backgroundColor: color,
          borderColor: color,
          extendedProps: event,
        });
      });
    }
  }

  function initializeCalendar() {
    const calendarElement = document.getElementById("demoCalendar");
    calendar = new FullCalendar.Calendar(calendarElement, {
      locale: "ja",
      timeZone: "Asia/Tokyo",
      themeSystem: "monarch",
      initialView: "dayGridMonth",
      height: "auto",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,listWeek",
      },
      buttonText: {
        today: "今日",
        month: "月",
        week: "週",
        list: "リスト",
        listWeek: "週一覧",
      },
      dayMaxEventRows: true,
    });
    calendar.render();
  }

  async function loadDemo() {
    const response = await fetch(`${baseUrl}/api/demo/me`, {
      credentials: "include",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("demoSessionToken") || ""}`,
      },
    });
    if (response.status === 401) {
      sessionStorage.removeItem("demoSessionToken");
      window.location.replace("index.html");
      return;
    }
    if (!response.ok) throw new Error("デモ情報を取得できませんでした。");

    const data = await response.json();
    if (!data.user || !Array.isArray(data.groups) || !Array.isArray(data.events)) {
      throw new Error("デモ情報の形式が正しくありません。");
    }

    userId = data.user.id;
    sampleEvents = data.events;
    userName.textContent = `${data.user.name}（デモ）`;
    document.getElementById("demoGroupCount").textContent = String(data.groups.length);
    groupSelect.replaceChildren();
    data.groups.forEach((groupName) => {
      const option = document.createElement("option");
      option.value = groupName;
      option.textContent = groupName;
      groupSelect.appendChild(option);
    });
    initializeCalendar();
    render();
  }

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const titleInput = document.getElementById("demoTaskTitle");
    const deadlineInput = document.getElementById("demoTaskDeadline");
    const priority = document.getElementById("demoTaskPriority").value;
    const title = titleInput.value.trim();
    const deadline = deadlineInput.value;
    if (!title || !deadline) return;

    const end = new Date(`${deadline}T23:59:00+09:00`);
    if (Number.isNaN(end.getTime())) {
      status.textContent = "提出期限を正しく入力してください。";
      return;
    }

    userTasks.push({
      id: `user-task-${++nextTaskId}`,
      group_id: 0,
      group_name: groupSelect.value,
      created_by: userId,
      title,
      description: `[課題] 優先度:${priority}`,
      start_time: new Date().toISOString(),
      end_time: end.toISOString(),
    });
    titleInput.value = "";
    deadlineInput.value = "";
    status.textContent = "課題を追加しました。この内容はこのページ内だけで保持されます。";
    render();
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      const response = await fetch(`${baseUrl}/api/demo/sessions/current`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error("デモを終了できませんでした。");
      sessionStorage.removeItem("demoSessionToken");
      userTasks = [];
      window.location.replace("index.html");
    } catch (error) {
      console.error("デモの終了に失敗しました:", error);
      status.textContent = error.message || "デモを終了できませんでした。";
      logoutButton.disabled = false;
    }
  });

  window.addEventListener("pagehide", () => {
    userTasks = [];
    render();
  });
  window.addEventListener("pageshow", () => {
    render();
  });

  loadDemo().catch((error) => {
    console.error("デモ画面の初期化に失敗しました:", error);
    userName.textContent = "デモ情報を読み込めません";
    status.textContent = error.message || "デモを読み込めませんでした。";
  });
})();
