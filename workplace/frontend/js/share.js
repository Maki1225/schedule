import { auth, db, loginPromise } from "./firebase.js";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// 画面の要素を取得
const groupNameInput = document.getElementById("groupName");
const nicknameInput = document.getElementById("nickname");
const inviteCodeInput = document.getElementById("inviteCode");

const createGroupButton = document.getElementById("createGroupButton");
const joinGroupButton = document.getElementById("joinGroupButton");

const shareMessage = document.getElementById("shareMessage");
const groupInfo = document.getElementById("groupInfo");
// メニューからグループ共有画面を開く
document.getElementById("shareMenuButton").addEventListener("click", () => {
  document.querySelectorAll(".view-section").forEach(section => {
    section.style.display = "none";
  });

  document.getElementById("shareView").style.display = "block";
});

// メッセージを表示する
function showMessage(message) {
  shareMessage.textContent = message;
}

// 招待コードを作る
function generateInviteCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);

  return Array.from(
    bytes,
    byte => characters[byte % characters.length]
  ).join("");
}

// グループ情報を画面に表示する
function showGroup(groupId, groupName, inviteCode, nickname) {
  groupInfo.replaceChildren();

  const name = document.createElement("p");
  name.textContent = `グループ名：${groupName}`;

  const memberName = document.createElement("p");
  memberName.textContent = `ニックネーム：${nickname}`;

  const code = document.createElement("p");
  code.textContent = `招待コード：${inviteCode}`;

  const copyButton = document.createElement("button");
  copyButton.textContent = "招待コードをコピー";

  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      showMessage("招待コードをコピーしたよ！");
    } catch (error) {
      showMessage(`招待コードを選択してコピーしてね：${inviteCode}`);
    }
  });

  groupInfo.append(name, memberName, code, copyButton);

  // 現在のグループ情報をブラウザに保存
  localStorage.setItem("studyPlannerGroupId", groupId);
  localStorage.setItem("studyPlannerGroupName", groupName);
  localStorage.setItem("studyPlannerInviteCode", inviteCode);
  localStorage.setItem("studyPlannerNickname", nickname);

  // グループ名の変更などをリアルタイムで反映
  const groupRef = doc(db, "groups", groupId);

  onSnapshot(groupRef, snapshot => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      name.textContent = `グループ名：${data.name}`;
    }
  }, error => {
    console.error(error);
  });
}

// グループ作成ボタン
createGroupButton.addEventListener("click", async () => {
  const groupName = groupNameInput.value.trim();

  if (!groupName) {
    showMessage("グループ名を入力してね。");
    return;
  }

  const nickname = prompt("あなたのニックネームを入力してね。");

  if (!nickname || !nickname.trim()) {
    showMessage("ニックネームを入力してね。");
    return;
  }

  try {
    createGroupButton.disabled = true;
    showMessage("グループを作成しています……");

    await loginPromise;

    const user = auth.currentUser;
    if (!user) {
      throw new Error("ログインできていません。");
    }

    // グループを作成
    const groupRef = doc(collection(db, "groups"));
    const groupId = groupRef.id;
    const inviteCode = generateInviteCode();

    await setDoc(groupRef, {
      name: groupName,
      ownerUid: user.uid,
      createdAt: serverTimestamp()
    });

    // 招待コードを登録
    await setDoc(doc(db, "inviteCodes", inviteCode), {
      groupId: groupId,
      groupName: groupName,
      createdAt: serverTimestamp()
    });

    // 作成した本人をメンバーに登録
    await setDoc(doc(db, "groups", groupId, "members", user.uid), {
      nickname: nickname.trim(),
      inviteCode: inviteCode,
      joinedAt: serverTimestamp()
    });

    showGroup(groupId, groupName, inviteCode, nickname.trim());
    showMessage("グループを作成できたよ！");
  } catch (error) {
    console.error("グループ作成エラー:", error);
    showMessage(`作成できませんでした：${error.message}`);
  } finally {
    createGroupButton.disabled = false;
  }
});

// グループ参加ボタン
joinGroupButton.addEventListener("click", async () => {
  const nickname = nicknameInput.value.trim();
  const inviteCode = inviteCodeInput.value.trim().toUpperCase();

  if (!nickname || !inviteCode) {
    showMessage("ニックネームと招待コードを入力してね。");
    return;
  }

  try {
    joinGroupButton.disabled = true;
    showMessage("グループを確認しています……");

    await loginPromise;

    const user = auth.currentUser;
    if (!user) {
      throw new Error("ログインできていません。");
    }

    // 招待コードからグループを探す
    const inviteRef = doc(db, "inviteCodes", inviteCode);
    const inviteSnapshot = await getDoc(inviteRef);

    if (!inviteSnapshot.exists()) {
      showMessage("招待コードが見つかりません。入力を確認してね。");
      return;
    }

    const inviteData = inviteSnapshot.data();
    const groupId = inviteData.groupId;
    const groupName = inviteData.groupName || "グループ";

    // メンバーとして登録
    await setDoc(doc(db, "groups", groupId, "members", user.uid), {
      nickname: nickname,
      inviteCode: inviteCode,
      joinedAt: serverTimestamp()
    });

    showGroup(groupId, groupName, inviteCode, nickname);
    showMessage("グループに参加できたよ！");
  } catch (error) {
    console.error("グループ参加エラー:", error);
    showMessage(`参加できませんでした：${error.message}`);
  } finally {
    joinGroupButton.disabled = false;
  }
});

// 前回参加したグループを表示
window.addEventListener("DOMContentLoaded", async () => {
  const groupId = localStorage.getItem("studyPlannerGroupId");
  const groupName = localStorage.getItem("studyPlannerGroupName");
  const inviteCode = localStorage.getItem("studyPlannerInviteCode");
  const nickname = localStorage.getItem("studyPlannerNickname");

  if (!groupId || !groupName || !inviteCode || !nickname) {
    return;
  }

  try {
    await loginPromise;

    const user = auth.currentUser;
    if (!user) return;

    // 保存済みのグループにまだ参加しているか確認
    const memberRef = doc(db, "groups", groupId, "members", user.uid);
    const memberSnapshot = await getDoc(memberRef);

    if (memberSnapshot.exists()) {
      showGroup(groupId, groupName, inviteCode, nickname);
    } else {
      showMessage("以前のグループ情報が見つかりません。招待コードで再参加してね。");
    }
  } catch (error) {
    console.error("グループ情報の読み込みエラー:", error);
  }
});