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

  function renderAvatar(avatar, profileId) {
    avatar.className = `person-avatar ${profileStyles[profileId] || "avatar-violet"}`;
    avatar.replaceChildren();
    const pixels = document.createElement("span");
    pixels.className = "avatar-pixels";
    pixels.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 4; index += 1) {
      const square = document.createElement("span");
      square.className = "avatar-square";
      pixels.appendChild(square);
    }
    avatar.appendChild(pixels);
  }

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

  function drawRelationLines() {
    const map = document.querySelector(".relation-map");
    const svg = map?.querySelector(".relation-lines");
    const currentPerson = map?.querySelector(".map-person.is-current-profile");
    if (!map || !svg || !currentPerson) return;

    const svgBounds = svg.getBoundingClientRect();
    if (!svgBounds.width || !svgBounds.height) return;
    svg.setAttribute("viewBox", `0 0 ${svgBounds.width} ${svgBounds.height}`);
    svg.replaceChildren();

    const box = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left - svgBounds.left,
        top: rect.top - svgBounds.top,
        width: rect.width,
        height: rect.height,
      };
    };
    const edgePoint = (source, target) => {
      const center = {
        x: source.left + source.width / 2,
        y: source.top + source.height / 2,
      };
      const targetCenter = {
        x: target.left + target.width / 2,
        y: target.top + target.height / 2,
      };
      const delta = {
        x: targetCenter.x - center.x,
        y: targetCenter.y - center.y,
      };
      const scale = Math.min(
        (source.width / 2) / Math.abs(delta.x || Number.EPSILON),
        (source.height / 2) / Math.abs(delta.y || Number.EPSILON)
      );
      const length = Math.hypot(delta.x, delta.y) || 1;
      return {
        x: center.x + delta.x * scale + (delta.x / length) * 1.5,
        y: center.y + delta.y * scale + (delta.y / length) * 1.5,
      };
    };
    const addLine = (from, to, className, label, labelOffset = 12, labelPosition = 0.5) => {
      const fromBox = box(from);
      const toBox = box(to);
      const start = edgePoint(fromBox, toBox);
      const end = edgePoint(toBox, fromBox);
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(start.x));
      line.setAttribute("y1", String(start.y));
      line.setAttribute("x2", String(end.x));
      line.setAttribute("y2", String(end.y));
      line.setAttribute("class", className);
      svg.appendChild(line);

      const direction = { x: end.x - start.x, y: end.y - start.y };
      const length = Math.hypot(direction.x, direction.y) || 1;
      const midpoint = {
        x: start.x + direction.x * labelPosition - (direction.y / length) * labelOffset,
        y: start.y + direction.y * labelPosition + (direction.x / length) * labelOffset,
      };
      const labelWidth = Math.max(28, label.length * 7 + 8);
      const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      labelGroup.setAttribute("class", "relation-label");
      labelGroup.setAttribute("aria-hidden", "true");
      const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      background.setAttribute("x", String(midpoint.x - labelWidth / 2));
      background.setAttribute("y", String(midpoint.y - 10));
      background.setAttribute("width", String(labelWidth));
      background.setAttribute("height", "20");
      background.setAttribute("rx", "10");
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(midpoint.x));
      text.setAttribute("y", String(midpoint.y));
      text.textContent = label;
      labelGroup.append(background, text);
      svg.appendChild(labelGroup);
    };

    map.querySelectorAll(".map-person:not(.is-current-profile)").forEach((person) => {
      addLine(currentPerson, person, "relation-current", "同級生", 0);
    });
    map.querySelectorAll(".map-group").forEach((group) => {
      const label = group.classList.contains("map-group-lab")
        ? "実験班に所属"
        : "グループワークで協力";
      addLine(currentPerson, group, "relation-group-link", label, 0, 0.9);
    });
  }

  function showProfile(profileId) {
    const profile = profiles.find((item) => item.id === profileId);
    if (!profile) return;

    const avatar = document.getElementById("profileDialogAvatar");
    renderAvatar(avatar, profile.id);
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
      renderAvatar(avatar, profile.id);
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
      taskCount.append("登録課題数：");
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

    const mapPositions = [
      "upper-left",
      "upper-right",
      "lower-left",
      "lower-right",
    ];
    let positionIndex = 0;
    document.querySelectorAll(".map-person").forEach((button) => {
      const profile = profiles.find((item) => item.id === button.dataset.profileId);
      button.disabled = !profile;
      if (!profile) return;
      const isCurrentProfile = profile.id === currentProfileId;
      button.classList.toggle("is-current-profile", isCurrentProfile);
      const position = isCurrentProfile
        ? "center"
        : mapPositions[positionIndex++];
      button.dataset.mapPosition = position;
      button.setAttribute("aria-label", `${profile.name}のプロフィールを表示`);
      const name = button.querySelector(".map-name");
      if (name) name.textContent = profile.name;
      const avatar = button.querySelector(".person-avatar");
      if (avatar) renderAvatar(avatar, profile.id);
      const birthday = button.querySelector(".map-birthday");
      if (birthday) birthday.textContent = dateLabel(profile.birthday);
      const role = button.querySelector(".map-role");
      if (role) role.textContent = profile.role;
      const taskCount = button.querySelector(".map-task-count");
      if (taskCount) taskCount.textContent = `登録課題：${profile.taskCount}件`;
    });
    const relationshipDescription = document.querySelector("#relationshipTitle + p");
    const currentProfile = profiles.find((profile) => profile.id === currentProfileId);
    if (relationshipDescription && currentProfile) {
      relationshipDescription.textContent = `${currentProfile.name}を中心に、クラスのつながりを表示しています。`;
    }
    requestAnimationFrame(() => requestAnimationFrame(drawRelationLines));
    document.fonts?.ready.then(drawRelationLines);
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
  window.addEventListener("resize", drawRelationLines);
  const relationMap = document.querySelector(".relation-map");
  if (relationMap && "ResizeObserver" in window) {
    const relationObserver = new ResizeObserver(drawRelationLines);
    relationObserver.observe(relationMap);
    relationMap.querySelectorAll(".map-person, .map-group").forEach((element) => {
      relationObserver.observe(element);
    });
  }

  loadProfiles().catch((error) => {
    console.error("デモプロフィールの初期化に失敗しました:", error);
    userName.textContent = "デモ情報を読み込めません";
    status.textContent = error instanceof Error ? error.message : "デモを読み込めませんでした。";
  });
})();
