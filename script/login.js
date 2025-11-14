// Firebase config
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

// Initialize Firebase only if not already initialized
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

document.getElementById("login").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const error = document.getElementById("error");
  error.style.display = "none";

  try {
    const snapshot = await db.ref("users/" + username).get();

    if (!snapshot.exists() || snapshot.val().password !== password) {
      error.textContent = "Invalid username or password.";
      error.style.display = "block";
      return;
    }

    const userData = snapshot.val();

    // Store login info
    localStorage.setItem("currentUser", username);
    localStorage.setItem("displayName", userData.displayName);

    console.log(`Logged in as ${username}`);

    // Redirect to dashboard
    window.location.href = "./dash.html";

  } catch (err) {
    console.error("Firebase login error:", err);
    error.textContent = "Error connecting to database. Please try again.";
    error.style.display = "block";
  }
});
