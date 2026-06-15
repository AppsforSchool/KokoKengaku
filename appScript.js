/*
const firebaseConfig = {
  apiKey: "AIzaSyAqIiNj0N4WruPSOkWbeo5gxzsNyeMkuLo",
    authDomain: "appsforschool-study.firebaseapp.com",
    projectId: "appsforschool-study",
    storageBucket: "appsforschool-study.firebasestorage.app",
    messagingSenderId: "740735293440",
    appId: "1:740735293440:web:a1363adbab57f1ceec60e5"
};

// Firebase 初期化とサービス取得
/*
window.app = firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();
window.db = firebase.firestore();
*/
const app = window.app;
const auth = window.auth;
const db = window.db;

let myUid;

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
      
      
      const userId = user.email.split("@")[0]
      drawerUserId.textContent = userId;
      
      
      const userSnapshot = await db.collection("users_random").doc(userId).get();
      const userData = userSnapshot.data();
      drawerUsername.textContent = userData.name;

      myUid = userData.uid;
      getAllTalkData();
    } else {
      console.log("logout");
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
    const user = window.auth.currentUser;
    if (!user) throw new Error("ユーザーがログインしていません。");
    // Firestoreの users/{UID} ドキュメントを更新
    const userId = user.email.split("@")[0];
    await window.db.collection('users_random').doc(userId).set({
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
    const talkSnapshot = await db.collection("KokoKengaku").get();
    
    // 各単元をループ処理
    for (const talkDoc of talkSnapshot.docs) {
      const roomData = talkDoc.data();
      const members = roomData.members || [];
      const talkButton = document.createElement("button");
      talkButton.textContent = roomData.title;
      console.log(talkDoc.id);
      talkButton.addEventListener("click", () => {
        console.log(`./talk.html?id=${talkDoc.id}`);
        window.location.href = `./talk.html?id=${talkDoc.id}`;
      });
      console.log(members.includes(myUid));
      if (members.includes(myUid)) {
        talkButtonArea.appendChild(talkButton);
      }
    }
    talkButtonLoading.classList.add("hidden");
  talkButtonArea.classList.remove("hidden");
  } catch (error) {
    console.error("データ取得エラー:", error);
    alert(error);
  }
  
}

