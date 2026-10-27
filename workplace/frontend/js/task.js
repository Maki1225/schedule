// 課題一覧の取得と表示
async function loadTasks() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/events`, {
      method: 'GET',
      credentials: 'include',
    });

    if (res.status === 401) {
      window.location.href = 'login.html';
      return;
    }

    if (!res.ok) return;

    const tasks = await res.json();
    renderTaskList(tasks);
  } catch (err) {
    console.error('タスク取得エラー:', err);
  }
}

// 課題カードの安全な描写 (XSS対策)
function renderTaskList(tasks) {
  // HTML側の id="taskList" に合わせる
  const container = document.getElementById('taskList');
  if (!container) return;

  container.innerHTML = '';

  if (tasks.length === 0) {
    container.innerHTML = '<p>課題はありません。</p>';
    return;
  }

  tasks.forEach((task) => {
    const card = document.createElement('div');
    card.className = 'task-card';

    const titleEl = document.createElement('h3');
    titleEl.textContent = task.title;

    const deadlineEl = document.createElement('p');
    const deadlineText = task.end_time ? new Date(task.end_time).toLocaleDateString('ja-JP') : '未設定';
    deadlineEl.textContent = `📅 期限: ${deadlineText}`;

    card.appendChild(titleEl);
    card.appendChild(deadlineEl);
    container.appendChild(card);
  });
}

// 課題の追加
async function addTask(title, deadline, description) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: title,
        description: description || '課題',
        start_time: new Date().toISOString(),
        end_time: deadline ? new Date(deadline).toISOString() : new Date().toISOString(),
      }),
    });

    if (res.ok) {
      await loadTasks();
      if (typeof updateDashboard === 'function') updateDashboard();
      if (typeof updateCalendar === 'function') updateCalendar();
    } else {
      alert('課題の追加に失敗しました');
    }
  } catch (err) {
    console.error('通信エラー:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const addTaskButton = document.getElementById('addTaskButton');
  const taskModal = document.getElementById('taskModal');
  const closeModal = document.getElementById('closeModal');
  const saveTaskButton = document.getElementById('saveTask');

  // 初期表示でタスク一覧を取得
  loadTasks();

  // 1. 「＋ 課題追加」ボタンでモーダルを開く
  if (addTaskButton && taskModal) {
    addTaskButton.addEventListener('click', () => {
      taskModal.classList.add('active');
      taskModal.style.display = 'block';
    });
  }

  // 2. モーダルの「×」ボタンで閉じる
  if (closeModal && taskModal) {
    closeModal.addEventListener('click', () => {
      taskModal.classList.remove('active');
      taskModal.style.display = 'none';
    });
  }

  // 3. 「保存」ボタンをクリックしたときの処理
  if (saveTaskButton) {
    saveTaskButton.addEventListener('click', async () => {
      const title = document.getElementById('taskTitle')?.value;
      const deadline = document.getElementById('deadline')?.value;
      const priority = document.getElementById('priority')?.value;

      if (!title || !deadline) {
        alert('課題名と提出期限を入力してください');
        return;
      }

      await addTask(title, deadline, `優先度:${priority}`);

      // フォームのクリア & モーダルを閉じる
      document.getElementById('taskTitle').value = '';
      document.getElementById('deadline').value = '';
      if (taskModal) {
        taskModal.classList.remove('active');
        taskModal.style.display = 'none';
      }
    });
  }
});