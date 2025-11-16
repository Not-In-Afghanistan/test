// Ensure Firebase is loaded and initialized
if (!window.firebase) {
  console.error("Firebase SDK not loaded.");
} else {
  (function initProfile() {
    const currentUsername = localStorage.getItem("currentUser");
    if (!currentUsername) {
      console.warn("No user found. Redirecting.");
      window.location.href = "./index.html";
      return;
    }

    const displayNameBox = document.getElementById("displayNameBox");
    const changeDisplayBtn = document.getElementById("changeDisplayBtn");
    const imgBox = document.querySelector("#img img");

    const usersRef = firebase.database().ref(`users/${currentUsername}`);

    // --- Banned words ---
    const bannedWords = ["fuck","shit","bitch","asshole","cunt","nigger","faggot","dick","cock","pussy",
      "nigga","slut","whore","bastard","penis","vagina","sex","rape","kill","suicide","cum",
      "boob","boobs","fag","retard","jerk","porn","horny","gay","lesbian","dildo"];

    function containsBadWord(str) {
      if (!str) return false;
      const s = str.toLowerCase();
      return bannedWords.some(w => s.includes(w));
    }

    // Load displayName
    usersRef.child("displayName").once("value").then(snap => {
      displayNameBox.textContent = snap.exists() ? snap.val() : currentUsername;
    });

    // Load PFP
    usersRef.child("pfpUrl").once("value").then(snap => {
      imgBox.src = snap.exists() ? snap.val() : "./images/default-pfp.png";
    });

    // ----- CREATE MODAL -----
    function createModal(title, placeholder, saveCallback, includeFilePicker = false) {
      const backdrop = document.createElement("div");
      backdrop.className = "kord-modal-backdrop";
      backdrop.style.display = "none";

      const modal = document.createElement("div");
      modal.className = "kord-modal";

      modal.innerHTML = `
        <h3>${title}</h3>
        <input id="kord-input" type="text" placeholder="${placeholder}" />
        ${includeFilePicker ? '<input type="file" id="fileInput" accept="image/*" style="margin-top:8px;">' : ""}
        <div style="display:flex; gap:8px; align-items:center; margin-top:8px;">
          <button class="kord-btn save-btn">Save</button>
          <button class="kord-btn cancel-btn">Cancel</button>
          <div id="kord-msg" style="flex:1;color:red;font-size:12px;"></div>
        </div>
      `;

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      const input = modal.querySelector("#kord-input");
      const fileInput = modal.querySelector("#fileInput");
      const saveBtn = modal.querySelector(".save-btn");
      const cancelBtn = modal.querySelector(".cancel-btn");
      const msg = modal.querySelector("#kord-msg");

      let selectedBase64 = null;

      // FILE → BASE64
      if (fileInput) {
        fileInput.addEventListener("change", () => {
          const file = fileInput.files[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = () => {
            selectedBase64 = reader.result; // data:image/...;base64,...
          };
          reader.readAsDataURL(file);
        });
      }

      function show(initialValue = "") {
        input.value = initialValue;
        selectedBase64 = null;
        msg.textContent = "";
        backdrop.style.display = "flex";
        input.focus();
      }

      function hide() {
        backdrop.style.display = "none";
      }

      saveBtn.addEventListener("click", () => {
        const val = input.value.trim();
        saveCallback({ val, base64: selectedBase64 }, msg, hide);
      });

      cancelBtn.addEventListener("click", hide);
      backdrop.addEventListener("click", e => { if (e.target === backdrop) hide(); });

      return { show, hide };
    }


    // ----- DISPLAY NAME MODAL -----
    const displayNameModal = createModal(
      "Change Display Name",
      "Enter new display name",
      ({ val }, msgEl, closeModal) => {
        const trimmed = val.trim();

        if (!trimmed) return msgEl.textContent = "Cannot be empty";
        if (containsBadWord(trimmed)) return msgEl.textContent = "Please avoid offensive words.";
        if (trimmed.length < 1) return msgEl.textContent = "Too short";
        if (trimmed.length > 15) return msgEl.textContent = "Too long";

        usersRef.child("displayName").set(trimmed)
          .then(() => {
            displayNameBox.textContent = trimmed;
            closeModal();
          })
          .catch(err => {
            msgEl.textContent = "Error saving name";
            console.error(err);
          });
      }
    );

    changeDisplayBtn.addEventListener("click", () => {
      usersRef.child("displayName").once("value")
        .then(snap => displayNameModal.show(snap.exists() ? snap.val() : ""));
    });


    // ------ PROFILE PICTURE MODAL (WITH UPLOAD) ------
    const pfpModal = createModal(
      "Change Profile Picture",
      "Enter image URL (optional)",
      ({ val, base64 }, msgEl, closeModal) => {
        let finalImage;

        if (base64) {
          finalImage = base64; // user uploaded a file
        } else if (val.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
          finalImage = val; // user typed a URL
        } else {
          msgEl.textContent = "Upload an image or enter a valid image URL";
          return;
        }

        usersRef.child("pfpUrl").set(finalImage)
          .then(() => {
            imgBox.src = finalImage;
            closeModal();
          })
          .catch(err => {
            msgEl.textContent = "Error saving image";
            console.error(err);
          });
      },
      true // include file picker
    );

    // Hover overlay
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

    overlay.addEventListener("click", () => {
      usersRef.child("pfpUrl").once("value")
        .then(snap => pfpModal.show(snap.exists() ? snap.val() : ""));
    });

  })();
}
