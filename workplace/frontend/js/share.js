
const API_BASE_URL = window.API_BASE_URL;

document.addEventListener('DOMContentLoaded', () => {
  const groupNameInput = document.getElementById('groupName');
  const nicknameInput = document.getElementById('nickname');
  const inviteCodeInput = document.getElementById('inviteCode');
  const createButton = document.getElementById('createGroupButton');
  const joinButton = document.getElementById('joinGroupButton');
  const shareMessage = document.getElementById('shareMessage');
  const groupInfo = document.getElementById('groupInfo');

  document.getElementById('shareMenuButton')?.addEventListener('click', () => {
    document.querySelectorAll('.view-section').forEach((view) => {
      view.style.display = 'none';
    });

    const shareView = document.getElementById('shareView');
    if (shareView) shareView.style.display = 'block';

    loadGroups();
    const menuPanel = document.getElementById('menuPanel');
    if (menuPanel) {
      menuPanel.classList.remove('active');
    }
  });

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('ログインの有効期限が切れています。再ログインしてください。');
      }

      throw new Error(data.error || data.message || '通信に失敗しました。');
    }

    return data;
  }

  async function loadGroups() {
    try {
      const data = await apiRequest('/api/groups');
      const groups = data.groups || [];

      if (!groupInfo) return;

      const list = document.createElement('div');
      list.id = 'groupList';

      const heading = document.createElement('h3');
      heading.textContent = '参加中のグループ';
      list.appendChild(heading);

      if (groups.length === 0) {
        const message = document.createElement('p');
        message.textContent = '参加中のグループはありません。';
        list.appendChild(message);
      }

      groups.forEach((group) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = group.name;

        button.addEventListener('click', () => {
          showGroup(group);

          if (shareMessage) {
            shareMessage.textContent = `${group.name} を選択しました。`;
          }
        });

        list.appendChild(button);
      });

      const oldList = groupInfo.querySelector('#groupList');
      if (oldList) oldList.remove();

      groupInfo.prepend(list);
    } catch (error) {
      console.error('グループ一覧の取得エラー:', error);
      if (shareMessage) shareMessage.textContent = error.message;
    }
  }

  function refreshGroupData() {
    if (typeof window.loadTasks === 'function') window.loadTasks();
    if (typeof window.updateCalendar === 'function') window.updateCalendar();
    if (typeof window.updateDashboard === 'function') window.updateDashboard();
  }

  function showGroup(group, nickname = '') {
    if (!group || group.id == null) {
      throw new Error('グループ情報を取得できませんでした。');
    }

    const name = group.name || 'グループ';
    const code = group.invite_code || group.inviteCode || '';

    localStorage.setItem('selectedGroupId', String(group.id));
    localStorage.setItem('selectedGroupName', name);

    if (groupInfo) {
      groupInfo.querySelectorAll(':scope > :not(#groupList)').forEach(el => el.remove());

      const title = document.createElement('h3');
      title.textContent = name;
      groupInfo.appendChild(title);

      if (nickname) {
        const nicknameText = document.createElement('p');
        nicknameText.textContent = `ニックネーム：${nickname}`;
        groupInfo.appendChild(nicknameText);
      }

      const codeText = document.createElement('p');
      codeText.textContent = `招待コード：${code || '取得できませんでした'}`;
      groupInfo.appendChild(codeText);

      if (code) {
        const copyButton = document.createElement('button');
        copyButton.type = 'button';
        copyButton.textContent = '招待コードをコピー';

        copyButton.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(code);
            if (shareMessage) shareMessage.textContent = '招待コードをコピーしました。';
          } catch {
            if (shareMessage) {
              shareMessage.textContent = `招待コード：${code}（手動でコピーしてください）`;
            }
          }
        });

        groupInfo.appendChild(copyButton);
      }
    }

    refreshGroupData();
  }

  createButton?.addEventListener('click', async () => {
    const name = groupNameInput?.value.trim();

    if (!name) {
      if (shareMessage) shareMessage.textContent = 'グループ名を入力してください。';
      return;
    }

    createButton.disabled = true;

    try {
      const data = await apiRequest('/api/groups', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });

      showGroup(data.group);

      if (shareMessage) shareMessage.textContent = 'グループを作成しました！';

      await loadGroups();
    } catch (error) {
      if (shareMessage) shareMessage.textContent = error.message;
    } finally {
      createButton.disabled = false;
    }
  });

  joinButton?.addEventListener('click', async () => {
    const inviteCode = inviteCodeInput?.value.trim();
    const nickname = nicknameInput?.value.trim();

    if (!nickname) {
      if (shareMessage) shareMessage.textContent = 'ニックネームを入力してください。';
      return;
    }

    if (!inviteCode) {
      if (shareMessage) shareMessage.textContent = '招待コードを入力してください。';
      return;
    }

    joinButton.disabled = true;

    try {
      const data = await apiRequest('/api/groups/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      });

      showGroup(data.group, nickname);

      if (shareMessage) {
        shareMessage.textContent = data.message || 'グループに参加しました！';
      }

      await loadGroups();
    } catch (error) {
      if (shareMessage) shareMessage.textContent = error.message;
    } finally {
      joinButton.disabled = false;
    }
  });
});
