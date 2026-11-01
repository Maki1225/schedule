(() => {
  const baseUrl = window.API_BASE_URL || "https://schedule-backend-navy.vercel.app";
  const tokenKey = "demoSessionToken";
  const userName = document.getElementById("demoUserName");
  const status = document.getElementById("demoStatus");
  const profilesContainer = document.getElementById("demoProfiles");
  const profileDialog = document.getElementById("profileDialog");
  const profileStyles = {
    yuito: "avatar-violet",
    aoi: "avatar-blue",
    haruhi: "avatar-green",
    nami: "avatar-orange",
  };
  let profiles = [];
  let currentProfileId = "";

  function dateLabel(dateValue) {
    const date = new Date(`${dateValue}T00:00:00+09:00`);
    if (Number.isNaN(date.getTime())) return "誕生日不明";
    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  function showProfile(profileId) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) return;

    const avatar = document.getElementById("profileDialogAvatar");
    avatar.className = `person-avatar ${profileStyles[profile.id] || "avatar-violet"}`;
    avatar.textContent = profile.name.slice(0, 1);
    document.getElementById("profileDialogName").textContent = profile.name;
    document.getElementById("profileDialogBirthday").textContent = `誕生日：${dateLabel(profile.birthday)}`;
    document.getElementById("profileDialogRole").textContent = profile.role;
    document.getElementById("profileDialogTaskCount").textContent = String(profile.taskCount);
    profileDialog.showModal();

    const card = document.getElementById(`profile-card-${profile.id}`);
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (card) {
      card.classList.add("is-highlighted");
      window.setTimeout(() => card.classList.remove("is-highlighted"), 1800);
    }
  }

  function renderProfiles() {
    profilesContainer.replaceChildren();
    profiles.forEach((profile) => {
      const card = document.createElement("article");
      card.className = `profile-card${profile.id === currentProfileId ? " is-current-profile" : ""}`;
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
      birthday.textContent = `誕生日：${dateLabel(profile.birthday)}`;
      card.appendChild(birthday);

      const role = document.createElement("p");
      role.className = "profile-role";
      role.textContent = profile.role;
      card.appendChild(role);

      const taskCount = document.createElement("p");
      taskCount.className = "profile-task-count";
      taskCount.append("現在の課題数：");
      const count = document.createElement("strong");
      count.textContent = String(profile.taskCount);
      taskCount.appendChild(count);
      taskCount.append(" 件");
      card.appendChild(taskCount);

      const actions = document.createElement("div");
      actions.className = "profile-actions";
      const detailsButton = document.createElement("button");
      detailsButton.type = "button";
      detailsButton.dataset.profileDetail = profile.id;
      detailsButton.textContent = "プロフィールを見る";
      actions.appendChild(detailsButton);
      const loginButton = document.createElement("button");
      loginButton.type = "button";
      loginButton.dataset.demoPersona = profile.id;
      loginButton.disabled = profile.id === currentProfileId;
      loginButton.textContent = profile.id === currentProfileId
        ? "ログイン中"
        : `${profile.name}としてログイン`;
      actions.appendChild(loginButton);
      card.appendChild(actions);
      profilesContainer.appendChild(card);
    });

    document.querySelectorAll(".map-person").forEach((button) => {
      const profile = profiles.find((item) => item.id === button.dataset.profileId);
      button.disabled = !profile;
      if (!profile) return;
      button.setAttribute("aria-label", `${profile.name}のプロフィールを表示`);
      const name = button.querySelector(".map-name");
      if (name) name.textContent = profile.name;
      const avatar = button.querySelector(".person-avatar");
      if (avatar) avatar.textContent = profile.name.slice(0, 1);
    });
  }

  async function loadProfiles() {
    const token = sessionStorage.getItem(tokenKey);
    if (!token) {
      window.location.replace("index.html");
      return;
    }

    const response = await fetch(`${baseUrl}/api/demo/me`, {
      credentials: "include",
      cache: "no-store",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) {
      sessionStorage.removeItem(tokenKey);
      window.location.replace("index.html");
      return;
    }
    if (!response.ok) throw new Error("デモプロフィールを取得できませんでした。");

    const data = await response.json();
    if (!data.user || !Array.isArray(data.profiles)) {
      throw new Error("デモプロフィールの形式が正しくありません。");
    }

    currentProfileId = data.profiles.find((profile) => profile.email === data.user.email)?.id || "";
    if (!currentProfileId) throw new Error("ログイン中のプロフィールを確認できませんでした。");
    profiles = data.profiles;
    userName.textContent = `${data.user.name}（デモ）`;
    renderProfiles();
  }

  async function switchProfile(profileId, button) {
    button.disabled = true;
    status.textContent = "プロフィールを切り替えています...";
    try {
      const response = await fetch(`${baseUrl}/api/demo/sessions`, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: profileId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "プロフィールを切り替えられませんでした。");
      if (typeof data.sessionToken !== "string" || !data.sessionToken) {
        throw new Error("デモセッションを開始できませんでした。");
      }

      sessionStorage.setItem(tokenKey, data.sessionToken);
      localStorage.removeItem("selectedGroupId");
      localStorage.removeItem("selectedGroupName");
      window.DemoMode?.prepareNavigation({ resetState: true });
      window.location.replace("calendar.html?demo=1");
    } catch (error) {
      console.error("デモプロフィールの切り替えに失敗しました:", error);
      status.textContent = error instanceof Error ? error.message : "プロフィールを切り替えられませんでした。";
      button.disabled = false;
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const loginButton = target.closest("[data-demo-persona]");
    if (loginButton instanceof HTMLButtonElement) {
      void switchProfile(loginButton.dataset.demoPersona || "", loginButton);
      return;
    }
    const detailButton = target.closest("[data-profile-detail], .map-person");
    if (detailButton instanceof HTMLButtonElement) {
      const profileId = detailButton.dataset.profileDetail || detailButton.dataset.profileId;
      if (profileId) showProfile(profileId);
    }
  });

  document.getElementById("profileDialogClose").addEventListener("click", () => profileDialog.close());
  profileDialog.addEventListener("click", (event) => {
    if (event.target === profileDialog) profileDialog.close();
  });

  loadProfiles().catch((error) => {
    console.error("デモプロフィールの初期化に失敗しました:", error);
    userName.textContent = "デモ情報を読み込めません";
    status.textContent = error instanceof Error ? error.message : "デモを読み込めませんでした。";
  });
})();
