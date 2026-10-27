document.addEventListener("DOMContentLoaded", () => {
    initializeCalendar();
});

function initializeCalendar() {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) return;

    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: "ja",
        initialView: "dayGridMonth",
        height: "auto",
        selectable: true,
        navLinks: true,
        nowIndicator: true,
        editable: false,
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek"
        },
        buttonText: {
            today: "今日",
            month: "月",
            week: "週"
        },
        dateClick: function(info) {
            showSchedule(info.dateStr);
        }
    });

    calendar.render();
    updateCalendar();
}

async function updateCalendar() {
    if (!calendar) return;

    try {
        // バックエンド API からイベント一覧を取得
        const res = await fetch(`${API_BASE_URL}/api/events`, {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) {
            console.error("カレンダーデータの取得に失敗しました");
            return;
        }

        const eventsData = await res.json();
        calendar.removeAllEvents();

        eventsData.forEach(event => {
            let color = "#4285F4";
            const priority = event.priority || "";

            if (priority === "高" || (event.description && event.description.includes("優先度:高"))) {
                color = "#E53935";
            } else if (priority === "中" || (event.description && event.description.includes("優先度:中"))) {
                color = "#FB8C00";
            } else if (priority === "低" || (event.description && event.description.includes("優先度:低"))) {
                color = "#43A047";
            }

            calendar.addEvent({
                id: String(event.id),
                title: (event.type === "task" ? "📝 " : "📅 ") + event.title,
                start: event.start_time || event.start,
                end: event.end_time || event.end,
                allDay: !event.start_time?.includes("T"),
                backgroundColor: color,
                borderColor: color,
                extendedProps: event
            });
        });
    } catch (err) {
        console.error("カレンダー更新エラー:", err);
    }
}

async function showSchedule(dateStr) {
    const scheduleList = document.getElementById("scheduleList");
    if (!scheduleList) return;

    try {
        const res = await fetch(`${API_BASE_URL}/api/events`, {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) return;

        const allEvents = await res.json();

        // 指定日のイベントを抽出
        const dayEvents = allEvents.filter(event => {
            const eventDate = (event.start_time || event.start || "").split("T")[0];
            return eventDate === dateStr;
        });

        scheduleList.innerHTML = "";

        const title = document.createElement("h3");
        title.textContent = dateStr;
        scheduleList.appendChild(title);

        if (dayEvents.length === 0) {
            const p = document.createElement("p");
            p.textContent = "この日の予定・課題はありません。";
            scheduleList.appendChild(p);
            return;
        }

        dayEvents.forEach(event => {
            const div = document.createElement("div");
            div.className = "task-card";
            div.innerHTML = `
                <h3>${escapeHtml(event.title)}</h3>
                ${event.description ? `<p>📝 ${escapeHtml(event.description)}</p>` : ""}
                ${event.start_time ? `<p>🕐 ${escapeHtml(event.start_time)}</p>` : ""}
            `;
            scheduleList.appendChild(div);
        });
    } catch (err) {
        console.error("詳細表示エラー:", err);
    }
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function refreshCalendar() {
    updateCalendar();
}