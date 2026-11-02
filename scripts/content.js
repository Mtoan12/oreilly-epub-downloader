(function () {
  function getBookId() {
    const url = window.location.href;
    let m = url.match(/\/library\/view\/[^/]+\/([a-zA-Z0-9\-_]+)/);
    if (m) return m[1];
    m = url.match(/urn:orm:book:([a-zA-Z0-9\-_]+)/);
    if (m) return m[1];
    return null;
  }

  function getTocFromPage() {
    const chapters = [];
    const seen = new Set();
    try {
      const selectors = [
        'nav a[href*="/library/view/"]',
        '[data-testid="toc"] a',
        '.toc a',
        'ol a[href*="/library/view/"]',
        'ul a[href*="/library/view/"]',
        'a[href*="/library/view/"][href*="/ch"]',
        'a[href*="/library/view/"]'
      ];
      for (const sel of selectors) {
        const links = document.querySelectorAll(sel);
        links.forEach((a) => {
          const href = a.getAttribute("href");
          const title = (a.textContent || "").trim().slice(0, 200);
          if (!href || !title) return;
          if (href.startsWith("#") || href.startsWith("javascript:")) return;
          try {
            const abs = new URL(href, window.location.origin).href;
            if (!abs.includes("/library/view/")) return;
            if (seen.has(abs)) return;
            seen.add(abs);
            chapters.push({ title, url: abs, id: href });
          } catch (e) {}
        });
        if (chapters.length >= 5) break;
      }

      // __NEXT_DATA__ fallback
      if (chapters.length === 0) {
        const nextData = document.getElementById("__NEXT_DATA__");
        if (nextData) {
          try {
            const txt = nextData.textContent || "";
            const urls = txt.match(/\/library\/view\/[^"\\ ]+/g) || [];
            urls.forEach((u) => {
              const abs = "https://learning.oreilly.com" + u;
              if (!seen.has(abs)) {
                seen.add(abs);
                chapters.push({ title: u.split("/").pop().replace(/[-_]/g, " "), url: abs, id: u });
              }
            });
          } catch (e) {}
        }
      }
    } catch (e) {}
    return chapters.slice(0, 500);
  }

  chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === "detectBook") {
      const id = getBookId();
      sendResponse({ bookId: id, currentUrl: window.location.href, title: document.title });
    }
    if (req.action === "getPageToc") {
      const id = getBookId();
      const toc = getTocFromPage();
      sendResponse({ bookId: id, chapters: toc, currentUrl: window.location.href, title: document.title });
    }
  });
})();
