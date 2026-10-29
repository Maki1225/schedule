
// =======================================
// profile.js
// プロフィール表示・編集
// =======================================

document.addEventListener("DOMContentLoaded", async () => {

    const userPicture =
        document.getElementById("userPicture");

    const userName =
        document.getElementById("userName");

    const userEmail =
        document.getElementById("userEmail");

    const profileForm =
        document.getElementById("profileForm");

    const saveButton =
        document.getElementById("saveProfile");

    const message =
        document.getElementById("profileMessage");


    // =========================
    // メッセージ表示
    // =========================

    function showMessage(text, isError = false) {

        message.textContent = text;

        message.style.color =
            isError ? "#d32f2f" : "#2e7d32";

    }


    // =========================
    // プロフィール画像表示
    // =========================

    function setProfilePicture(picture) {

        // 画像URLがない場合の代替画像
        const fallback =
            "data:image/svg+xml," +
            encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg"
                     width="110" height="110"
                     viewBox="0 0 110 110">
                    <circle cx="55" cy="55" r="55"
                            fill="#eeedff"/>
                    <circle cx="55" cy="42" r="19"
                            fill="#6C63FF"/>
                    <ellipse cx="55" cy="91"
                             rx="34" ry="27"
                             fill="#6C63FF"/>
                </svg>
            `);

        userPicture.onerror = () => {
            userPicture.onerror = null;
            userPicture.src = fallback;
        };

        // HTTPS画像URLのみ許可
        if (picture) {
            try {
                const url = new URL(picture);

                if (url.protocol === "https:") {
                    userPicture.src = url.href;
                    return;
                }
            } catch (error) {
                console.warn("画像URLが不正です");
            }
        }

        userPicture.src = fallback;
    }


    // =========================
    // ログイン状態の確認
    // =========================

    const user = await requireAuth();

    if (!user) {
        return;
    }


    // =========================
    // プロフィール取得
    // =========================

    async function loadProfile() {

        try {

            const res = await fetch("/api/users/me", {
                method: "GET",
                credentials: "include"
            });

            if (res.status === 401) {
                window.location.replace("login.html");
                return;
            }

            if (!res.ok) {
                throw new Error("プロフィール取得失敗");
            }

            const data = await res.json();

            const profile = data.user;

            userName.value = profile.name || "";

            userEmail.value = profile.email || "";

            setProfilePicture(profile.userPicture);

        } catch (error) {

            console.error(error);

            showMessage(
                "プロフィール情報を取得できませんでした。",
                true
            );

        }

    }


    await loadProfile();


    // =========================
    // プロフィール更新
    // =========================

    profileForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        const name = userName.value.trim();

        if (!name) {
            showMessage("名前を入力してください。", true);
            return;
        }

        saveButton.disabled = true;

        showMessage("保存しています...");

        try {

            const res = await fetch("/api/users/me", {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json"
                },

                credentials: "include",

                body: JSON.stringify({
                    name: name
                })
            });

            if (res.status === 401) {
                window.location.replace("login.html");
                return;
            }

            if (!res.ok) {
                throw new Error("プロフィール更新失敗");
            }

            const data = await res.json();

            userName.value = data.user.name;

            showMessage("プロフィールを保存しました。");

        } catch (error) {

            console.error(error);

            showMessage(
                "プロフィールの保存に失敗しました。",
                true
            );

        } finally {

            saveButton.disabled = false;

        }

    });

});
