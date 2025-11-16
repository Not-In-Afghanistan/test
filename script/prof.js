// Ensure Firebase is loaded and initialized
if (!window.firebase) {
  console.error("Firebase SDK not loaded.");
} else {
  (function initProfile() {
    const currentUsername = localStorage.getItem("currentUser");
    if (!currentUsername) {
      console.warn("No user found. Redirecting to login.");
      window.location.href = "./index.html";
      return;
    }

    const displayNameBox = document.getElementById("displayNameBox");
    const changeDisplayBtn = document.getElementById("changeDisplayBtn");
    const imgBox = document.querySelector("#img img");

    const usersRef = firebase.database().ref(`users/${currentUsername}`);

    // --- Banned words list ---
    const bannedWords = ["fuck","shit","bitch","asshole","cunt","nigger","faggot","dick","cock","pussy",
      "nigga","slut","whore","bastard","penis","vagina","sex","rape","kill","suicide","cum",
      "boob","boobs","fag","retard","jerk","porn","horny","gay","lesbian","dildo"];

    function containsBadWord(str) {
      if (!str) return false;
      const s = str.toLowerCase();
      return bannedWords.some(w => s.includes(w));
    }

    // --- Load current displayName and PFP ---
    usersRef.child("displayName").once("value").then(snap => {
      displayNameBox.textContent = snap.exists() ? snap.val() : currentUsername;
    });

    usersRef.child("pfpUrl").once("value").then(snap => {
      imgBox.src = snap.exists() ? snap.val() : "./images/default-pfp.png";
    });

    // --- CREATE MODAL FUNCTION ---
    function createModal(title, placeholder, saveCallback) {
      const backdrop = document.createElement("div");
      backdrop.className = "kord-modal-backdrop";
      backdrop.style.display = "none";

      const modal = document.createElement("div");
      modal.className = "kord-modal";
      modal.innerHTML = `
        <h3>${title}</h3>
        <input id="kord-input" type="text" placeholder="${placeholder}" />
        <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
          <button class="kord-btn save-btn">Save</button>
          <button class="kord-btn cancel-btn">Cancel</button>
          <div id="kord-msg" style="flex:1;color:red;font-size:12px;"></div>
        </div>
      `;
      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      const input = modal.querySelector("#kord-input");
      const saveBtn = modal.querySelector(".save-btn");
      const cancelBtn = modal.querySelector(".cancel-btn");
      const msg = modal.querySelector("#kord-msg");

      function show(initialValue = "") {
        input.value = initialValue;
        msg.textContent = "";
        backdrop.style.display = "flex";
        input.focus();
      }
      function hide() {
        backdrop.style.display = "none";
      }

      saveBtn.addEventListener("click", () => {
        const val = input.value.trim();
        if (!val) {
          msg.textContent = "Cannot be empty";
          return;
        }
        // --- Check for bad words ---
        if (containsBadWord(val)) {
          msg.textContent = "Please avoid offensive words.";
          return;
        }
        saveCallback(val, msg, hide);
      });

      cancelBtn.addEventListener("click", hide);
      backdrop.addEventListener("click", e => { if (e.target === backdrop) hide(); });

      return { show, hide, input, msg };
    }

// --- Display Name Modal ---
const displayNameModal = createModal(
  "Change Display Name",
  "Enter new display name",
  (val, msgEl, closeModal) => {
    const trimmed = val.trim();

    // --- Validation ---
    if (!trimmed) {
      msgEl.textContent = "Cannot be empty";
      return;
    }
    if (containsBadWord(trimmed)) {
      msgEl.textContent = "Please avoid offensive words.";
      return;
    }
    if (trimmed.length < 1) {
      msgEl.textContent = "Display name too short (min 3 chars)";
      return;
    }
    if (trimmed.length > 15) {
      msgEl.textContent = "Display name too long (max 15 chars)";
      return;
    }

    // --- Save to Firebase ---
    usersRef.child("displayName").set(trimmed)
      .then(() => {
        displayNameBox.textContent = trimmed;
        closeModal();
      })
      .catch(err => {
        msgEl.textContent = "Error saving display name";
        console.error(err);
      });
  }
);


    changeDisplayBtn.addEventListener("click", () => {
      usersRef.child("displayName").once("value")
        .then(snap => {
          const current = snap.exists() ? snap.val() : "";
          displayNameModal.show(current);
        });
    });

    // --- PFP Modal ---
    const overlay = document.createElement("div");
    overlay.textContent = "Change Image";
    overlay.style = `
      position:absolute; top:0; left:0;
      width:51vh; height:51vh;
      display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.5);
      color:white; font-size:18px;
      border-radius:50%; margin:2vw;
      opacity:0; transition:0.2s; cursor:pointer;
    `;
    const imgWrapper = document.getElementById("img");
    imgWrapper.style.position = "relative";
    imgWrapper.appendChild(overlay);

    imgWrapper.addEventListener("mouseenter", () => overlay.style.opacity = "1");
    imgWrapper.addEventListener("mouseleave", () => overlay.style.opacity = "0");

    const pfpModal = createModal(
      "Change Profile Picture",
      "Enter image URL",
      (val, msgEl, closeModal) => {
        if (!val.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
          msgEl.textContent = "Enter a valid image URL";
          return;
        }
        usersRef.child("pfpUrl").set(val)
          .then(() => {
            imgBox.src = val;
            closeModal();
          })
          .catch(err => {
            msgEl.textContent = "Error saving profile picture";
            console.error(err);
          });
      }
    );

    overlay.addEventListener("click", () => {
      usersRef.child("pfpUrl").once("value")
        .then(snap => pfpModal.show(snap.exists() ? snap.val() : ""));
    });

  })();
}
