document.addEventListener("DOMContentLoaded", () => {
  const adsSkippedVal = document.getElementById("adsSkippedVal");
  const resetBtn = document.getElementById("resetBtn");

  // Function to load and render current count from storage
  const updateStats = () => {
    chrome.storage.local.get({ adsMutedCount: 0 }, (data) => {
      adsSkippedVal.textContent = data.adsMutedCount;
    });
  };

  // Initial load
  updateStats();

  // Reset count event listener
  resetBtn.addEventListener("click", () => {
    chrome.storage.local.set({ adsMutedCount: 0 }, () => {
      updateStats();
      // Simple feedback effect
      resetBtn.style.transform = "scale(0.95)";
      setTimeout(() => {
        resetBtn.style.transform = "scale(1)";
      }, 100);
    });
  });

  // Listen for storage changes to update UI in real-time
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.adsMutedCount) {
      adsSkippedVal.textContent = changes.adsMutedCount.newValue;
    }
  });
});
