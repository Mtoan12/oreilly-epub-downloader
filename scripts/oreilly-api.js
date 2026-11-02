(function (global) {
  const BASE = "https://learning.oreilly.com";
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  function extractBookIdFromUrl(url) {
    if (!url) return null;
    let m = url.match(/\/library\/view\/[^/]+\/([a-zA-Z0-9\-_]+)/);
    if (m) return m[1];
    m = url.match(/urn:orm:book:([a-zA-Z0-9\-_]+)/);
    if (m) return m[1];
    m = url.match(/[?&](book|id|isbn)=([a-zA-Z0-9\-_]+)/);
    if (m) return m[2];
    return null;
  }

  async function fetchJson(url) {
    const res = await fetch(url, { credentials: "include", headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
    return res.json();
  }

  // Flatten recursive tree structure from TOC
  function flattenToc(items, chapters, seen) {
    if (!items) return;
    const list = Array.isArray(items) ? items : (items.items || items.children || items.results || []);
    for (const item of list) {
      if (typeof item === "string") {
        const u = new URL(item, BASE).href;
        if (!seen.has(u)) {
          seen.add(u);
          chapters.push({ title: "Chapter " + (chapters.length + 1), url: u, id: "ch" + chapters.length });
        }
      } else if (item && typeof item === "object") {
        const rawUrl = item.url || item.href || item.link || item.content_url || item.file || item.web_url;
        const title = (item.title || item.label || item.name || "").trim();
        if (rawUrl) {
          const u = new URL(rawUrl, BASE).href;
          if (!seen.has(u)) {
            seen.add(u);
            chapters.push({
              title: title || ("Chapter " + (chapters.length + 1)),
              url: u,
              id: item.id || item.slug || ("ch" + chapters.length)
            });
          }
        }
        if (item.children || item.items || item.subchapters) {
          flattenToc(item.children || item.items || item.subchapters, chapters, seen);
        }
      }
    }
  }

  // Fetch paginated chapters from /api/v1/book/{id}/chapter/
  async function fetchPaginatedChapters(url) {
    const chapters = [];
    const seen = new Set();
    let nextUrl = url;
    let page = 0;
    while (nextUrl && page < 50) {
      page++;
      try {
        const json = await fetchJson(nextUrl);
        flattenToc(json.results || json.items || json, chapters, seen);
        nextUrl = json.next ? new URL(json.next, BASE).href : null;
      } catch (e) {
        break;
      }
    }
    return chapters;
  }

  async function getChaptersForBook(bookId, bookJson) {
    const chapters = [];
    const seen = new Set();

    // 1. Direct array in bookJson
    if (bookJson) {
      if (Array.isArray(bookJson.chapters)) {
        flattenToc(bookJson.chapters, chapters, seen);
      } else if (typeof bookJson.chapters === "string") {
        const list = await fetchPaginatedChapters(new URL(bookJson.chapters, BASE).href);
        list.forEach((c) => { if (!seen.has(c.url)) { seen.add(c.url); chapters.push(c); } });
      }

      if (Array.isArray(bookJson.spine)) {
        flattenToc(bookJson.spine, chapters, seen);
      }

      if (Array.isArray(bookJson.table_of_contents)) {
        flattenToc(bookJson.table_of_contents, chapters, seen);
      } else if (typeof bookJson.table_of_contents === "string") {
        try {
          const tocJson = await fetchJson(new URL(bookJson.table_of_contents, BASE).href);
          flattenToc(tocJson, chapters, seen);
        } catch (e) {}
      }

      if (Array.isArray(bookJson.toc)) {
        flattenToc(bookJson.toc, chapters, seen);
      } else if (typeof bookJson.toc === "string") {
        try {
          const tocJson = await fetchJson(new URL(bookJson.toc, BASE).href);
          flattenToc(tocJson, chapters, seen);
        } catch (e) {}
      }
    }

    if (chapters.length > 0) return chapters;

    // 2. Try O'Reilly API endpoints explicitly
    const candidates = [
      BASE + "/api/v1/book/" + encodeURIComponent(bookId) + "/chapter/?page_size=500",
      BASE + "/api/v1/book/" + encodeURIComponent(bookId) + "/toc/",
      BASE + "/api/v2/epubs/urn:orm:book:" + encodeURIComponent(bookId) + "/spine/",
      BASE + "/api/v2/epubs/urn:orm:book:" + encodeURIComponent(bookId) + "/toc/",
      BASE + "/api/v1/book/" + encodeURIComponent(bookId) + "/chapters/"
    ];

    for (const u of candidates) {
      try {
        if (u.includes("/chapter/")) {
          const list = await fetchPaginatedChapters(u);
          if (list.length > 0) return list;
        } else {
          const j = await fetchJson(u);
          flattenToc(j, chapters, seen);
          if (chapters.length > 0) return chapters;
        }
      } catch (e) {}
    }

    return chapters;
  }

  async function getBookInfo(bookId) {
    const urls = [
      BASE + "/api/v1/book/" + encodeURIComponent(bookId) + "/?format=json",
      BASE + "/api/v1/book/" + encodeURIComponent(bookId) + "/",
      BASE + "/api/v2/epubs/urn:orm:book:" + encodeURIComponent(bookId) + "/"
    ];

    let bookJson = null;
    for (const u of urls) {
      try {
        bookJson = await fetchJson(u);
        if (bookJson) break;
      } catch (e) {}
    }

    if (!bookJson) {
      bookJson = { title: "O'Reilly Book (" + bookId + ")" };
    }

    const title = bookJson.title || bookJson.name || "oreilly-book-" + bookId;
    const creators = bookJson.authors || bookJson.creators || bookJson.publisher || [];
    let authors = "O'Reilly Media";
    if (Array.isArray(creators)) {
      authors = creators.map((a) => (typeof a === "string" ? a : (a.name || a.full_name || "")).filter(Boolean).join(", ")) || authors;
    } else if (typeof creators === "string") {
      authors = creators;
    }

    const cover = bookJson.cover || bookJson.cover_url || bookJson.image || (bookJson.images && bookJson.images.cover);
    const publisher = bookJson.publisher_name || bookJson.publisher || "O'Reilly Media";
    const language = bookJson.language || "en";
    const description = bookJson.description || "";

    const chapters = await getChaptersForBook(bookId, bookJson);

    return {
      id: bookId,
      title,
      authors,
      cover: cover ? new URL(cover, BASE).href : null,
      publisher,
      language,
      description,
      raw: bookJson,
      chapters
    };
  }

  async function getChapterHtml(chapterUrl) {
    const res = await fetch(chapterUrl, { credentials: "include", headers: { "Accept": "text/html,application/xhtml+xml,application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json")) {
      const j = await res.json();
      return j.content || j.body || j.html || j.text || "";
    }
    return await res.text();
  }

  function extractMainContent(html, pageUrl) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    ["script", "style", "nav", "header.tool", ".site-header", ".reader-controls", "button"].forEach((s) => {
      doc.querySelectorAll(s).forEach((n) => n.remove());
    });
    let main = doc.querySelector("article") || doc.querySelector("[role=main]") || doc.querySelector(".content") || doc.querySelector("#content") || doc.body;
    const titleEl = doc.querySelector("h1, h2");
    const title = titleEl ? titleEl.textContent.trim() : "";
    return { title, bodyHtml: main ? main.innerHTML : html, doc };
  }

  global.OreillyAPI = { BASE, extractBookIdFromUrl, getBookInfo, getChapterHtml, extractMainContent, delay };
})(typeof window !== "undefined" ? window : globalThis);
