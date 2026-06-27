//alert("test");

// 共通設定からインポート
import { auth, db } from "./firebase-config.js";

// 各機能の関数をv10のURLからインポート
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
  onAuthStateChanged(auth, async (user) => {
    try {
      if (user) {
        myUserId = user.email.split("@")[0];
        drawerUserId.textContent = myUserId;
        
        // 1️⃣ ここで一度だけユーザー情報を取得（通信の無駄をカット）
        const userDocRef = doc(db, "users_random", myUserId);
        const userSnapshot = await getDoc(userDocRef);
        const userData = userSnapshot.data() || {};
        drawerUsername.textContent = userData.name || "未設定";

        myUid = userData.uid;
        
        // 💡 取得した userData をそのまま次の関数に引き渡す
        getAllTalkData(userData);
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
    usernameMessage.textContent = '';
    const hasNewName = newUsernameInput && newUsernameInput.value.trim() !== '';
    changeUsernameButton.disabled = !hasNewName;
  }
}

const handleChangeUsername = async () => {
  const newUsername = newUsernameInput.value.trim();
  usernameMessage.textContent = '';

  if (changeUsernameButton) {
    changeUsernameButton.disabled = true;
    changeUsernameButton.textContent = '変更中...';
  }
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("ユーザーがログインしていません。");
    
    const userDocRef = doc(db, 'users_random', myUserId);
    await setDoc(userDocRef, { name: newUsername }, { merge: true });

    usernameMessage.style.color = 'green';
    usernameMessage.textContent = 'ユーザーネームが変更されました！';
    drawerUsername.textContent = newUsername;
    newUsernameInput.value = '';
    changeUsernameButton.disabled = true;

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

// 💡 共通の db を使い、かつ Promise.all で並列爆速化したデータ取得
async function getAllTalkData(userData) {
  const talkButtonArea = document.getElementById("talk-button-area");
  const talkButtonLoading = document.getElementById("talk-button-loading");
  
  try {
    const lastCheckedMap = userData.lastChecked || {};
    
    // 全トークルーム一覧を取得
    const talkCollectionRef = collection(db, "KokoKengaku");
    const talkSnapshot = await getDocs(talkCollectionRef);
    
    // 自分がメンバーになっている部屋だけに瞬時に絞り込み
    const myRooms = talkSnapshot.docs.filter(docSnapshot => {
      const members = docSnapshot.data().members || [];
      return members.includes(myUserId);
    });

    // 2️⃣ 【最重要】各部屋の未読取得の通信を「同時に一斉スタート」させる
    const unreadPromises = myRooms.map(async (talkDoc) => {
      const lastCheckedTime = lastCheckedMap[talkDoc.id] ? lastCheckedMap[talkDoc.id].toDate() : new Date(0);
      
      const talkSubCollectionRef = collection(db, "KokoKengaku", talkDoc.id, "talk");
      const q = query(talkSubCollectionRef, where("time", ">", lastCheckedTime));
      const unreadSnapshot = await getDocs(q);
        
      return {
        docId: talkDoc.id,
        roomData: talkDoc.data(),
        unreadCount: unreadSnapshot.size
      };
    });

    // ここで全ての通信が終わるのを一括で待つ（順番待ちが消えるため、劇的に速くなります）
    const roomResults = await Promise.all(unreadPromises);

    roomResults.forEach((result) => {
      const talkButton = document.createElement("div");
      talkButton.classList.add("talk-button");
      talkButton.addEventListener("click", () => {
        window.location.href = `./talk.html?id=${result.docId}`;
      });

      const titleArea = document.createElement("p");
      titleArea.classList.add("title");
      titleArea.textContent = result.roomData.title;
      
      const newMessageArea = document.createElement("p");
      newMessageArea.classList.add("new-message");
      if (result.unreadCount === 0) {
        newMessageArea.classList.add("no-message");
      }
      newMessageArea.textContent = `新着: ${result.unreadCount}件`;
      
      talkButton.appendChild(titleArea);
      talkButton.appendChild(newMessageArea);
      talkButtonArea.appendChild(talkButton);
    });

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
