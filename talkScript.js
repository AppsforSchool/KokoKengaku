const firebaseConfig = {
  apiKey: "AIzaSyAqIiNj0N4WruPSOkWbeo5gxzsNyeMkuLo",
  authDomain: "appsforschool-study.firebaseapp.com",
  projectId: "appsforschool-study",
  storageBucket: "appsforschool-study.firebasestorage.app",
  messagingSenderId: "740735293440",
  appId: "1:740735293440:web:a1363adbab57f1ceec60e5"
};

// Firebase 初期化とサービス取得
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

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
        const userId = user.email.split("@")[0];
        drawerUserId.textContent = userId;

        const userSnapshot = await db
          .collection("users_random")
          .doc(userId)
          .get();
        const userData = userSnapshot.data();
        drawerUsername.textContent = userData.name;

        myUid = userData.uid;
        //const talkId = getParmFromUrl("id");
        const talkId = "foGOSYbDcjxGpfi6gmfs";
        //const talkId = "oMRei2rXPVKWCwqRfA5W";
        getAllTalkData(talkId);
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

          messageUser.textContent = `${senderName} ${displayTime}`;
          messageUser.classList.add("message-user");
          message.appendChild(messageUser);

          const messageText = document.createElement("p");
          messageText.textContent = messageData.message;
          messageText.classList.add("message-text");
          message.appendChild(messageText);

          newTalk.appendChild(message);
          
        }
        talkArea.innerHTML = "";
        talkArea.appendChild(newTalk);
      
        talkArea.scrollTop = talkArea.scrollHeight;
      
        //talkLoading.classList.add("hidden");
        //talkArea.classList.remove("hidden");
      });

    // 各単元をループ処理
    /*for (const talkDoc of messageSnapshot.docs) {
      const messageData = talkDoc.data();
      console.log(talkDoc.id);
      console.log(messageData.message);
      
      const message = document.createElement("div");
      message.classList.add("message");
      
      const messageUser = document.createElement("p");
      
      const messageUserId = messageData.userId; 
      let senderName = "不明なユーザー";
      if (messageUserId) {
        const userSnapshot = await db.collection("users_random").doc(messageUserId).get();
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
      
      messageUser.textContent = `${senderName} ${displayTime}`;
      messageUser.classList.add("message-user");
      message.appendChild(messageUser);
      
      const messageText = document.createElement("p");
      messageText.textContent = messageData.message;
      messageText.classList.add("message-text");
      message.appendChild(messageText);
      
      talkArea.appendChild(message);
    }*/
    
  } catch (error) {
    console.error("データ取得エラー:", error);
    alert(error);
  }
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
    //const talkId = getParmFromUrl("id");
    const talkId = "foGOSYbDcjxGpfi6gmfs";
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
        message: message,                                     // メッセージ本文（改行データもそのまま入ります）
        time: firebase.firestore.FieldValue.serverTimestamp() // サーバー時間（Timestamp型）
      });
  }
  catch (error) {
    console.log(error);
  }
  finally {
    messageAddButton.disabled = false;
    messageAddButton.textContent = "送信";
    messageInput.value = "";
  }
};


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