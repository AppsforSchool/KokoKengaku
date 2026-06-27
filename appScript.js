const firebaseConfig = {
  apiKey: "AIzaSyAqIiNj0N4WruPSOkWbeo5gxzsNyeMkuLo",
  authDomain: "appsforschool-study.firebaseapp.com",
  projectId: "appsforschool-study",
  storageBucket: "appsforschool-study.firebasestorage.app",
  messagingSenderId: "740735293440",
  appId: "1:740735293440:web:982702b6d53aaa18ec60e5"
};

// Firebase 初期化とサービス取得
/*
window.app = firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();
window.db = firebase.firestore();
*/
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let myUid = "";
let myUserId = "";

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
  
  accountSettingsButton.addEventListener('click', openDrawer);
  drawerCloseButton.addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);
  drawerLogoutButton.addEventListener('click', handleLogout);
  
  changeUsernameButton.addEventListener('click', handleChangeUsername);
newUsernameInput.addEventListener('input', updateNameButtonState);
});


function openDrawer() {
    accountSettingsDrawer.classList.add('is-open');
    drawerOverlay.classList.add('is-open');
}
function closeDrawer() {
  accountSettingsDrawer.classList.remove('is-open');
  drawerOverlay.classList.remove('is-open');
}

document.addEventListener("DOMContentLoaded", () => {
  auth.onAuthStateChanged(async (user) => {
   try {
    if (user) {
      
      
      myUserId = user.email.split("@")[0];
      drawerUserId.textContent = myUserId;
      
      
      const userSnapshot = await db.collection("users_random").doc(myUserId).get();
      const userData = userSnapshot.data();
      drawerUsername.textContent = userData.name;

      myUid = userData.uid;
      getAllTalkData();
    } else {
      console.log("logout");
      window.location.href = "./index.html";
    }
   }
    catch (error) {
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
  if (changeUsernameButton) { // changeUsernameButtonが存在する場合のみ実行
    // 値があるかチェック
    usernameMessage.textContent = '';
    const hasNewName = newUsernameInput && newUsernameInput.value.trim() !== '';
    // 入力されていればボタンを有効、そうでなければ無効
    changeUsernameButton.disabled = !hasNewName;
  }
}
// --- 名前変更処理 ---
const handleChangeUsername = async () => {
  // ドロワー内の入力要素とメッセージ要素を取得
  const newUsername = newUsernameInput.value.trim();
  usernameMessage.textContent = ''; // メッセージをクリア

  if (changeUsernameButton) {
    changeUsernameButton.disabled = true;
    changeUsernameButton.textContent = '変更中...';
    usernameMessage.textContent = '';
  }
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("ユーザーがログインしていません。");
    // Firestoreの users/{UID} ドキュメントを更新
    await db.collection('users_random').doc(myUserId).set({
    name: newUsername, // フィールド名も前のコードに合わせて 'name' にしています
  }, { merge: true });

    usernameMessage.style.color = 'green';
    usernameMessage.textContent = 'ユーザーネームが変更されました！';
    drawerUsername.textContent = newUsername; // 表示を更新
    newUsernameInput.value = ''; // 入力フィールドをクリア
    changeUsernameButton.disabled = true;

    // ヘッダーのアカウント設定ボタンの表示も更新
    //if (headerUsername) headerUsername.textContent = newUsername;

    } catch (error) {
      console.error("ユーザーネーム変更エラー:", error);
      usernameMessage.style.color = 'red';
      usernameMessage.textContent = 'ユーザーネームの変更に失敗しました。' + error.message;
      changeUsernameButton.disabled = false;
    } finally {
      if (changeUsernameButton) {
        changeUsernameButton.textContent = '名前を変更';
      }
    }
};




async function getAllTalkData() {
  const talkButtonArea = document.getElementById("talk-button-area");
  const talkButtonLoading = document.getElementById("talk-button-loading");
  
  try {
    const userSnapshot = await db.collection("users_random").doc(myUserId).get();
    const userData = userSnapshot.data() || {};
    const lastCheckedMap = userData.lastChecked || {};
    
    // 【改善点】自分が含まれるルームだけをピンポイントで取得する
    const talkSnapshot = await db.collection("KokoKengaku")
      .where("members", "array-contains", myUserId)
      .get();
    
    const fragment = document.createDocumentFragment();
    
    // ループ内の非同期処理（未読数カウント）を並列で実行するための準備
    const promises = talkSnapshot.docs.map(async (talkDoc) => {
      const roomData = talkDoc.data();
      
      const talkButton = document.createElement("div");
      talkButton.classList.add("talk-button");
      talkButton.addEventListener("click", () => {
        window.location.href = `./talk.html?id=${talkDoc.id}`;
      });

      const titleArea = document.createElement("p");
      titleArea.classList.add("title");
      titleArea.textContent = roomData.title;
      
      const lastCheckedTime = lastCheckedMap[talkDoc.id] ? lastCheckedMap[talkDoc.id].toDate() : new Date(0);

      // 未読数の取得
      const unreadSnapshot = await db.collection("KokoKengaku")
        .doc(talkDoc.id)
        .collection("talk")
        .where("time", ">", lastCheckedTime)
        .get();

      const unreadCount = unreadSnapshot.size;
      
      const newMessageArea = document.createElement("p");
      newMessageArea.classList.add("new-message");
      if (unreadCount === 0) {
        newMessageArea.classList.add("no-message");
      }
      newMessageArea.textContent = `新着: ${unreadCount}件`;
      
      talkButton.appendChild(titleArea);
      talkButton.appendChild(newMessageArea);
      
      return talkButton;
    });

    // 【改善点】すべてのルームの未読チェックを「同時に（並列で）」行う
    const talkButtons = await Promise.all(promises);
    
    // 出来上がったボタンを一括で画面に追加
    talkButtons.forEach(button => fragment.appendChild(button));
    talkButtonArea.appendChild(fragment);

    talkButtonLoading.classList.add("hidden");
    talkButtonArea.classList.remove("hidden");
    
  } catch (error) {
    console.error("データ取得エラー:", error);
    alert(error);
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
