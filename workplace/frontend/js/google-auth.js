
const AUTH_API = "/api/auth";

// すでにログイン済みならカレンダーへ移動
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const res = await fetch(`${AUTH_API}/me`, {
            method: "GET",
            credentials: "include"
        });

        if (res.ok) {
            window.location.replace("calendar.html");
        }

    } catch (err) {
        // 未ログインや通信エラーの場合はログイン画面を表示
        console.log("ログイン状態を確認できませんでした");
    }
});

// Googleログイン成功時のコールバック
async function handleCredentialResponse(response) {
    const errorElement =
        document.getElementById("login-error");

    if (errorElement) {
        errorElement.textContent = "";
    }

    try {
        const res = await fetch(`${AUTH_API}/google`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                credential: response.credential
            })
        });

        const data = await res.json();

        if (res.ok) {
            window.location.replace("calendar.html");
        } else {
            const message =
                data.error || "ログインに失敗しました";

            if (errorElement) {
                errorElement.textContent = message;
            } else {
                alert(message);
            }
        }

    } catch (err) {
        console.error("Googleログインエラー:", err);

        if (errorElement) {
            errorElement.textContent =
                "サーバーとの通信に失敗しました";
        } else {
            alert("サーバーとの通信に失敗しました");
        }
    }
}
