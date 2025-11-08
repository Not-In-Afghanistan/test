document.addEventListener("DOMContentLoaded", () => {
  const gifBtn = document.getElementById("gifBtn"); // Your GIF button
  const lockedBox = document.getElementById("locked");

  if (!gifBtn || !lockedBox) return; // Safety check

  gifBtn.addEventListener("click", () => {
    lockedBox.classList.toggle("show");
  });

  lockedBox.addEventListener("click", e => {
    if (e.target.tagName === "IMG") {
      const gifURL = e.target.src;
      console.log("Selected GIF:", gifURL);
      // 🔹 You can hook this up to your chat send function
      lockedBox.classList.remove("show"); // Hide the GIF picker
    }
  });
});
