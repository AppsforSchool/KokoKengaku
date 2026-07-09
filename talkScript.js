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
let userCache = {};
let userAdminCache = {};

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
        if (userData.isAdmin) drawerUsername.classList.add("admin");
        userCache[myUserId] = userData.name;
        userAdminCache[myUserId] = userData.isAdmin;

        myUid = userData.uid;
        const talkId = getParmFromUrl("id");
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
    usernameMessage.textContent = "";
  }
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("ユーザーがログインしていません。");
    const userId = user.email.split("@")[0];
    await db.collection("users_random").doc(userId).set(
      {
        name: newUsername
      },
      { merge: true }
    );

    usernameMessage.style.color = "green";
    usernameMessage.textContent = "ユーザーネームが変更されました！";
    drawerUsername.textContent = newUsername;
    newUsernameInput.value = "";
    changeUsernameButton.disabled = true;

    userCache[userId] = newUsername;
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

async function getAllTalkData(talkId) {
  const talkTitle = document.getElementById("talk-title");
  const talkArea = document.getElementById("talk-area");

  try {
    const roomSnapshot = await db.collection("KokoKengaku").doc(talkId).get();
    const roomData = roomSnapshot.data();
    talkTitle.textContent = roomData.title;

    db.collection("users_random").doc(myUserId).update({
      [`unreadCounts.${talkId}`]: 0
    }).catch(err => console.error("未読リセットエラー:", err));
    

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
        newTalk.innerHTML = "";

        for (const talkDoc of messageSnapshot.docs) {
          const messageData = talkDoc.data();
          const message = document.createElement("div");
          message.classList.add("message");

          const messageUser = document.createElement("p");
          const messageUserId = messageData.userId;
          let senderName = "不明なユーザー";
          let isAdmin = false;

          if (messageUserId) {
            if (!(messageUserId in userCache) || !(messageUserId in userAdminCache)) {
              const userSnapshot = await db.collection("users_random").doc(messageUserId).get();
    
              if (userSnapshot.exists) {
                const userData = userSnapshot.data();
                userCache[messageUserId] = userData.name || "名前未設定";
                userAdminCache[messageUserId] = userData.isAdmin || false;
              } else {
                userCache[messageUserId] = "不明なユーザー";
                userAdminCache[messageUserId] = false;
              }
            }
            senderName = userCache[messageUserId];
            isAdmin = userAdminCache[messageUserId];
          }

          let displayTime = "時間不明";
          if (messageData.time) {
            const dateObject = messageData.time.toDate();
            displayTime = formatDateTime(dateObject);
          }

          const readByList = messageData.readBy || [];
          if (messageData.userId !== myUserId && !readByList.includes(myUserId)) {
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

          const senderNameSpan = document.createElement("span");
          senderNameSpan.textContent = `${senderName} `;
          const displayTimeSpan = document.createElement("span");
          displayTimeSpan.textContent = `${displayTime} `;
          messageUser.classList.add("message-user");
          if (isAdmin) {
            senderNameSpan.classList.add("admin");
          }
          messageUser.appendChild(senderNameSpan);
          messageUser.appendChild(displayTimeSpan);
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
  const doc = parser.parseFromString(htmlString, 'text/html');
  const box = document.createDocumentFragment();
  const childNodes = Array.from(doc.body.childNodes);

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

async function addMessage(talkId) {
  const message = messageInput.value.trim();
  messageAddButton.disabled = true;
  messageAddButton.textContent = "送信中...";
  const user = auth.currentUser;
  const myUserId = user.email.split("@")[0];
  try {
    await db.collection("KokoKengaku")
      .doc(talkId)
      .collection("talk")
      .add({
        userId: myUserId,
        message: message,     
        readBy: [],
        time: firebase.firestore.FieldValue.serverTimestamp()
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

async function getMember(talkId) {
  const memberArea = document.getElementById("member-area");
  memberArea.innerHTML = "";
  try {
    const roomSnapshot = await db.collection("KokoKengaku").doc(talkId).get();
    if (!roomSnapshot.exists) return;
    
    const roomData = roomSnapshot.data();
    const memberUserIds = roomData.members || [];
    
    // 自分が管理者かどうかを判定
    const isMeAdmin = userAdminCache[myUserId] || false;

    for (const userId of memberUserIds) {
      let memberName = "不明なユーザー";
      let isAdmin = false;
      let lastCheckedTimeStr = "";

      // 毎回最新の確認日時を取得するため、自分が管理者の場合はドキュメントを直接取得
      if (isMeAdmin || !(userId in userCache) || !(userId in userAdminCache)) {   
        const userSnapshot = await db.collection("users_random").doc(userId).get();
    
        if (userSnapshot.exists) {
          const userData = userSnapshot.data();
          userCache[userId] = userData.name || "名前未設定";
          userAdminCache[userId] = userData.isAdmin || false;

          if (isMeAdmin && userData.lastChecked && userData.lastChecked[talkId]) {
            const dateObject = userData.lastChecked[talkId].toDate();
            lastCheckedTimeStr = formatDateTime(dateObject);
          }
        } else {
          userCache[userId] = "不明なユーザー";
          userAdminCache[userId] = false;
        }
      }

      memberName = userCache[userId];
      isAdmin = userAdminCache[userId];

      // フレキシブルに端寄せするために div を親要素にする
      const memberElement = document.createElement("div");
      memberElement.classList.add("member-item");
      if (isAdmin) memberElement.classList.add("admin");

      // 名前
      const nameSpan = document.createElement("span");
      nameSpan.classList.add("member-name");
      nameSpan.textContent = memberName;
      memberElement.appendChild(nameSpan);

      // 管理者かつデータがある場合のみ、右側に最終確認時間を追加
      if (isMeAdmin) {
        const timeSpan = document.createElement("span");
        timeSpan.classList.add("member-last-checked");
        timeSpan.textContent = lastCheckedTimeStr ? `最終チェック: ${lastCheckedTimeStr}` : "未確認";
        memberElement.appendChild(timeSpan);
      }

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
      lastChecked: {
        [talkId]: firebase.firestore.FieldValue.serverTimestamp()
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
    const talkId = getParmFromUrl("id");
    getMember(talkId); // モーダルを開くタイミングで最新を再取得
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
  readArea.innerHTML = "読み込み中...";
  readModal.classList.remove("hidden");

  const fragment = document.createDocumentFragment();

  for (const userId of readByList) {
    let name = "不明なユーザー";
    let isAdmin = false;
    
    try {
      if (!(userId in userCache) || !(userId in userAdminCache)) {   
        const userSnapshot = await db.collection("users_random").doc(userId).get();
    
        if (userSnapshot.exists) {
          const userData = userSnapshot.data();
          userCache[userId] = userData.name || "名前未設定";
          userAdminCache[userId] = userData.isAdmin || false;
        } else {
          userCache[userId] = "不明なユーザー";
          userAdminCache[userId] = false;
        }
      }

      name = userCache[userId];
      isAdmin = userAdminCache[userId];
    } catch (e) {
      console.error(e);
    }

    const p = document.createElement("p");
    p.textContent = name;
    if (isAdmin) p.classList.add("admin");
    fragment.appendChild(p);
  }

  readArea.innerHTML = "";
  readArea.appendChild(fragment);
}
