// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "AD_SKIPPED") {
    // Safely increment ads skipped count using chrome.storage.local
    chrome.storage.local.get({ adsMutedCount: 0 }, (data) => {
      const newCount = data.adsMutedCount + 1;
      chrome.storage.local.set({ adsMutedCount: newCount }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error updating ad muted count:", chrome.runtime.lastError);
        } else {
          console.log(`Ad skipped successfully. Total ads skipped: ${newCount}`);
        }
      });
    });
    sendResponse({ status: "success" });
  }
  return true; // Keep message channel open for asynchronous response
});
