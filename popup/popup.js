document.addEventListener("DOMContentLoaded", async () => {
  const loadingEl = document.getElementById("loading");
  const notFoundEl = document.getElementById("not-found");
  const mainGridEl = document.getElementById("main-grid");
  const progressContainerEl = document.getElementById("progress-container");
  const progressBarEl = document.getElementById("progress-bar");
  const progressTextEl = document.getElementById("progress-text");

  const bookCoverEl = document.getElementById("book-cover");
  const bookTitleEl = document.getElementById("book-title");
  const bookAuthorsEl = document.getElementById("book-authors");
  const chapterCountEl = document.getElementById("chapter-count");

  const btnDownload = document.getElementById("btn-download");
  const btnLabel = document.getElementById("btn-label");
  const btnRetry = document.getElementById("btn-retry");
  const btnClose = document.getElementById("btn-close");
  const optImages = document.getElementById("opt-images");
  const optDelay = document.getElementById("opt-delay");

  let currentBook = null;

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      window.close();
    });
  }

  function updateProgress(text, percent) {
    progressContainerEl.classList.remove("hidden");
    if (typeof percent === "number") {
      progressBarEl.style.width = Math.min(100, Math.max(0, percent)) + "%";
    }
    if (text) {
      progressTextEl.textContent = text;
    }
  }

  async function getActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs.length ? tabs[0] : null;
  }

  async function detectBook() {
    loadingEl.classList.remove("hidden");
    notFoundEl.classList.add("hidden");
    mainGridEl.classList.add("hidden");
    btnRetry.classList.add("hidden");
    progressContainerEl.classList.add("hidden");

    try {
      const tab = await getActiveTab();
      if (!tab || !tab.url) throw new Error("No active tab");

      let bookId = OreillyAPI.extractBookIdFromUrl(tab.url);

      if (!bookId) {
        try {
          const res = await chrome.tabs.sendMessage(tab.id, { action: "detectBook" });
          if (res && res.bookId) bookId = res.bookId;
        } catch (e) {}
      }

      if (!bookId) {
        loadingEl.classList.add("hidden");
        notFoundEl.classList.remove("hidden");
        return;
      }

      updateProgress("Fetching book info from O'Reilly...", 10);
      loadingEl.classList.remove("hidden");

      currentBook = await OreillyAPI.getBookInfo(bookId);

      if (!currentBook.chapters || currentBook.chapters.length === 0) {
        try {
          updateProgress("Extracting table of contents from web reader...", 30);
          const tocRes = await chrome.tabs.sendMessage(tab.id, { action: "getPageToc" });
          if (tocRes && tocRes.chapters && tocRes.chapters.length > 0) {
            currentBook.chapters = tocRes.chapters;
          }
        } catch (e) {
          console.warn("Page TOC fallback failed", e);
        }
      }

      bookTitleEl.textContent = currentBook.title || "Untitled Book";
      bookAuthorsEl.textContent = currentBook.authors || "O'Reilly Media";
      chapterCountEl.textContent = (currentBook.chapters ? currentBook.chapters.length : 0);

      if (currentBook.cover) {
        bookCoverEl.src = currentBook.cover;
        bookCoverEl.style.display = "block";
      } else {
        bookCoverEl.style.display = "none";
      }

      loadingEl.classList.add("hidden");
      progressContainerEl.classList.add("hidden");
      mainGridEl.classList.remove("hidden");
      btnDownload.disabled = !(currentBook.chapters && currentBook.chapters.length > 0);
    } catch (err) {
      console.error(err);
      loadingEl.classList.add("hidden");
      notFoundEl.classList.remove("hidden");
      btnRetry.classList.remove("hidden");
    }
  }

  async function startDownload() {
    if (!currentBook || !currentBook.chapters || currentBook.chapters.length === 0) return;

    btnDownload.disabled = true;
    updateProgress("Preparing download...", 0);

    const downloadImages = optImages.checked;
    const delayMs = parseInt(optDelay.value, 10) || 500;
    const chapters = currentBook.chapters;
    const total = chapters.length;
    const chaptersData = [];
    const images = {};
    const imgUrlMap = new Map();

    try {
      // 1. Fetch cover image if available
      if (currentBook.cover) {
        try {
          updateProgress("Downloading cover image...", 2);
          const buf = await EpubBuilder.fetchImageAsArrayBuffer(currentBook.cover);
          currentBook.coverData = buf;
          currentBook.coverExt = currentBook.cover.includes(".png") ? ".png" : ".jpg";
        } catch (e) {
          console.warn("Cover image failed to load", e);
        }
      }

      // 2. Fetch all chapters
      for (let i = 0; i < total; i++) {
        const ch = chapters[i];
        const pct = Math.floor(5 + ((i + 1) / total) * 70);
        updateProgress(`Downloading chapter ${i + 1}/${total}: ${ch.title}`, pct);

        try {
          const rawHtml = await OreillyAPI.getChapterHtml(ch.url);
          const { bodyHtml, doc } = OreillyAPI.extractMainContent(rawHtml, ch.url);

          let processedBody = bodyHtml;

          // Collect images if enabled
          if (downloadImages && doc) {
            const imgEls = doc.querySelectorAll("img");
            for (const img of imgEls) {
              const src = img.getAttribute("src") || img.getAttribute("data-src");
              if (!src || src.startsWith("data:")) continue;

              let absUrl;
              try { absUrl = new URL(src, ch.url).href; } catch (e) { continue; }

              let localName;
              if (imgUrlMap.has(absUrl)) {
                localName = imgUrlMap.get(absUrl);
              } else {
                const ext = absUrl.includes(".png") ? ".png" : (absUrl.includes(".gif") ? ".gif" : (absUrl.includes(".svg") ? ".svg" : ".jpg"));
                localName = `img_${imgUrlMap.size + 1}${ext}`;
                imgUrlMap.set(absUrl, localName);
              }

              // Replace in processed HTML
              processedBody = processedBody.split(src).join(`../images/${localName}`);
            }
          }

          chaptersData.push({ title: ch.title, body: processedBody });
        } catch (err) {
          console.error(`Error loading chapter ${i + 1}:`, err);
          chaptersData.push({
            title: ch.title,
            body: `<p><em>Failed to download chapter content (${err.message}).</em></p>`
          });
        }

        if (delayMs > 0 && i < total - 1) {
          await OreillyAPI.delay(delayMs);
        }
      }

      // 3. Download collected images
      if (downloadImages && imgUrlMap.size > 0) {
        let imgIndex = 0;
        const totalImages = imgUrlMap.size;
        for (const [url, fname] of imgUrlMap.entries()) {
          imgIndex++;
          updateProgress(`Downloading image ${imgIndex}/${totalImages}...`, 75 + Math.floor((imgIndex / totalImages) * 15));
          try {
            const buf = await EpubBuilder.fetchImageAsArrayBuffer(url);
            images[fname] = buf;
          } catch (e) {
            console.warn("Failed to download image", url, e);
          }
          if (imgIndex % 5 === 0) await OreillyAPI.delay(100);
        }
      }

      // 4. Build EPUB
      updateProgress("Packaging EPUB file...", 92);
      const blob = await EpubBuilder.buildEpub(currentBook, chaptersData, images, (msg, pct) => {
        updateProgress(msg, pct);
      });

      // 5. Trigger download
      updateProgress("Completed! Saving file...", 100);
      const cleanTitle = (currentBook.title || "book").replace(/[/\\?%*:|"<>]/g, "_").trim();
      const filename = `${cleanTitle}.epub`;
      const blobUrl = URL.createObjectURL(blob);

      chrome.runtime.sendMessage({
        action: "downloadEpub",
        url: blobUrl,
        filename: filename
      }, (res) => {
        if (chrome.runtime.lastError || (res && !res.success)) {
          // Fallback direct download via anchor
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        btnDownload.disabled = false;
        if (btnLabel) btnLabel.textContent = "Download Again";
      });

    } catch (err) {
      console.error(err);
      updateProgress(`Error: ${err.message}`, 0);
      btnDownload.disabled = false;
      btnRetry.classList.remove("hidden");
    }
  }

  btnDownload.addEventListener("click", startDownload);
  btnRetry.addEventListener("click", detectBook);

  detectBook();
});
