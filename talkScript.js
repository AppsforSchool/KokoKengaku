const firebaseConfig = {
  apiKey: "AIzaSyAqIiNj0N4WruPSOkWbeo5gxzsNyeMkuLo",
  authDomain: "appsforschool-study.firebaseapp.com",
  projectId: "appsforschool-study",
  storageBucket: "appsforschool-study.firebasestorage.app",
  messagingSenderId: "740735293440",
  appId: "1:740735293440:web:982702b6d53aaa18ec60e5"
};

// Firebase 初期化とサービス取得
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let myUserId = "";
let myUid = "";

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
  auth.onAuthStateChanged(async (user) => {
    try {
      if (user) {
        myUserId = user.email.split("@")[0];
        drawerUserId.textContent = myUserId;

        const userSnapshot = await db
          .collection("users_random")
          .doc(myUserId)
          .get();
        const userData = userSnapshot.data();
        drawerUsername.textContent = userData.name;

        myUid = userData.uid;
        const talkId = getParmFromUrl("id");
        //const talkId = "foGOSYbDcjxGpfi6gmfs";
        //const talkId = "oMRei2rXPVKWCwqRfA5W";
        getAllTalkData(talkId);
        getMember(talkId);
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
      await auth.signOut(auth);
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
    // changeUsernameButtonが存在する場合のみ実行
    // 値があるかチェック
    usernameMessage.textContent = "";
    const hasNewName = newUsernameInput && newUsernameInput.value.trim() !== "";
    // 入力されていればボタンを有効、そうでなければ無効
    changeUsernameButton.disabled = !hasNewName;
  }
}
// --- 名前変更処理 ---
const handleChangeUsername = async () => {
  // ドロワー内の入力要素とメッセージ要素を取得
  const newUsername = newUsernameInput.value.trim();
  usernameMessage.textContent = ""; // メッセージをクリア

  if (changeUsernameButton) {
    changeUsernameButton.disabled = true;
    changeUsernameButton.textContent = "変更中...";
    usernameMessage.textContent = "";
  }
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("ユーザーがログインしていません。");
    // Firestoreの users/{UID} ドキュメントを更新
    const userId = user.email.split("@")[0];
    await db.collection("users_random").doc(userId).set(
      {
        name: newUsername // フィールド名も前のコードに合わせて 'name' にしています
      },
      { merge: true }
    );

    usernameMessage.style.color = "green";
    usernameMessage.textContent = "ユーザーネームが変更されました！";
    drawerUsername.textContent = newUsername; // 表示を更新
    newUsernameInput.value = ""; // 入力フィールドをクリア
    changeUsernameButton.disabled = true;

    // ヘッダーのアカウント設定ボタンの表示も更新
    //if (headerUsername) headerUsername.textContent = newUsername;
  } catch (error) {
    console.error("ユーザーネーム変更エラー:", error);
    usernameMessage.style.color = "red";
    usernameMessage.textContent =
      "ユーザーネームの変更に失敗しました。" + error.message;
    changeUsernameButton.disabled = false;
  } finally {
    if (changeUsernameButton) {
      changeUsernameButton.textContent = "名前を変更";
    }
  }
};

async function getAllTalkData(talkId) {
  const talkTitle = document.getElementById("talk-title");
  const talkArea = document.getElementById("talk-area");
  const talkLoading = document.getElementById("talk-loading");
  

  try {
    const roomSnapshot = await db.collection("KokoKengaku").doc(talkId).get();
    const roomData = roomSnapshot.data();
    talkTitle.textContent = roomData.title;

    
    

    db.collection("KokoKengaku")
      .doc(talkId)
      .collection("talk")
      .orderBy("time", "asc")
      .onSnapshot(async (messageSnapshot) => {
        const newTalk = document.createElement("div");
        const loadingText = document.createElement("p");
        loadingText.textContent = "loading...";
        talkArea.innerHTML = "";
        talkArea.appendChild(loadingText);
        //talkLoading.classList.remove("hidden");
        //talkArea.classList.add("hidden");
        newTalk.innerHTML = "";
        for (const talkDoc of messageSnapshot.docs) {
          
          const messageData = talkDoc.data();
          console.log(talkDoc.id);
          console.log(messageData.message);

          const message = document.createElement("div");
          message.classList.add("message");

          const messageUser = document.createElement("p");

          const messageUserId = messageData.userId;
          let senderName = "不明なユーザー";
          if (messageUserId) {
            const userSnapshot = await db
              .collection("users_random")
              .doc(messageUserId)
              .get();
            if (userSnapshot.exists) {
              const userData = userSnapshot.data();
              senderName = userData.name || "名前未設定";
            }
          }

          let displayTime = "時間不明";
          if (messageData.time) {
            const dateObject = messageData.time.toDate();
            displayTime = formatDateTime(dateObject);
          }

          const readByList = messageData.readBy || [];
          //console.log(readByList);
          if (messageData.userId !== myUserId && !readByList.includes(myUserId)) {
            // Firestoreの配列に自分のuserIdを「追加（上書きではなく合流）」する
            // ※ awaitをつけずに裏で非同期で実行させることで、画面の描画を邪魔しません
            db.collection("KokoKengaku")
              .doc(talkId)
              .collection("talk")
              .doc(talkDoc.id)
              .update({
                readBy: firebase.firestore.FieldValue.arrayUnion(myUserId)
              })
              .catch(err => console.error("既読更新エラー:", err));
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
      });
    updateLastCheckedTime(talkId, myUserId);
  } catch (error) {
    console.error("データ取得エラー:", error);
    alert(error);
  }
}

function sanitizeHtmlToOnlyLinks(htmlString) {
  // 1. ブラウザの機能を使って、文字列を一時的にHTMLドキュメントとして解析する
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  // 結果を格納するための空のドキュメントフラグメント（箱）を作る
  const box = document.createDocumentFragment();

  // 2. 解析したデータの中身（ノード）を1つずつチェックしていく
  // doc.body.childNodes には、文字や各タグが順番に入っています
  const childNodes = Array.from(doc.body.childNodes);

  childNodes.forEach(node => {
    // もしその要素が「普通の文字（テキストノード）」ならそのままコピー
    if (node.nodeType === Node.TEXT_NODE) {
      box.appendChild(document.createTextNode(node.textContent));
    } 
    // もしその要素が「タグ（エレメントノード）」で、かつ「Aタグ」の場合だけ許可
    else if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'A') {
      const safeLink = document.createElement('a');
      
      // 表面上のテキストをコピー
      safeLink.textContent = node.textContent;
      
      // href属性（リンク先）があればコピー、なければ '#' に
      const rawHref = node.getAttribute('href') || '#';
      safeLink.setAttribute('href', rawHref);
      
      // iPadの別タブで開く安全設定を強制付与
      safeLink.setAttribute('target', '_blank');
      safeLink.setAttribute('rel', 'noopener noreferrer');
      safeLink.classList.add('chat-link'); // 先ほどのCSS用クラス

      box.appendChild(safeLink);
    }
    // <a> 以外のタグ（<script> や <div> など）は、中身のテキストだけを抜き出してただの文字にする
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
  // 月や日は1桁の場合、頭に「0」をつけて2桁にする（例: 6月 → 06）
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
    //const talkId = "foGOSYbDcjxGpfi6gmfs";
    await addMessage(talkId);
  });
});

function updateMessageAddButtonState() {
  //messageAddButton.textContent = "";
    const hasMessage = messageInput && messageInput.value.trim() !== "";
    // 入力されていればボタンを有効、そうでなければ無効
    messageAddButton.disabled = !hasMessage;
}

async function addMessage(talkId) {
  const message = messageInput.value.trim();
  messageAddButton.disabled = true;
  messageAddButton.textContent = "送信中...";
    //usernameMessage.textContent = "";
  const user = auth.currentUser;
  const myUserId = user.email.split("@")[0];
  try {
    await db.collection("KokoKengaku")
      .doc(talkId)
      .collection("talk")
      .add({
        userId: myUserId,                                      // 送信者のuserId
        message: message,     
        readBy: [],
        // メッセージ本文（改行データもそのまま入ります）
        time: firebase.firestore.FieldValue.serverTimestamp() // サーバー時間（Timestamp型）
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
};

async function getMember(talkId) {
  const memberArea = document.getElementById("member-area");
  memberArea.innerHTML = "";
  try {
    const roomSnapshot = await db.collection("KokoKengaku").doc(talkId).get();
    if (!roomSnapshot.exists) {
      return;
    }
    
    const roomData = roomSnapshot.data();
    const memberUserIds = roomData.members || [];
    
    for (const userId of memberUserIds) {
      
      let memberName = "不明なユーザー";

      // 3. 各userIdをドキュメントIDとして、users_random から名前を取得
      const userSnapshot = await db.collection("users_random").doc(userId).get();
      
      if (userSnapshot.exists) {
        const userData = userSnapshot.data();
        memberName = userData.name || "名前未設定";
      }

      // 4. 画面にメンバー名を表示するHTML要素を作成
      const memberElement = document.createElement("p");
      memberElement.textContent = memberName; // 名前とuserIdを表示

      // コンテナに追加（横並びにするなら span、縦並びにするなら div など）
      memberArea.appendChild(memberElement);
    }
  }
  catch (error) {
    console.log(error);
  }
}

async function updateLastCheckedTime(talkId, myUserId) {
  try {
    await db.collection("users_random").doc(myUserId).set({
      // lastChecked というオブジェクトの中に、ルームIDをキーにして時間を保存
      lastChecked: {
        [talkId]: firebase.firestore.FieldValue.serverTimestamp()
      }
    }, { merge: true }); // 他のデータを消さないようにマージ
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
  
  shareModalBtn.addEventListener("click", () => {
    shareModal.classList.remove("hidden");
  });
  shareModalClose.addEventListener("click", () => {
    shareModal.classList.add("hidden");
  });
});

let toHomeButton;
document.addEventListener("DOMContentLoaded", () => {
  toHomeButton = document.getElementById("to-home-button");
  
  toHomeButton.addEventListener("click", () => {
    window.location.href = "./app.html";
  });
});

let memberButton;
let memberModal;
let memberModalClose;
document.addEventListener("DOMContentLoaded", () => {
  memberButton = document.getElementById("member-button");
  memberModal = document.getElementById("member-modal");
  memberModalClose = document.getElementById("member-modal-close");
  
  memberButton.addEventListener("click", () => {
    memberModal.classList.remove("hidden");
  });
  memberModalClose.addEventListener("click", () => {
    memberModal.classList.add("hidden");
  });
});

let readModal;
let readModalClose;
let readArea;
document.addEventListener("DOMContentLoaded", () => {
  readModal = document.getElementById("read-modal");
  readModalClose = document.getElementById("read-modal-close");
  readArea = document.getElementById("read-area");
  
  readModalClose.addEventListener("click", () => {
    readModal.classList.add("hidden");
  });
});

async function openReadByModal(readByList) {
  readArea.innerHTML = "読み込み中..."; // 一時表示
  readModal.classList.remove("hidden");

  const fragment = document.createDocumentFragment();

  // 既読リスト（userIdの配列）をループして名前を取得
  for (const userId of readByList) {
    let name = "不明なユーザー";
    
    try {
      const userSnapshot = await db.collection("users_random").doc(userId).get();
      if (userSnapshot.exists) {
        name = userSnapshot.data().name || "名前未設定";
      }
    } catch (e) {
      console.error(e);
    }

    const p = document.createElement("p");
    p.textContent = name;
    fragment.appendChild(p);
  }

  readArea.innerHTML = ""; // 読み込み中を消去
  readArea.appendChild(fragment);
}
