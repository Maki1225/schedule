(() => {
  // =========================
  // 基本設定
  // =========================

  const baseUrl =
    window.API_BASE_URL ||
    "https://schedule-backend-navy.vercel.app";

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

  // =========================
  // アバター表示
  // =========================

  function renderAvatar(avatar, profileId) {
    if (!avatar) return;

    avatar.className =
      `person-avatar ${profileStyles[profileId] || "avatar-violet"}`;

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

  // =========================
  // 誕生日表示
  // =========================

  function dateLabel(dateValue) {
    const date = new Date(`${dateValue}T00:00:00+09:00`);

    if (Number.isNaN(date.getTime())) {
      return "誕生日不明";
    }

    return new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  // =========================
  // 相関図の線を描画
  // =========================

  function drawRelationLines() {
    const groups = document.querySelectorAll(".relation-group");

    groups.forEach((group) => {
      const svg = group.querySelector(".relation-lines");

      if (!svg) return;

      // 前回描画した線を削除
      svg.replaceChildren();

      const svgBounds = svg.getBoundingClientRect();

      if (!svgBounds.width || !svgBounds.height) {
        return;
      }

      // SVGの座標範囲を設定
      svg.setAttribute(
        "viewBox",
        `0 0 ${svgBounds.width} ${svgBounds.height}`
      );

      svg.setAttribute("preserveAspectRatio", "none");

      // 現在の人物カード
      const currentPerson = group.querySelector(
        ".map-person.is-current-profile"
      );

      if (!currentPerson) return;

      // 同じグループ内の他の人物カード
      const otherPeople = group.querySelectorAll(
        ".map-person:not(.is-current-profile)"
      );

      // =========================
      // 人物カードの座標を取得
      // =========================

      function getPersonBox(person) {
        const rect = person.getBoundingClientRect();

        return {
          x: rect.left - svgBounds.left,
          y: rect.top - svgBounds.top,
          width: rect.width,
          height: rect.height,
        };
      }

      // =========================
      // 人物カードの外周座標
      // =========================

      function getEdgePoint(source, target) {
        const centerX = source.x + source.width / 2;
        const centerY = source.y + source.height / 2;

        const targetX = target.x + target.width / 2;
        const targetY = target.y + target.height / 2;

        const dx = targetX - centerX;
        const dy = targetY - centerY;

        const halfWidth = source.width / 2;
        const halfHeight = source.height / 2;

        const scaleX =
          Math.abs(dx) > 0
            ? halfWidth / Math.abs(dx)
            : Infinity;

        const scaleY =
          Math.abs(dy) > 0
            ? halfHeight / Math.abs(dy)
            : Infinity;

        const scale = Math.min(scaleX, scaleY);

        return {
          x: centerX + dx * scale,
          y: centerY + dy * scale,
        };
      }

      // =========================
      // 線を1本描画
      // =========================

      function addLine(personA, personB) {
        const boxA = getPersonBox(personA);
        const boxB = getPersonBox(personB);

        const start = getEdgePoint(boxA, boxB);
        const end = getEdgePoint(boxB, boxA);

        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        );

        line.setAttribute("x1", String(start.x));
        line.setAttribute("y1", String(start.y));
        line.setAttribute("x2", String(end.x));
        line.setAttribute("y2", String(end.y));

        line.setAttribute("class", "relation-current");

        svg.appendChild(line);
      }

      // =========================
      // 人物同士を接続
      // =========================

      otherPeople.forEach((person) => {
        addLine(currentPerson, person);
      });
    });
  }

  // =========================
  // プロフィール詳細表示
  // =========================

  function showProfile(profileId) {
    const profile = profiles.find(
      (item) => item.id === profileId
    );

    if (!profile) return;

    const avatar = document.getElementById(
      "profileDialogAvatar"
    );

    renderAvatar(avatar, profile.id);

    document.getElementById(
      "profileDialogName"
    ).textContent = profile.name;

    document.getElementById(
      "profileDialogBirthday"
    ).textContent = `誕生日：${dateLabel(profile.birthday)}`;

    document.getElementById(
      "profileDialogRole"
    ).textContent = profile.role;

    document.getElementById(
      "profileDialogTaskCount"
    ).textContent = String(profile.taskCount);

    profileDialog.showModal();

    const card = document.getElementById(
      `profile-card-${profile.id}`
    );

    card?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    if (card) {
      card.classList.add("is-highlighted");

      window.setTimeout(() => {
        card.classList.remove("is-highlighted");
      }, 1800);
    }
  }

  // =========================
  // プロフィール一覧と相関図
  // =========================

  function renderProfiles() {
    profilesContainer.replaceChildren();

    // =========================
    // メンバーカードを作成
    // =========================

    profiles.forEach((profile) => {
      const card = document.createElement("article");

      card.className =
        `profile-card${
          profile.id === currentProfileId
            ? " is-current-profile"
            : ""
        }`;

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
      birthday.textContent =
        `誕生日：${dateLabel(profile.birthday)}`;

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
      loginButton.disabled =
        profile.id === currentProfileId;

      loginButton.textContent =
        profile.id === currentProfileId
          ? "ログイン中"
          : `${profile.name}としてログイン`;

      actions.appendChild(loginButton);
      card.appendChild(actions);

      profilesContainer.appendChild(card);
    });

    // =========================
    // 相関図の人物カードを更新
    // =========================

    document.querySelectorAll(".map-person").forEach((button) => {
      const profile = profiles.find(
        (item) => item.id === button.dataset.profileId
      );

      button.disabled = !profile;

      if (!profile) return;

      const isCurrentProfile =
        profile.id === currentProfileId;

      button.classList.toggle(
        "is-current-profile",
        isCurrentProfile
      );

      button.setAttribute(
        "aria-label",
        `${profile.name}のプロフィールを表示`
      );

      const name = button.querySelector(".map-name");

      if (name) {
        name.textContent = profile.name;
      }

      const avatar = button.querySelector(".person-avatar");

      if (avatar) {
        renderAvatar(avatar, profile.id);
      }

      const birthday = button.querySelector(".map-birthday");

      if (birthday) {
        birthday.textContent = dateLabel(profile.birthday);
      }

      const role = button.querySelector(".map-role");

      if (role) {
        role.textContent = profile.role;
      }

      const taskCount = button.querySelector(".map-task-count");

      if (taskCount) {
        taskCount.textContent =
          `登録課題：${profile.taskCount}件`;
      }
    });

    // =========================
    // 説明文を更新
    // =========================

    const relationshipDescription =
      document.querySelector("#relationshipTitle + p");

    const currentProfile = profiles.find(
      (profile) => profile.id === currentProfileId
    );

    if (relationshipDescription && currentProfile) {
      relationshipDescription.textContent =
        `${currentProfile.name}を中心に、クラスのつながりを表示しています。`;
    }

    // =========================
    // 相関図の線を描画
    // =========================

    requestAnimationFrame(() => {
      requestAnimationFrame(drawRelationLines);
    });

    if (document.fonts?.ready) {
      document.fonts.ready.then(drawRelationLines);
    }
  }

  // =========================
  // プロフィール取得
  // =========================

  async function loadProfiles() {
    const token = sessionStorage.getItem(tokenKey);

    if (!token) {
      window.location.replace("index.html");
      return;
    }

    const response = await fetch(
      `${baseUrl}/api/demo/me`,
      {
        credentials: "include",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401) {
      sessionStorage.removeItem(tokenKey);
      window.location.replace("index.html");
      return;
    }

    if (!response.ok) {
      throw new Error(
        "デモプロフィールを取得できませんでした。"
      );
    }

    const data = await response.json();

    if (!data.user || !Array.isArray(data.profiles)) {
      throw new Error(
        "デモプロフィールの形式が正しくありません。"
      );
    }

    currentProfileId =
      data.profiles.find(
        (profile) => profile.email === data.user.email
      )?.id || "";

    if (!currentProfileId) {
      throw new Error(
        "ログイン中のプロフィールを確認できませんでした。"
      );
    }

    profiles = data.profiles;

    userName.textContent =
      `${data.user.name}（デモ）`;

    renderProfiles();
  }

  // =========================
  // デモプロフィール切り替え
  // =========================

  async function switchProfile(profileId, button) {
    button.disabled = true;

    status.textContent =
      "プロフィールを切り替えています...";

    try {
      const response = await fetch(
        `${baseUrl}/api/demo/sessions`,
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personaId: profileId,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
          "プロフィールを切り替えられませんでした。"
        );
      }

      if (
        typeof data.sessionToken !== "string" ||
        !data.sessionToken
      ) {
        throw new Error(
          "デモセッションを開始できませんでした。"
        );
      }

      sessionStorage.setItem(
        tokenKey,
        data.sessionToken
      );

      localStorage.removeItem("selectedGroupId");
      localStorage.removeItem("selectedGroupName");

      window.DemoMode?.prepareNavigation({
        resetState: true,
      });

      window.location.replace("calendar.html?demo=1");

    } catch (error) {
      console.error(
        "デモプロフィールの切り替えに失敗しました:",
        error
      );

      status.textContent =
        error instanceof Error
          ? error.message
          : "プロフィールを切り替えられませんでした。";

      button.disabled = false;
    }
  }

  // =========================
  // ボタン操作
  // =========================

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) return;

    // デモログイン切り替え
    const loginButton = target.closest(
      "[data-demo-persona]"
    );

    if (loginButton instanceof HTMLButtonElement) {
      void switchProfile(
        loginButton.dataset.demoPersona || "",
        loginButton
      );

      return;
    }

    // プロフィール詳細表示
    const detailButton = target.closest(
      "[data-profile-detail], .map-person"
    );

    if (detailButton instanceof HTMLButtonElement) {
      const profileId =
        detailButton.dataset.profileDetail ||
        detailButton.dataset.profileId;

      if (profileId) {
        showProfile(profileId);
      }
    }
  });

  // =========================
  // ダイアログ操作
  // =========================

  document
    .getElementById("profileDialogClose")
    .addEventListener("click", () => {
      profileDialog.close();
    });

  profileDialog.addEventListener("click", (event) => {
    if (event.target === profileDialog) {
      profileDialog.close();
    }
  });

  // =========================
  // 画面サイズ変更時の再描画
  // =========================

  window.addEventListener("resize", () => {
    requestAnimationFrame(drawRelationLines);
  });

  const relationMap = document.querySelector(".relation-map");

  if (relationMap && "ResizeObserver" in window) {
    const relationObserver = new ResizeObserver(() => {
      requestAnimationFrame(drawRelationLines);
    });

    relationObserver.observe(relationMap);

    relationMap
      .querySelectorAll(".relation-group, .map-person")
      .forEach((element) => {
        relationObserver.observe(element);
      });
  }

  // =========================
  // 初期化
  // =========================

  loadProfiles().catch((error) => {
    console.error(
      "デモプロフィールの初期化に失敗しました:",
      error
    );

    userName.textContent =
      "デモ情報を読み込めません";

    status.textContent =
      error instanceof Error
        ? error.message
        : "デモを読み込めませんでした。";
  });

})();