chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "downloadEpub") {
    chrome.downloads.download({
      url: req.url,
      filename: req.filename,
      saveAs: true
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId });
      }
    });
    return true;
  }
});
