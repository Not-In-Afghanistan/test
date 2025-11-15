document.addEventListener("DOMContentLoaded", () => {

  // --- FIREBASE CONFIG ---
  const firebaseConfig = {
    apiKey: "AIzaSyBGPFSP0e0oYqKqvJHLB5eGlX9mJ8aU09s",
authDomain: "test-da143.firebaseapp.com",
databaseURL: "https://test-da143-default-rtdb.firebaseio.com",
projectId: "test-da143",
storageBucket: "test-da143.appspot.com",
messagingSenderId: "58366480447",
appId: "1:58366480447:web:f3dd12850f09952b49688a",
measurementId: "G-T5HK7JTWHW"
  };

  // Initialize Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const currentUsername = localStorage.getItem("currentUser");
  if (!currentUsername) {
    alert("Not logged in!");
    return;
  }

  const usersRef = firebase.database().ref(`users/${currentUsername}`);

  const displayNameBox = document.getElementById("displayNameBox");
  const imgWrapper = document.getElementById("img");
  const imgBox = imgWrapper.querySelector("img");
  const changeBtn = document.getElementById("changeDisplayBtn");

  // Load display name
  usersRef.child("displayName").once("value").then(snap => {
    displayNameBox.textContent = snap.exists() ? snap.val() : currentUsername;
  });

  // Load profile picture
  usersRef.child("pfpUrl").once("value").then(snap => {
    imgBox.src = snap.exists() ? snap.val() : "./images/default-pfp.png";
  });

  // Hover overlay for changing PFP
  const overlay = document.createElement("div");
  overlay.textContent = "Change Image";
  overlay.style = `
    position:absolute; top:0; left:0;
    width:100%; height:100%;
    display:flex; align-items:center; justify-content:center;
    background:rgba(0,0,0,0.5);
    color:white; font-size:18px; border-radius:50%;
    opacity:0; transition:0.2s; cursor:pointer;
  `;
  imgWrapper.style.position = "relative";
  imgWrapper.appendChild(overlay);

  imgWrapper.addEventListener("mouseenter", () => overlay.style.opacity = "1");
  imgWrapper.addEventListener("mouseleave", () => overlay.style.opacity = "0");

  // File input for PFP
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  overlay.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async e => {
    const file = e.target.files[0];
    if (!file) return;

    const storageRef = firebase.storage().ref(`pfp/${currentUsername}`);
    const uploadTask = storageRef.put(file);

    uploadTask.on("state_changed", null, err => alert("Upload failed: " + err.message), async () => {
      const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
      await usersRef.update({ pfpUrl: downloadURL });
      imgBox.src = downloadURL;
      alert("Profile picture updated!");
    });
  });

  // Change display name modal
  changeBtn.addEventListener("click", () => {
    const newName = prompt("Enter new display name (max 10 chars):", displayNameBox.textContent);
    if (!newName) return;

    if (newName.length > 10) return alert("Too long!");
    usersRef.update({ displayName: newName });
    displayNameBox.textContent = newName;
  });

});
