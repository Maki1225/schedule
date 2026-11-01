(() => {
  const tokenKey = "demoSessionToken";
  const token = sessionStorage.getItem(tokenKey);
  const isCalendarPage = window.location.pathname.endsWith("/calendar.html");
  if (!isCalendarPage || !token) return;

  const baseUrl = window.API_BASE_URL || "https://schedule-backend-navy.vercel.app";
  const backendOrigin = new URL(baseUrl, window.location.href).origin;
  const nativeFetch = window.fetch.bind(window);
  const events = [];
  let groups = [];
  let user = null;
  let nextEventId = 0;
  let exiting = false;

  window.DemoMode = {
    active: true,
    canManage: (event) => String(event.id || "").startsWith("demo-ephemeral-"),
    expire: () => restoreGroupSelection(),
  };

  if (!sessionStorage.getItem("demoPreviousGroup")) {
    const previousGroup = {
      id: localStorage.getItem("selectedGroupId"),
      name: localStorage.getItem("selectedGroupName"),
    };
    sessionStorage.setItem("demoPreviousGroup", JSON.stringify(previousGroup));
  }
  localStorage.removeItem("selectedGroupId");
  localStorage.removeItem("selectedGroupName");

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  function isBackendRequest(input) {
    const url = input instanceof Request ? input.url : String(input);
    try {
      return new URL(url, window.location.href).origin === backendOrigin;
    } catch {
      return false;
    }
  }

  async function requestBody(input, init) {
    if (init?.body && typeof init.body === "string") {
      return JSON.parse(init.body);
    }
    if (input instanceof Request) return input.clone().json();
    return {};
  }

  function eventGroupName(groupId) {
    return groups.find((group) => String(group.id) === String(groupId))?.name || "グループ";
  }

  function addMemoryEvent(body) {
    const event = {
      id: `demo-ephemeral-${++nextEventId}`,
      group_id: Number(body.group_id),
      group_name: eventGroupName(body.group_id),
      created_by: user?.id,
      creator_name: user?.name || "デモユーザー",
      title: String(body.title || ""),
      description: body.description || "",
      start_time: body.start_time,
      end_time: body.end_time,
      subject: body.subject ?? null,
      subject_color: body.subject_color ?? null,
    };
    events.push(event);
    return event;
  }

  function responseWithEvents(response, addedEvents) {
    return response.clone().json().then((data) => {
      if (!Array.isArray(data.events)) return response;
      return jsonResponse({
        ...data,
        events: [...data.events, ...addedEvents],
      }, response.status);
    });
  }

  window.fetch = async (input, init = {}) => {
    if (!isBackendRequest(input)) return nativeFetch(input, init);

    const requestUrl = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    const method = (init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const pathname = requestUrl.pathname;

    if (pathname === "/api/events" && method === "POST") {
      try {
        const event = addMemoryEvent(await requestBody(input, init));
        return jsonResponse({ message: "デモ中のみ表示するデータを追加しました", event }, 201);
      } catch (error) {
        console.error("デモ予定の追加に失敗しました:", error);
        return jsonResponse({ error: "入力内容を読み取れませんでした。" }, 400);
      }
    }

    const eventMatch = pathname.match(/^\/api\/events\/([^/]+)$/);
    if (eventMatch && ["PUT", "DELETE"].includes(method)) {
      const eventId = decodeURIComponent(eventMatch[1]);
      if (!eventId.startsWith("demo-ephemeral-")) {
        return jsonResponse({ error: "デモ中は登録済みの予定を変更できません。" }, 403);
      }
      const event = events.find((item) => item.id === eventId);
      if (!event) return jsonResponse({ error: "予定が見つかりません。" }, 404);
      if (method === "DELETE") {
        events.splice(events.indexOf(event), 1);
        return jsonResponse({ message: "デモ中の予定を削除しました。" });
      }
      try {
        Object.assign(event, await requestBody(input, init));
        return jsonResponse({ message: "デモ中の予定を更新しました。", event });
      } catch (error) {
        console.error("デモ予定の更新に失敗しました:", error);
        return jsonResponse({ error: "変更内容を読み取れませんでした。" }, 400);
      }
    }

    if (
      method !== "GET" &&
      !pathname.startsWith("/api/demo/") &&
      pathname !== "/api/auth/logout"
    ) {
      return jsonResponse({ error: "デモモードでは登録済みデータを変更できません。" }, 403);
    }

    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    headers.set("Authorization", `Bearer ${token}`);

    let response;
    try {
      response = await nativeFetch(input, { ...init, headers });
    } catch (error) {
      console.error("デモAPIへの接続に失敗しました:", error);
      throw error;
    }

    if (response.status === 401 && !pathname.startsWith("/api/demo/")) {
      restoreGroupSelection();
      return response;
    }

    if (pathname === "/api/auth/me" && response.ok) {
      try {
        user = (await response.clone().json()).user;
        const badgeLabel = document.querySelector("#demoModeBadge span");
        if (badgeLabel && user?.name) {
          badgeLabel.textContent = `デモ：${user.name}`;
        }
      } catch (error) {
        console.error("デモユーザー情報の読み込みに失敗しました:", error);
      }
    }

    if (pathname === "/api/groups" && method === "GET" && response.ok) {
      try {
        groups = (await response.clone().json()).groups || [];
        const currentGroup = groups.find(
          (group) => String(group.id) === localStorage.getItem("selectedGroupId")
        );
        const activeGroup = currentGroup || groups[0];
        if (activeGroup) {
          localStorage.setItem("selectedGroupId", String(activeGroup.id));
          localStorage.setItem("selectedGroupName", activeGroup.name || "グループ");
        }
        if (typeof updateCalendar === "function") updateCalendar();
        if (typeof updateDashboard === "function") updateDashboard();
      } catch (error) {
        console.error("デモグループ情報の読み込みに失敗しました:", error);
      }
    }

    if (pathname === "/api/events" && method === "GET" && response.ok) {
      const groupId = requestUrl.searchParams.get("groupId");
      const addedEvents = events.filter((event) => String(event.group_id) === groupId);
      if (addedEvents.length > 0) return responseWithEvents(response, addedEvents);
    }

    const groupEventsMatch = pathname.match(/^\/api\/groups\/([^/]+)\/events$/);
    if (groupEventsMatch && method === "GET" && response.ok) {
      const groupId = decodeURIComponent(groupEventsMatch[1]);
      const addedEvents = events.filter((event) => String(event.group_id) === groupId);
      if (addedEvents.length > 0) return responseWithEvents(response, addedEvents);
    }

    return response;
  };

  function restoreGroupSelection() {
    if (exiting) return;
    exiting = true;
    try {
      const previous = JSON.parse(sessionStorage.getItem("demoPreviousGroup") || "{}");
      if (previous.id) localStorage.setItem("selectedGroupId", previous.id);
      else localStorage.removeItem("selectedGroupId");
      if (previous.name) localStorage.setItem("selectedGroupName", previous.name);
      else localStorage.removeItem("selectedGroupName");
    } catch (error) {
      console.error("通常モードのグループ選択を復元できませんでした:", error);
    }
    sessionStorage.removeItem("demoPreviousGroup");
    sessionStorage.removeItem(tokenKey);
    window.location.replace("index.html");
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("demo-mode");
    const badge = document.getElementById("demoModeBadge");
    if (badge) badge.hidden = false;
    document.getElementById("demoModeExitButton")?.addEventListener("click", async () => {
      try {
        await nativeFetch(`${baseUrl}/api/demo/sessions/current`, {
          method: "DELETE",
          credentials: "include",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error("デモセッションの終了通知に失敗しました:", error);
      }
      restoreGroupSelection();
    });
  });
})();
