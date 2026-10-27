// 予定の追加処理
async function addSchedule(title, date, startTime, endTime, memo) {
  try {
    // タイムゾーン（+09:00）を考慮したISO文字列を作成
    // 例: "2026-10-01T10:00:00+09:00"
    const startIso = `${date}T${startTime}:00+09:00`;
    const endIso = `${date}T${endTime}:00+09:00`;

    const res = await fetch(`${API_BASE_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        title: title,
        description: memo || '予定',
        start_time: new Date(startIso).toISOString(), // または startIso そのまま
        end_time: new Date(endIso).toISOString(),
      }),
    });

    if (res.ok) {
      if (typeof updateDashboard === 'function') updateDashboard();
      if (typeof updateCalendar === 'function') updateCalendar();
      return true; // 成功を呼び出し元に伝える
    } else {
      const errorData = await res.json().catch(() => ({}));
      alert(errorData.message || '予定の追加に失敗しました');
      return false; // 失敗を伝える
    }
  } catch (err) {
    console.error('予定追加エラー:', err);
    alert('通信エラーが発生しました');
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const addScheduleButton = document.getElementById('addScheduleButton');
  const scheduleModal = document.getElementById('scheduleModal');
  const closeScheduleModal = document.getElementById('closeScheduleModal');
  const saveScheduleButton = document.getElementById('saveSchedule');

  // フォームのリセット関数
  const resetScheduleForm = () => {
    document.getElementById('scheduleTitle').value = '';
    document.getElementById('scheduleDate').value = '';
    document.getElementById('scheduleStartTime').value = '';
    document.getElementById('scheduleEndTime').value = '';
    const memoEl = document.getElementById('scheduleMemo');
    if (memoEl) memoEl.value = '';
  };

  // 1. 「＋ 予定追加」ボタンでモーダルを開く
  if (addScheduleButton && scheduleModal) {
    addScheduleButton.addEventListener('click', () => {
      scheduleModal.classList.add('active');
      scheduleModal.style.display = 'block';
    });
  }

  // 2. 「×」ボタンで閉じる
  if (closeScheduleModal && scheduleModal) {
    closeScheduleModal.addEventListener('click', () => {
      scheduleModal.classList.remove('active');
      scheduleModal.style.display = 'none';
      resetScheduleForm();
    });
  }

  // 3. 「保存」ボタンの処理
  if (saveScheduleButton) {
    saveScheduleButton.addEventListener('click', async () => {
      const title = document.getElementById('scheduleTitle')?.value.trim();
      const date = document.getElementById('scheduleDate')?.value;
      const startTime = document.getElementById('scheduleStartTime')?.value;
      const endTime = document.getElementById('scheduleEndTime')?.value;
      const memo = document.getElementById('scheduleMemo')?.value;

      if (!title || !date || !startTime || !endTime) {
        alert('予定名、日付、時間をすべて入力してください');
        return;
      }

      // 開始時刻より終了時刻が前になっていないかチェック
      if (`${date}T${startTime}` >= `${date}T${endTime}`) {
        alert('終了時刻は開始時刻より後に設定してください');
        return;
      }

      // 追加APIを実行し、成功した場合のみフォームを閉じる
      const success = await addSchedule(title, date, startTime, endTime, memo);

      if (success) {
        resetScheduleForm();
        if (scheduleModal) {
          scheduleModal.classList.remove('active');
          scheduleModal.style.display = 'none';
        }
      }
    });
  }
});