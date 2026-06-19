alert("現在メンテナンス中のため､正常に作動しません｡ (testId=2)");

// 1. 共通設定ファイルから、初期化済みのインスタンスをインポート
import { auth, db } from "./firebase-config.js";

// 2. このページで使う Firestore / Auth の関数やツールをインポート
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  doc, getDoc, setDoc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, arrayUnion, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let myUserId = "";
let myUid = "";

// 💡 高速化のための裏技：一度取得したユーザー名をメモリに一時保存して使い回す（通信を激減させる）
const userCache = {};

let drawerOverlay;
let accountSettingsDrawer;
let drawerCloseButton;
let accountSettingsButton;
let drawerUserId;
let drawerLogoutButton;
let drawerUsername;
let changeUsernameButton;
let newUsernameInput;
let usernameMessage;

document.addEventListener("DOMContentLoaded", () => {
  drawerOverlay = document.getElementById("drawerOverlay");
  accountSettingsDrawer = document.getElementById("accountSettingsDrawer");
  drawerCloseButton = document.getElementById("drawerCloseButton");
  accountSettingsButton = document.getElementById("setting-button");

  drawerUserId = document.getElementById("drawerUserId");
  drawerLogoutButton = document.getElementById("logout-button");
  drawerUsername = document.getElementById("drawerUsername");
  changeUsernameButton = document.getElementById("changeUsernameButton");
  newUsernameInput = document.getElementById("newUsernameInput");
  usernameMessage = document.getElementById("username-message");

  accountSettingsButton.addEventListener("click", openDrawer);
  drawerCloseButton.addEventListener("click", closeDrawer);
  drawerOverlay.addEventListener("click", closeDrawer);
  drawerLogoutButton.addEventListener("click", handleLogout);

  changeUsernameButton.addEventListener("click", handleChangeUsername);
  newUsernameInput.addEventListener("input", updateNameButtonState);
});

function openDrawer() {
  accountSettingsDrawer.classList.add("is-open");
  drawerOverlay.classList.add("is-open");
}
function closeDrawer() {
  accountSettingsDrawer.classList.remove("is-open");
  drawerOverlay.classList.remove("is-open");
}

document.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, async (user) => {
    try {
      if (user) {
        myUserId = user.email.split("@")[0];
        drawerUserId.textContent = myUserId;

        // v10形式のデータ取得
        
        const userDocRef = doc(db, "users_random", myUserId);
        alert("userDocRef");
        const userSnapshot = await getDoc(userDocRef);
        const userData = userSnapshot.data() || {};
        drawerUsername.textContent = userData.name || "未設定";

        myUid = userData.uid;
        
        // メモリキャッシュに自分を登録しておく
        userCache[myUserId] = userData.name || "未設定";

        const talkId = getParmFromUrl("id");
        /*
        getAllTalkData(talkId);
        getMember(talkId);
        */
      } else {
        console.log("logout");
        window.location.href = "./index.html";
      }
    } catch (error) {
      console.log(error);
      alert(error);
    }
  });
});

const handleLogout = async () => {
  const isConfirmed = confirm("ログアウトしますか？");
  if (isConfirmed) {
    try {
      await signOut(auth);
      console.log("ログアウトしました！");
      alert("ログアウトしました。");
    } catch (error) {
      console.error("ログアウトエラー:", error);
      alert("ログアウトに失敗しました。");
    }
  }
};

function updateNameButtonState() {
  if (changeUsernameButton) {
    usernameMessage.textContent = "";
    const hasNewName = newUsernameInput && newUsernameInput.value.trim() !== "";
    changeUsernameButton.disabled = !hasNewName;
  }
}

const handleChangeUsername = async () => {
  const newUsername = newUsernameInput.value.trim();
  usernameMessage.textContent = "";

  if (changeUsernameButton) {
    changeUsernameButton.disabled = true;
    changeUsernameButton.textContent = "変更中...";
  }
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("ユーザーがログインしていません。");
    
    const userId = user.email.split("@")[0];
    const userDocRef = doc(db, "users_random", userId);
    await setDoc(userDocRef, { name: newUsername }, { merge: true });

    usernameMessage.style.color = "green";
    usernameMessage.textContent = "ユーザーネームが変更されました！";
    drawerUsername.textContent = newUsername;
    
    // キャッシュも更新
    userCache[userId] = newUsername;

    newUsernameInput.value = "";
    changeUsernameButton.disabled = true;
  } catch (error) {
    console.error("ユーザーネーム変更エラー:", error);
    usernameMessage.style.color = "red";
    usernameMessage.textContent = "ユーザーネームの変更に失敗しました。" + error.message;
    changeUsernameButton.disabled = false;
  } finally {
    if (changeUsernameButton) {
      changeUsernameButton.textContent = "名前を変更";
    }
  }
};

// 💡 ユーザー名取得を爆速化したチャットデータ監視
async function getAllTalkData(talkId) {
  const talkTitle = document.getElementById("talk-title");
  const talkArea = document.getElementById("talk-area");

  try {
    // 部屋情報の取得
    const roomDocRef = doc(db, "KokoKengaku", talkId);
    const roomSnapshot = await getDoc(roomDocRef);
    const roomData = roomSnapshot.data() || {};
    talkTitle.textContent = roomData.title || "トークルーム";

    // サブコレクションのクエリ（v10形式）
    const talkCollectionRef = collection(db, "KokoKengaku", talkId, "talk");
    const q = query(talkCollectionRef, orderBy("time", "asc"));

    // リアルタイム同期の開始
    onSnapshot(q, async (messageSnapshot) => {
      const newTalk = document.createElement("div");
      const loadingText = document.createElement("p");
      loadingText.textContent = "loading...";
      talkArea.innerHTML = "";
      talkArea.appendChild(loadingText);
      
      // 💡 【高速化ポイント】メッセージ送信者の名前を一斉に（同時並列で）解決する
      const namePromises = messageSnapshot.docs.map(async (talkDoc) => {
        const messageData = talkDoc.data();
        const msgUserId = messageData.userId;
        
        if (!msgUserId) return { docId: talkDoc.id, name: "不明なユーザー" };
        
        // すでに一度調べた名前なら、通信せずに使い回す
        if (userCache[msgUserId]) {
          return { docId: talkDoc.id, name: userCache[msgUserId] };
        }
        
        try {
          const uSnap = await getDoc(doc(db, "users_random", msgUserId));
          const uName = uSnap.exists() ? (uSnap.data().name || "名前未設定") : "不明なユーザー";
          userCache[msgUserId] = uName; // キャッシュに記録
          return { docId: talkDoc.id, name: uName };
        } catch {
          return { docId: talkDoc.id, name: "不明なユーザー" };
        }
      });

      // すべての名前解決が終わるのを一括で待つ（ループ内の await を撲滅）
      const resolvedNames = await Promise.all(namePromises);
      const nameMap = Object.fromEntries(resolvedNames.map(item => [item.docId, item.name]));

      // 画面の構築開始
      for (const talkDoc of messageSnapshot.docs) {
        const messageData = talkDoc.data();
        const senderName = nameMap[talkDoc.id];

        const message = document.createElement("div");
        message.classList.add("message");

        const messageUser = document.createElement("p");

        let displayTime = "時間不明";
        if (messageData.time) {
          const dateObject = messageData.time.toDate();
          displayTime = formatDateTime(dateObject);
        }

        const readByList = messageData.readBy || [];
        
        // 💡 既読処理（v10形式：updateDoc と arrayUnion）
        if (messageData.userId !== myUserId && !readByList.includes(myUserId)) {
          const msgDocRef = doc(db, "KokoKengaku", talkId, "talk", talkDoc.id);
          updateDoc(msgDocRef, {
            readBy: arrayUnion(myUserId)
          }).catch(err => console.error("既読更新エラー:", err));
        }
        
        let displayReadCount = readByList.length;
        const readSpan = document.createElement("span");
        readSpan.textContent = `既読:${displayReadCount}人`;
        readSpan.style.textDecoration = 'underline';
        readSpan.addEventListener("click", () => {
          openReadByModal(readByList);
        });

        messageUser.textContent = `${senderName} ${displayTime} `;
        messageUser.classList.add("message-user");
        messageUser.appendChild(readSpan);
        message.appendChild(messageUser);

        const messageText = document.createElement("p");
        messageText.classList.add("message-text");
        const safeContent = sanitizeHtmlToOnlyLinks(messageData.message);
        messageText.appendChild(safeContent);
        message.appendChild(messageText);

        newTalk.appendChild(message);
      }
      
      talkArea.innerHTML = "";
      talkArea.appendChild(newTalk);
      talkArea.scrollTop = talkArea.scrollHeight;

      updateLastCheckedTime(talkId, myUserId);
    });
    
  } catch (error) {
    console.error("データ取得エラー:", error);
    alert(error);
  }
}

function sanitizeHtmlToOnlyLinks(htmlString) {
  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(htmlString, 'text/html');
  const box = document.createDocumentFragment();
  const childNodes = Array.from(parsedDoc.body.childNodes);

  childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      box.appendChild(document.createTextNode(node.textContent));
    } 
    else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A') {
      const safeLink = document.createElement('a');
      safeLink.textContent = node.textContent;
      const rawHref = node.getAttribute('href') || '#';
      safeLink.setAttribute('href', rawHref);
      safeLink.setAttribute('target', '_blank');
      safeLink.setAttribute('rel', 'noopener noreferrer');
      safeLink.classList.add('chat-link');
      box.appendChild(safeLink);
    }
    else if (node.nodeType === Node.ELEMENT_NODE) {
      box.appendChild(document.createTextNode(node.textContent));
    }
  });

  return box;
}

function getParmFromUrl(parm) {
  const params = new URLSearchParams(window.location.search);
  return params.get(parm);
}

function formatDateTime(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}

let messageInput;
let messageAddButton;
document.addEventListener("DOMContentLoaded", () => {
  messageInput = document.getElementById("message-input");
  messageAddButton = document.getElementById("message-add-button");
  
  messageInput.addEventListener("input", () => {
    updateMessageAddButtonState();
  });
  
  messageAddButton.addEventListener("click", async () => {
    const talkId = getParmFromUrl("id");
    await addMessage(talkId);
  });
});

function updateMessageAddButtonState() {
  const hasMessage = messageInput && messageInput.value.trim() !== "";
  messageAddButton.disabled = !hasMessage;
}

// 💡 メッセージ追加（v10形式：addDoc と serverTimestamp）
async function addMessage(talkId) {
  const message = messageInput.value.trim();
  messageAddButton.disabled = true;
  messageAddButton.textContent = "送信中...";
  const user = auth.currentUser;
  const currentUserId = user.email.split("@")[0];
  
  try {
    const talkCollectionRef = collection(db, "KokoKengaku", talkId, "talk");
    await addDoc(talkCollectionRef, {
      userId: currentUserId,
      message: message,     
      readBy: [],
      time: serverTimestamp() // v10形式のサーバータイムスタンプ
    });
  }
  catch (error) {
    console.log(error);
  }
  finally {
    messageAddButton.disabled = true;
    messageAddButton.textContent = "送信";
    messageInput.value = "";
  }
}

// 💡 メンバー一覧取得（Promise.allによる並列高速化）
async function getMember(talkId) {
  const memberArea = document.getElementById("member-area");
  memberArea.innerHTML = "";
  try {
    const roomDocRef = doc(db, "KokoKengaku", talkId);
    const roomSnapshot = await getDoc(roomDocRef);
    if (!roomSnapshot.exists()) return;
    
    const roomData = roomSnapshot.data() || {};
    const memberUserIds = roomData.members || [];
    
    // メンバー全員の名前を「一斉に」通信して取得する
    const memberNamePromises = memberUserIds.map(async (userId) => {
      if (userCache[userId]) return userCache[userId];
      
      try {
        const uSnap = await getDoc(doc(db, "users_random", userId));
        const uName = uSnap.exists() ? (uSnap.data().name || "名前未設定") : "不明なユーザー";
        userCache[userId] = uName;
        return uName;
      } catch {
        return "不明なユーザー";
      }
    });

    const memberNames = await Promise.all(memberNamePromises);

    // 画面への追加
    memberNames.forEach(memberName => {
      const memberElement = document.createElement("p");
      memberElement.textContent = memberName;
      memberArea.appendChild(memberElement);
    });
  }
  catch (error) {
    console.log(error);
  }
}

// 💡 最終確認時間の更新（v10形式：setDoc）
async function updateLastCheckedTime(talkId, myUserId) {
  try {
    const userDocRef = doc(db, "users_random", myUserId);
    await setDoc(userDocRef, {
      lastChecked: {
        [talkId]: serverTimestamp()
      }
    }, { merge: true });
    console.log(`${talkId} の最終確認時刻を更新しました`);
  } catch (error) {
    console.error("最終確認時刻の更新に失敗:", error);
  }
}

let shareModalBtn;
let shareModal;
let shareModalClose;
document.addEventListener("DOMContentLoaded", () => {
  shareModalBtn = document.getElementById("share-modal-btn");
  shareModal = document.getElementById("share-modal");
  shareModalClose = document.getElementById("share-modal-close");
  
  if (shareModalBtn) {
    shareModalBtn.addEventListener("click", () => {
      shareModal.classList.remove("hidden");
    });
  }
  if (shareModalClose) {
    shareModalClose.addEventListener("click", () => {
      shareModal.classList.add("hidden");
    });
  }
});

let toHomeButton;
document.addEventListener("DOMContentLoaded", () => {
  toHomeButton = document.getElementById("to-home-button");
  if (toHomeButton) {
    toHomeButton.addEventListener("click", () => {
      window.location.href = "./app.html";
    });
  }
});

let memberButton;
let memberModal;
let memberModalClose;
document.addEventListener("DOMContentLoaded", () => {
  memberButton = document.getElementById("member-button");
  memberModal = document.getElementById("member-modal");
  memberModalClose = document.getElementById("member-modal-close");
  
  if (memberButton) {
    memberButton.addEventListener("click", () => {
      memberModal.classList.remove("hidden");
    });
  }
  if (memberModalClose) {
    memberModalClose.addEventListener("click", () => {
      memberModal.classList.add("hidden");
    });
  }
});

let readModal;
let readModalClose;
let readArea;
document.addEventListener("DOMContentLoaded", () => {
  readModal = document.getElementById("read-modal");
  readModalClose = document.getElementById("read-modal-close");
  readArea = document.getElementById("read-area");
  
  if (readModalClose) {
    readModalClose.addEventListener("click", () => {
      readModal.classList.add("hidden");
    });
  }
});

// 💡 既読モーダルを開く処理（Promise.allによる並列高速化）
async function openReadByModal(readByList) {
  readArea.innerHTML = "読み込み中...";
  readModal.classList.remove("hidden");

  const fragment = document.createDocumentFragment();

  // 既読をつけた全員の名前を一斉に同時取得
  const readNamePromises = readByList.map(async (userId) => {
    if (userCache[userId]) return userCache[userId];
    
    try {
      const uSnap = await getDoc(doc(db, "users_random", userId));
      const uName = uSnap.exists() ? (uSnap.data().name || "名前未設定") : "不明なユーザー";
      userCache[userId] = uName;
      return uName;
    } catch {
      return "不明なユーザー";
    }
  });

  const readNames = await Promise.all(readNamePromises);

  readNames.forEach(name => {
    const p = document.createElement("p");
    p.textContent = name;
    fragment.appendChild(p);
  });

  readArea.innerHTML = "";
  readArea.appendChild(fragment);
}
