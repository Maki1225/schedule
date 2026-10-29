window.API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://schedule-backend-navy.vercel.app';

// window.API_BASE_URL でも単体の API_BASE_URL でアクセスできるように定義
const API_BASE_URL = window.API_BASE_URL;

// ログイン状態のチェック（ユーザー情報を返す）
async function checkAuth(baseUrl = window.API_BASE_URL) {
  try {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (res.status === 401) {
      // 未ログイン状態（正常なレスポンスとして扱う）
      return null;
    }

    if (res.ok) {
      const data = await res.json();
      return data.user;
    }
    return null;
  } catch (err) {
    console.error('認証チェック失敗:', err);
    return null;
  }
}

// メイン画面（index.html等）用：未ログインなら login.html へ飛ばす
async function requireAuth(baseUrl = window.API_BASE_URL) {
  const user = await checkAuth(baseUrl);
  if (!user) {
    if (!window.location.pathname.endsWith('login.html')) {
      window.location.href = 'login.html';
    }
    return null;
  }
  return user;
}

// ログイン画面（login.html）用：ログイン済みなら index.html へ飛ばす
async function redirectIfAuthenticated(baseUrl = window.API_BASE_URL) {
  const user = await checkAuth(baseUrl);
  if (user) {
    window.location.href = 'index.html';
  }
}