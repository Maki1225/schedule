(() => {
  const baseUrl = window.API_BASE_URL || "https://schedule-backend-navy.vercel.app";
  const tokenKey = "demoSessionToken";
  const taskStorageKey = "studyPlannerDemoTasks";
  const chatStorageKey = "studyPlannerDemoChat";
  const internalNavigationKey = "studyPlannerDemoNavigation";
  const userName = document.getElementById("demoUserName");
  const status = document.getElementById("demoStatus");
  const taskList = document.getElementById("demoTasks");
  const scheduleList = document.getElementById("demoSchedules");
  const taskForm = document.getElementById("demoTaskForm");
  const groupSelect = document.getElementById("demoTaskGroup");
  const chatForm = document.getElementById("demoChatForm");
  const chatInput = document.getElementById("demoChatInput");
  const chatPartner = document.getElementById("demoChatPartner");
  const chatMessages = document.getElementById("demoChatMessages");
  const chatSendButton = document.getElementById("demoChatSend");
  const logoutButton = document.getElementById("demoLogoutButton");
  const profileDialog = document.getElementById("profileDialog");
  const profilesContainer = document.getElementById("demoProfiles");

  const profileStyles = {
    yuito: "avatar-violet",
    aoi: "avatar-blue",
    haruhi: "avatar-green",
    minami: "avatar-orange",
  };
  const initialMessages = {
    yuito: "実験レポートの役割分担、今日中に確認しよう！",
    aoi: "講義の予定を共有しておいたよ。ノートもあとで送るね。",
    haruhi: "過去問を共有フォルダに入れたよ。進捗どう？",
    minami: "部活が終わったら課題に取りかかるね。リマインド助かる！",
  };
  const inappropriateTerms = [
    "死ね", "消えろ", "殺す", "きもい", "うざい", "ばか", "あほ",
    "くそ", "fuck", "shit", "bitch", "idiot",
  ];

  let profiles = [];
  let groups = [];
  let sampleEvents = [];
  let userTasks = [];
  let messages = [];
  let userId = "";
  let currentProfileId = "";
  let sentMessageCount = 0;
  let nextTaskId = 0;

  function clearTemporaryData() {
    sessionStorage.removeItem(taskStorageKey);
    sessionStorage.removeItem(chatStorageKey);
  }

  const navigationEntry = performance.getEntriesByType("navigation")[0];
  const isInternalNavigation = sessionStorage.getItem(internalNavigationKey) === "1";
  sessionStorage.removeItem(internalNavigationKey);
  if (navigationEntry?.type === "reload" || !isInternalNavigation) clearTemporaryData();

  function getToken() {
    return sessionStorage.getItem(tokenKey) || "";
  }

  function authHeaders() {
    return { Authorization: `Bearer ${getToken()}` };
  }

  function displayError(error, fallback) {
    console.error(fallback, error);
    status.textContent = error instanceof Error ? error.message : fallback;
  }

  function isTask(event) {
    return String(event.description || "").startsWith("[課題]");
  }

  function profileById(profileId) {
    return profiles.find((profile) => profile.id === profileId);
  }

  function dateLabel(dateValue, dateOnly = false) {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ja-JP", dateOnly
      ? { timeZone: "Asia/Tokyo", year: "numeric", month: "long", day: "numeric" }
      : { timeZone: "Asia/Tokyo", year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }
    ).format(date);
  }

  function persistTemporaryData() {
    sessionStorage.setItem(taskStorageKey, JSON.stringify(userTasks));
    sessionStorage.setItem(chatStorageKey, JSON.stringify({
      messages,
      sentMessageCount,
    }));
  }

  function updateTaskCountDisplay() {
    const allEvents = [...sampleEvents, ...userTasks];
    const taskCount = document.getElementById("demoTaskCount");
    const scheduleCount = document.getElementById("demoScheduleCount");
    if (taskCount) taskCount.textContent = String(allEvents.filter(isTask).length);
    if (scheduleCount) scheduleCount.textContent = String(allEvents.filter((event) => !isTask(event)).length);

    profiles.forEach((profile) => {
      const cardCount = document.querySelector(`[data-task-count="${profile.id}"]`);
      if (cardCount) {
        const addedCount = profile.id === currentProfileId ? userTasks.filter(isTask).length : 0;
        cardCount.textContent = String(profile.taskCount + addedCount);
      }
    });

    if (profileDialog?.open) {
      const openProfileId = profileDialog.dataset.profileId;
      const openProfile = profileById(openProfileId);
      if (openProfile) {
        const addedCount = openProfileId === currentProfileId ? userTasks.filter(isTask).length : 0;
        document.getElementById("profileDialogTaskCount").textContent = String(openProfile.taskCount + addedCount);
      }
    }
  }

  function renderEvent(event, isUserTask = false) {
    const task = isTask(event);
    const card = document.createElement("article");
    card.className = "demo-event-card";
    card.dataset.kind = task ? "task" : "schedule";

    const title = document.createElement("h4");
    title.textContent = event.title || "名称未設定";
    card.appendChild(title);

    const group = document.createElement("p");
    group.textContent = `👥 ${event.group_name || "グループ"}`;
    card.appendChild(group);

    const date = document.createElement("p");
    const dateValue = task ? event.end_time : event.start_time;
    date.textContent = dateValue
      ? `${task ? "期限" : "日時"}：${dateLabel(dateValue)}`
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
        userTasks = userTasks.filter((taskEvent) => taskEvent.id !== event.id);
        persistTemporaryData();
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
    if (!taskList || !scheduleList) {
      updateTaskCountDisplay();
      return;
    }

    const allEvents = [...sampleEvents, ...userTasks];
    const tasks = allEvents.filter(isTask);
    const schedules = allEvents.filter((event) => !isTask(event));

    taskList.replaceChildren();
    scheduleList.replaceChildren();
    tasks.forEach((task) => taskList.appendChild(renderEvent(task, userTasks.includes(task))));
    schedules.forEach((schedule) => scheduleList.appendChild(renderEvent(schedule)));

    if (tasks.length === 0) taskList.textContent = "課題はありません。";
    if (schedules.length === 0) scheduleList.textContent = "共有予定はありません。";
    updateTaskCountDisplay();
  }

  function renderProfiles() {
    profilesContainer?.replaceChildren();
    groupSelect?.replaceChildren();
    chatPartner?.replaceChildren();

    groups.forEach((group) => {
      if (!groupSelect) return;
      const option = document.createElement("option");
      option.value = String(group.id);
      option.textContent = group.name || "グループ";
      groupSelect.appendChild(option);
    });

    profiles.forEach((profile) => {
      if (profilesContainer) {
        const card = document.createElement("article");
        card.className = "profile-card";
        card.id = `profile-card-${profile.id}`;

        const heading = document.createElement("div");
        heading.className = "profile-card-heading";
        const avatar = document.createElement("span");
        avatar.className = `person-avatar ${profileStyles[profile.id] || "avatar-violet"}`;
        avatar.textContent = profile.name.slice(0, 1);
        avatar.setAttribute("aria-hidden", "true");
        heading.appendChild(avatar);
        const name = document.createElement("h3");
        name.textContent = profile.name;
        heading.appendChild(name);
        card.appendChild(heading);

        const birthday = document.createElement("p");
        birthday.className = "profile-birthday";
        birthday.textContent = `誕生日：${dateLabel(`${profile.birthday}T00:00:00+09:00`, true)}`;
        card.appendChild(birthday);

        const role = document.createElement("p");
        role.className = "profile-role";
        role.textContent = profile.role;
        card.appendChild(role);

        const taskCount = document.createElement("p");
        taskCount.className = "profile-task-count";
        taskCount.append("現在の課題数：");
        const taskCountValue = document.createElement("strong");
        taskCountValue.dataset.taskCount = profile.id;
        taskCountValue.textContent = String(profile.taskCount);
        taskCount.appendChild(taskCountValue);
        taskCount.append(" 件");
        card.appendChild(taskCount);

        const actions = document.createElement("div");
        actions.className = "profile-actions";
        const detailButton = document.createElement("button");
        detailButton.type = "button";
        detailButton.dataset.profileDetail = profile.id;
        detailButton.textContent = "プロフィールを見る";
        actions.appendChild(detailButton);
        const loginButton = document.createElement("button");
        loginButton.type = "button";
        loginButton.dataset.demoPersona = profile.id;
        loginButton.textContent = `${profile.name}としてログイン`;
        actions.appendChild(loginButton);
        card.appendChild(actions);
        profilesContainer.appendChild(card);
      }

      if (profile.id !== currentProfileId && chatPartner) {
        const option = document.createElement("option");
        option.value = profile.id;
        option.textContent = profile.name;
        chatPartner.appendChild(option);
      }
    });

    document.querySelectorAll(".map-person").forEach((button) => {
      const profile = profileById(button.dataset.profileId);
      button.disabled = !profile;
      if (profile) {
        button.setAttribute("aria-label", `${profile.name}のプロフィールを表示`);
        const name = button.querySelector(".map-name");
        if (name) name.textContent = profile.name;
        const avatar = button.querySelector(".person-avatar");
        if (avatar) avatar.textContent = profile.name.slice(0, 1);
      }
    });
  }

  function showProfile(profileId) {
    const profile = profileById(profileId);
    if (!profile || !profileDialog) return;

    const avatar = document.getElementById("profileDialogAvatar");
    avatar.className = `person-avatar ${profileStyles[profile.id] || "avatar-violet"}`;
    avatar.textContent = profile.name.slice(0, 1);
    document.getElementById("profileDialogName").textContent = profile.name;
    document.getElementById("profileDialogBirthday").textContent =
      `誕生日：${dateLabel(`${profile.birthday}T00:00:00+09:00`, true)}`;
    document.getElementById("profileDialogRole").textContent = profile.role;
    profileDialog.dataset.profileId = profile.id;
    const addedCount = profile.id === currentProfileId ? userTasks.filter(isTask).length : 0;
    document.getElementById("profileDialogTaskCount").textContent = String(profile.taskCount + addedCount);
    profileDialog.showModal();

    const card = document.getElementById(`profile-card-${profile.id}`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (card) {
      card.classList.add("is-highlighted");
      window.setTimeout(() => card.classList.remove("is-highlighted"), 1800);
    }
  }

  function renderChat() {
    if (!chatPartner || !chatMessages || !chatSendButton || !chatInput) return;
    const selectedPartnerId = chatPartner.value;
    chatMessages.replaceChildren();
    const conversation = messages.filter((message) =>
      (message.senderId === currentProfileId && message.recipientId === selectedPartnerId) ||
      (message.senderId === selectedPartnerId && message.recipientId === currentProfileId)
    );

    if (conversation.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "まだメッセージはありません。";
      chatMessages.appendChild(empty);
    }

    conversation.forEach((message) => {
      const row = document.createElement("article");
      row.className = `chat-message${message.senderId === currentProfileId ? " is-mine" : ""}`;
      const sender = profileById(message.senderId);
      const senderName = document.createElement("span");
      senderName.className = "chat-message-name";
      senderName.textContent = sender?.name || "メンバー";
      row.appendChild(senderName);

      const text = document.createElement("p");
      text.className = "chat-message-text";
      text.textContent = message.text;
      row.appendChild(text);

      const time = document.createElement("time");
      time.className = "chat-message-time";
      time.dateTime = message.sentAt;
      time.textContent = dateLabel(message.sentAt);
      row.appendChild(time);
      chatMessages.appendChild(row);
    });

    const messageCount = document.getElementById("demoMessageCount");
    if (messageCount) messageCount.textContent = String(sentMessageCount);
    chatSendButton.disabled = sentMessageCount >= 10;
    chatInput.disabled = sentMessageCount >= 10;
    if (sentMessageCount >= 10) chatInput.placeholder = "このセッションの送信上限に達しました";
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function startMessages() {
    try {
      const savedChat = sessionStorage.getItem(chatStorageKey);
      const savedTasks = sessionStorage.getItem(taskStorageKey);
      if (savedChat && savedTasks) {
        const chatData = JSON.parse(savedChat);
        const taskData = JSON.parse(savedTasks);
        if (
          Array.isArray(chatData.messages) &&
          Number.isInteger(chatData.sentMessageCount) &&
          chatData.sentMessageCount >= 0 &&
          chatData.sentMessageCount <= 10 &&
          Array.isArray(taskData)
        ) {
          messages = chatData.messages;
          sentMessageCount = chatData.sentMessageCount;
          userTasks = taskData;
          nextTaskId = userTasks.reduce((maxId, task) => {
            const match = String(task.id).match(/^user-task-(\d+)$/);
            return match ? Math.max(maxId, Number(match[1])) : maxId;
          }, 0);
          return;
        }
      }
    } catch (error) {
      console.error("デモの一時データを読み込めませんでした:", error);
      clearTemporaryData();
    }

    const now = Date.now();
    messages = profiles
      .filter((profile) => profile.id !== currentProfileId)
      .map((profile, index) => ({
        senderId: profile.id,
        recipientId: currentProfileId,
        text: initialMessages[profile.id],
        sentAt: new Date(now - (profiles.length - index) * 60_000).toISOString(),
      }));
    sentMessageCount = 0;
    persistTemporaryData();
  }

  async function loadDemo() {
    if (!getToken()) {
      window.location.replace("index.html");
      return;
    }

    const response = await fetch(`${baseUrl}/api/demo/me`, {
      credentials: "include",
      cache: "no-store",
      headers: authHeaders(),
    });
    if (response.status === 401) {
      sessionStorage.removeItem(tokenKey);
      window.location.replace("index.html");
      return;
    }
    if (!response.ok) throw new Error("デモ情報を取得できませんでした。");

    const data = await response.json();
    if (
      !data.user ||
      !Array.isArray(data.groups) ||
      !Array.isArray(data.events) ||
      !Array.isArray(data.profiles)
    ) {
      throw new Error("デモ情報の形式が正しくありません。");
    }
    if (!data.profiles.every((profile) =>
      typeof profile.id === "string" &&
      typeof profile.name === "string" &&
      typeof profile.birthday === "string" &&
      typeof profile.role === "string" &&
      Number.isFinite(profile.taskCount)
    )) {
      throw new Error("メンバープロフィールの形式が正しくありません。");
    }

    userId = String(data.user.id);
    currentProfileId = data.profiles.find((profile) => profile.email === data.user.email)?.id || "";
    if (!currentProfileId) throw new Error("ログイン中のデモプロフィールを特定できませんでした。");
    profiles = data.profiles;
    groups = data.groups;
    sampleEvents = data.events;
    userName.textContent = `${data.user.name}（デモ）`;

    renderProfiles();
    startMessages();
    render();
    renderChat();
  }

  async function startPersonaSession(profileId, button) {
    button.disabled = true;
    status.textContent = "デモプロフィールを切り替えています...";
    try {
      const response = await fetch(`${baseUrl}/api/demo/sessions`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: profileId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "デモプロフィールを切り替えられませんでした。");
      if (typeof data.sessionToken !== "string" || !data.sessionToken) {
        throw new Error("デモセッションを開始できませんでした。");
      }
      clearTemporaryData();
      sessionStorage.setItem(tokenKey, data.sessionToken);
      sessionStorage.setItem(internalNavigationKey, "1");
      window.location.replace(`demo.html?profile=${encodeURIComponent(profileId)}`);
    } catch (error) {
      displayError(error, "デモプロフィールを切り替えられませんでした。");
      button.disabled = false;
    }
  }

  taskForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const titleInput = document.getElementById("demoTaskTitle");
    const deadlineInput = document.getElementById("demoTaskDeadline");
    const title = titleInput.value.trim();
    const group = groups.find((item) => String(item.id) === groupSelect.value);
    const deadline = deadlineInput.value;
    if (!title || !deadline || !group) {
      status.textContent = "課題名・提出期限・共有先を入力してください。";
      return;
    }

    const end = new Date(`${deadline}T23:59:00+09:00`);
    if (Number.isNaN(end.getTime())) {
      status.textContent = "提出期限を正しく入力してください。";
      return;
    }

    userTasks.push({
      id: `user-task-${++nextTaskId}`,
      group_id: group.id,
      group_name: group.name || "グループ",
      created_by: userId,
      creator_name: profileById(currentProfileId)?.name || "",
      title,
      description: "[課題]",
      start_time: new Date().toISOString(),
      end_time: end.toISOString(),
    });
    titleInput.value = "";
    deadlineInput.value = "";
    status.textContent = "課題を追加しました。この内容はこのデモ画面だけで保持されます。";
    persistTemporaryData();
    render();
  });

  chatPartner?.addEventListener("change", renderChat);
  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    if (sentMessageCount >= 10) {
      status.textContent = "このセッションで送信できるメッセージは10通までです。";
      renderChat();
      return;
    }
    const normalizedText = text.normalize("NFKC").toLowerCase().replace(/\s/g, "");
    if (inappropriateTerms.some((term) => normalizedText.includes(term))) {
      status.textContent = "不適切な表現が含まれているため、送信できません。";
      return;
    }

    messages.push({
      senderId: currentProfileId,
      recipientId: chatPartner.value,
      text,
      sentAt: new Date().toISOString(),
    });
    sentMessageCount += 1;
    chatInput.value = "";
    status.textContent = "メッセージを送信しました。";
    persistTemporaryData();
    renderChat();
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const pageLink = target.closest(".demo-nav a");
    if (pageLink instanceof HTMLAnchorElement) {
      const destination = new URL(pageLink.href, window.location.href);
      const current = new URL(window.location.href);
      const demoPages = ["demo.html", "demo-tasks.html"];
      if (
        destination.origin === current.origin &&
        destination.pathname !== current.pathname &&
        demoPages.includes(destination.pathname.split("/").pop() || "")
      ) {
        sessionStorage.setItem(internalNavigationKey, "1");
      }
    }

    const loginButton = target.closest("[data-demo-persona]");
    if (loginButton instanceof HTMLButtonElement) {
      void startPersonaSession(loginButton.dataset.demoPersona || "", loginButton);
      return;
    }
    const detailButton = target.closest("[data-profile-detail], .map-person");
    if (detailButton instanceof HTMLButtonElement) {
      const profileId = detailButton.dataset.profileDetail || detailButton.dataset.profileId;
      if (profileId) showProfile(profileId);
    }
  });

  document.getElementById("profileDialogClose")?.addEventListener("click", () => profileDialog?.close());
  profileDialog?.addEventListener("click", (event) => {
    if (event.target === profileDialog) profileDialog.close();
  });

  logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      const response = await fetch(`${baseUrl}/api/demo/sessions/current`, {
        method: "DELETE",
        credentials: "include",
        cache: "no-store",
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("デモを終了できませんでした。");
      clearTemporaryData();
      sessionStorage.removeItem(tokenKey);
      window.location.replace("index.html");
    } catch (error) {
      displayError(error, "デモを終了できませんでした。");
      logoutButton.disabled = false;
    }
  });

  window.addEventListener("pagehide", () => {
    if (sessionStorage.getItem(internalNavigationKey) !== "1") {
      userTasks = [];
      messages = [];
      sentMessageCount = 0;
      clearTemporaryData();
    }
  });

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    startMessages();
    render();
    renderChat();
  });

  loadDemo().catch((error) => {
    displayError(error, "デモを読み込めませんでした。");
    if (userName) userName.textContent = "デモ情報を読み込めません";
  });
})();
