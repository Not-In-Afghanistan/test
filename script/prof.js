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
    const trialsRef = firebase.database().ref(`freetrials/${currentUsername}`);
    const premiumRef = firebase.database().ref(`premium/${currentUsername}`);

    let trialsLeft = null;
    let trialsLoaded = false;
    let isPremium = false;

    // --- Load initial trials ---
    trialsRef.once('value')
      .then(snap => {
        trialsLeft = snap.exists() ? Number(snap.val()) : 2;
        trialsLoaded = true;
      })
      .catch(() => { trialsLeft = 2; trialsLoaded = true; });

    // --- UI Helpers ---
    function showTrialPopup(left) {
      const div = document.createElement("div");
      div.className = "trial-popup";
      div.style.cssText = `
        position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
        background:#222; padding:12px 20px; color:white; border-radius:12px;
        font-size:14px; z-index:999999; opacity:0; transition:0.2s;
      `;
      div.textContent = `Free trials left: ${left}`;
      document.body.appendChild(div);
      requestAnimationFrame(() => div.style.opacity = "1");
      setTimeout(() => { div.style.opacity = "0"; setTimeout(() => div.remove(), 300); }, 1800);
    }

    function showTrialLock() {
      const bg = document.createElement("div");
      bg.className = "trial-lock";
      bg.style.cssText = `
        position:fixed; top:0; left:0; width:100vw; height:100vh;
        background:rgba(0,0,0,0.88); z-index:99999999;
        display:flex; align-items:center; justify-content:center; color:white;
        padding:24px; text-align:center;
      `;
      bg.innerHTML = `
        <div>
          <h1 style="margin-bottom:8px">You have reached your free trial limit</h1>
          <p style="opacity:0.85">Upgrade to continue.</p>
        </div>`;
      document.body.appendChild(bg);
    }

    function loadPremiumStatus() {
      return premiumRef.once("value").then(snap => {
        isPremium = snap.exists();
        return isPremium;
      });
    }

    function useTrial() {
      return new Promise((resolve, reject) => {
        loadPremiumStatus().then(() => {
          if (isPremium) return resolve("premium");
          if (!trialsLoaded) return setTimeout(() => useTrial().then(resolve).catch(reject), 100);
          if (trialsLeft <= 0) { showTrialLock(); return reject(new Error("No trials left")); }

          trialsLeft--;
          trialsRef.set(trialsLeft)
            .then(() => { showTrialPopup(trialsLeft); resolve(trialsLeft); })
            .catch(() => { trialsLeft++; reject(new Error("Failed to use trial")); });
        });
      });
    }

    const bannedWords = ["fuck","shit","bitch","asshole","cunt","nigger","faggot","dick","cock","pussy",
      "nigga","slut","whore","bastard","penis","vagina","sex","rape","kill","suicide","cum",
      "boob","boobs","fag","retard","jerk","porn","horny","gay","lesbian","femboy","ass","kkk","dildo"];
    function containsBadWord(str) {
      if (!str) return false;
      const s = str.toLowerCase();
      return bannedWords.some(w => s.includes(w));
    }

    // --- Load displayName & PFP ---
    usersRef.child("displayName").once("value")
      .then(snap => displayNameBox.textContent = snap.exists() ? snap.val() : currentUsername);

    usersRef.child("pfpUrl").once("value")
      .then(snap => imgBox.src = snap.exists() ? snap.val() : "./images/default-pfp.png");

    // ----- Modal Factory -----
    function createModal(title, placeholder, saveCallback, includeFilePicker = false) {
      const backdrop = document.createElement("div");
      backdrop.className = "kord-modal-backdrop";
      backdrop.style.display = "none";

      const modal = document.createElement("div");
      modal.className = "kord-modal";

      modal.innerHTML = `
        <h3>${title}</h3>
        <input id="kord-input" type="text" placeholder="${placeholder}" style="display:none;">
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

      if (fileInput) {
        fileInput.addEventListener("change", () => {
          const file = fileInput.files[0];
          if (!file) return;

          if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) {
            alert("GIFs are not allowed for profile pictures.");
            fileInput.value = "";
            selectedBase64 = null;
            return;
          }

          const reader = new FileReader();
          reader.onload = () => { selectedBase64 = reader.result; };
          reader.readAsDataURL(file);
        });
      }

      function show(initialValue = "") {
        input.value = initialValue;
        selectedBase64 = null;
        msg.textContent = "";
        input.style.display = includeFilePicker ? "none" : "block";
        backdrop.style.display = "flex";
      }

      function hide() { backdrop.style.display = "none"; }

      saveBtn.addEventListener("click", () => {
        saveCallback({ val: input.value, base64: selectedBase64 }, msg, hide);
      });

      cancelBtn.addEventListener("click", hide);
      backdrop.addEventListener("click", e => { if (e.target === backdrop) hide(); });

      return { show, hide };
    }

    // ----- Display Name Modal -----
    const displayNameModal = createModal(
      "Change Display Name",
      "",
      ({ val }, msgEl, closeModal) => {
        const trimmed = val.trim();
        if (!trimmed) return msgEl.textContent = "Cannot be empty";
        if (containsBadWord(trimmed)) return msgEl.textContent = "Please avoid offensive words.";
        if (trimmed.length < 1) return msgEl.textContent = "Too short";
        if (trimmed.length > 13) return msgEl.textContent = "Too long";

        useTrial()
          .then(() => usersRef.child("displayName").set(trimmed))
          .then(() => { displayNameBox.textContent = trimmed; closeModal(); })
          .catch(err => { if (err.message !== "No trials left") msgEl.textContent = "Failed to save."; });
      }
    );

    changeDisplayBtn.addEventListener("click", () => {
      usersRef.child("displayName").once("value")
        .then(snap => displayNameModal.show(snap.exists() ? snap.val() : ""));
    });

    // ----- PFP Modal -----
    const pfpModal = createModal(
      "Change Profile Picture",
      "",
      ({ base64 }, msgEl, closeModal) => {
        if (!base64) return msgEl.textContent = "Please upload an image.";
        if (base64.startsWith("data:image/gif")) return msgEl.textContent = "GIFs are not allowed.";

        useTrial()
          .then(() => usersRef.child("pfpUrl").set(base64))
          .then(() => { imgBox.src = base64; closeModal(); })
          .catch(err => { if (err.message !== "No trials left") msgEl.textContent = "Failed to save."; });
      },
      true
    );

    // ----- Hover Overlay -----
    const overlay = document.createElement("div");
    overlay.textContent = "Change Image";
    overlay.style.cssText = `
      position:absolute; top:0; left:0; width:100%; height:100%;
      display:flex; align-items:center; justify-content:center;
      background:rgba(0,0,0,0.5); color:white; font-size:18px;
      border-radius:50%; opacity:0; transition:0.2s; cursor:pointer;
    `;
    const imgWrapper = document.getElementById("img");
    imgWrapper.style.position = "relative";
    imgWrapper.appendChild(overlay);

    imgWrapper.addEventListener("mouseenter", () => overlay.style.opacity = "1");
    imgWrapper.addEventListener("mouseleave", () => overlay.style.opacity = "0");

    overlay.addEventListener("click", () => {
      displayNameModal.hide(); // hide display name input if visible
      pfpModal.show();
    });




    /* === RING PICKER (FINAL) ===
   Paste INSIDE initProfile() (same place as described previously).
   Uses existing variables: currentUsername, usersRef, imgWrapper, imgBox, loadPremiumStatus(), isPremium
   Stores: users/${currentUsername}/ringcover  => value: "3.png" (filename)
*/

(function initRingsFinal() {
  const ringContainer = document.querySelector(".ringContainer");
  if (!ringContainer) return;

  // ensure profile ring overlay exists
  let profileRing = document.getElementById("profileRing");
  if (!profileRing) {
    profileRing = document.createElement("img");
    profileRing.id = "profileRing";
    profileRing.style.cssText = `
      position:absolute;
      top:0; left:0; width:100%; height:100%;
      pointer-events:none;
      object-fit:contain;
      border-radius:0px;
      z-index:2;
      scale: 1.07;
      display:none;
    `;
    imgWrapper.appendChild(profileRing);
  }

  // helper: get filename (with extension) from <img src=".../1.png">
  function filenameFromImg(imgEl) {
    if (!imgEl) return null;
    const src = imgEl.getAttribute("src") || "";
    const file = src.split("/").pop().split("?")[0]; // e.g. "1.png"
    return file || null;
  }

  // apply UI to mark which one is equipped
  function applyEquippedUI(equippedFilename) {
    const opts = ringContainer.querySelectorAll(".ringOpt");
    opts.forEach((opt, index) => {
      const btn = opt.querySelector(".chooseButton");
      const img = opt.querySelector("img");
      const ov = opt.querySelector(".ovLay");

      const fname = filenameFromImg(img);
      if (!btn) return;

      if (fname && fname === equippedFilename) {
        btn.textContent = "Equipped";
        btn.disabled = true;
        btn.style.opacity = "0.85";
        opt.style.boxShadow = "0 0 0 3px rgba(255,255,255,0.06), 0 8px 20px rgba(0,0,0,0.6)";
        if (ov) ov.style.display = "none";
      } else {
        btn.textContent = "Equip";
        btn.disabled = false;
        btn.style.opacity = "1";
        opt.style.boxShadow = "none";

        // overlay visibility:
        // index 0 (first ring) is free always -> hide overlay
        if (ov) {
          if (index === 0) {
            ov.style.display = "none";
          } else {
            // for rings 2..N: hide overlay if premium, show if not
            ov.style.display = isPremium ? "none" : "";
          }
        }
      }
    });
  }

  // update profile preview overlay
  function updateProfilePreview(filename) {
    if (!filename) {
      profileRing.style.display = "none";
      profileRing.src = "";
      return;
    }
    // expected local path - adjust if your files use a different extension or folder
    profileRing.src = `./profileRings/${filename}`;
    profileRing.style.display = "block";
  }

  // save selection to Firebase (only filename)
  function saveRingToFirebase(filename) {
    if (!filename) return Promise.reject(new Error("No filename"));
    return usersRef.child("ringcover").set(filename);
  }

  // equip handler (no trial usage)
  function onEquipClick(e) {
    const btn = e.currentTarget;
    const opt = btn.closest(".ringOpt");
    if (!opt) return;

    // find filename
    const img = opt.querySelector("img");
    const filename = filenameFromImg(img);
    if (!filename) {
      alert("Failed to identify ring.");
      return;
    }

    // determine index to check free vs premium
    const allOpts = Array.from(ringContainer.querySelectorAll(".ringOpt"));
    const idx = allOpts.indexOf(opt);

    // If this is a premium ring (index > 0) and user is not premium => block and show prompt
    if (idx > 0 && !isPremium) {
      const popup = document.createElement("div");
      popup.style.cssText = `
        position:fixed; left:50%; top:20%; transform:translateX(-50%);
        background:#222; color:#fff; padding:12px 18px; border-radius:10px;
        z-index:999999; font-size:14px; box-shadow:0 10px 30px rgba(0,0,0,0.6);
      `;
      popup.textContent = "This ring is premium only. Upgrade to equip it.";
      document.body.appendChild(popup);
      setTimeout(() => { popup.style.opacity = "0"; setTimeout(() => popup.remove(), 250); }, 1600);
      return;
    }

    // proceed to save
    saveRingToFirebase(filename)
      .then(() => {
        applyEquippedUI(filename);
        updateProfilePreview(filename);
      })
      .catch(err => {
        console.error("Failed to save ringcover:", err);
        alert("Failed to equip ring. Try again.");
      });
  }

  // overlay click: if not premium show info; if premium do nothing
  function onOverlayClick(e) {
    if (isPremium) return;
    const popup = document.createElement("div");
    popup.style.cssText = `
      position:fixed; left:50%; top:20%; transform:translateX(-50%);
      background:#222; color:#fff; padding:12px 18px; border-radius:10px;
      z-index:999999; font-size:14px; box-shadow:0 10px 30px rgba(0,0,0,0.6);
    `;
    popup.textContent = "Premium only. Upgrade to unlock more rings.";
    document.body.appendChild(popup);
    setTimeout(() => { popup.style.opacity = "0"; setTimeout(() => popup.remove(), 250); }, 1600);
  }

  // wire up buttons + overlay events
  function wireEvents() {
    const opts = ringContainer.querySelectorAll(".ringOpt");
    opts.forEach((opt, index) => {
      const btn = opt.querySelector(".chooseButton");
      const ov = opt.querySelector(".ovLay");

      if (btn) {
        // remove previous handlers safe-guard
        btn.removeEventListener("click", onEquipClick);
        btn.addEventListener("click", onEquipClick);
      }
      if (ov) {
        ov.removeEventListener("click", onOverlayClick);
        ov.addEventListener("click", onOverlayClick);
      }

      // Ensure first ring's overlay is hidden always
      if (index === 0 && ov) ov.style.display = "none";
    });
  }

  // load saved ring from firebase and apply UI
  function loadSavedRing() {
    usersRef.child("ringcover").once("value")
      .then(snap => {
        const saved = snap.exists() ? snap.val() : null; // e.g. "1.png"
        applyEquippedUI(saved);
        updateProfilePreview(saved);
      })
      .catch(err => {
        console.warn("Couldn't load saved ringcover:", err);
        applyEquippedUI(null);
        updateProfilePreview(null);
      });
  }

  // initial flow: load premium status, wire events, then load saved ring
  loadPremiumStatus()
    .then(() => {
      // isPremium should be set by your loadPremiumStatus()
      wireEvents();
      loadSavedRing();

      // Also update overlays visibility right away based on premium
      const opts = ringContainer.querySelectorAll(".ringOpt");
      opts.forEach((opt, idx) => {
        const ov = opt.querySelector(".ovLay");
        if (!ov) return;
        if (idx === 0) ov.style.display = "none";
        else ov.style.display = isPremium ? "none" : "";
      });
    })
    .catch(err => {
      console.warn("Failed reading premium status for rings:", err);
      wireEvents();
      loadSavedRing();
    });

})(); // end initRingsFinal

  })();
}
