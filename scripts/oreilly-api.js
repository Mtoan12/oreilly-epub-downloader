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

  // Lấy toàn bộ spine của sách theo API v2 (hỗ trợ phân trang next)
  async function fetchSpineV2(bookId) {
    const chapters = [];
    let nextUrl = BASE + "/api/v2/epubs/urn:orm:book:" + encodeURIComponent(bookId) + "/spine/";

    let page = 0;
    while (nextUrl && page < 100) {
      page++;
      try {
        console.log("[EPUB] Fetching spine page " + page + ":", nextUrl);
        const json = await fetchJson(nextUrl);
        const results = json.results || json.items || [];
        for (const item of results) {
          const title = (item.title || "").trim() || ("Chapter " + (chapters.length + 1));
          chapters.push({
            title: title,
            // url này trỏ tới /api/v2/epub-chapters/...
            chapterApiUrl: item.url,
            ourn: item.ourn,
            referenceId: item.reference_id,
            bookId: bookId
          });
        }
        nextUrl = json.next ? new URL(json.next, BASE).href : null;
      } catch (e) {
        console.warn("[EPUB] Error fetching spine page " + page + ":", e.message);
        break;
      }
    }
    return chapters;
  }

  // Fallback: Lấy chapter từ TOC nếu không có spine
  function flattenToc(items, chapters, seen, bookId) {
    if (!items) return;
    const list = Array.isArray(items) ? items : (items.items || items.children || items.results || []);
    for (const item of list) {
      if (typeof item === "string") {
        const u = new URL(item, BASE).href;
        if (!seen.has(u)) {
          seen.add(u);
          chapters.push({ title: "Chapter " + (chapters.length + 1), chapterApiUrl: u, bookId });
        }
      } else if (item && typeof item === "object") {
        const rawUrl = item.url || item.web_url || item.content_url || item.href;
        const title = (item.title || item.label || item.name || "").trim();
        if (rawUrl) {
          const u = new URL(rawUrl, BASE).href;
          if (!seen.has(u)) {
            seen.add(u);
            chapters.push({
              title: title || ("Chapter " + (chapters.length + 1)),
              chapterApiUrl: u,
              bookId
            });
          }
        }
        if (item.children || item.items || item.subchapters) {
          flattenToc(item.children || item.items || item.subchapters, chapters, seen, bookId);
        }
      }
    }
  }

  async function getChaptersForBook(bookId, bookJson) {
    // 1. Ưu tiên cao nhất: API v2 spine (chuẩn xác nhất cho toàn bộ sách O'Reilly hiện đại)
    const spineChapters = await fetchSpineV2(bookId);
    if (spineChapters.length > 0) {
      console.log("[EPUB] Found " + spineChapters.length + " chapters via API v2 spine");
      return spineChapters;
    }

    // 2. Fallback nếu v2 spine không có: thử TOC từ bookJson
    const chapters = [];
    const seen = new Set();
    if (bookJson) {
      if (Array.isArray(bookJson.spine)) flattenToc(bookJson.spine, chapters, seen, bookId);
      if (Array.isArray(bookJson.chapters)) flattenToc(bookJson.chapters, chapters, seen, bookId);
      if (Array.isArray(bookJson.table_of_contents)) flattenToc(bookJson.table_of_contents, chapters, seen, bookId);
    }
    if (chapters.length > 0) return chapters;

    // 3. Fallback: v1 API TOC
    try {
      const tocJson = await fetchJson(BASE + "/api/v1/book/" + encodeURIComponent(bookId) + "/toc/");
      flattenToc(tocJson, chapters, seen, bookId);
    } catch (e) {}

    return chapters;
  }

  async function getBookInfo(bookId) {
    let bookJson = null;

    // Thử lấy metadata từ API v2 trước, sau đó v1
    const candidateUrls = [
      BASE + "/api/v2/epubs/urn:orm:book:" + encodeURIComponent(bookId) + "/",
      BASE + "/api/v1/book/" + encodeURIComponent(bookId) + "/?format=json",
      BASE + "/api/v1/book/" + encodeURIComponent(bookId) + "/"
    ];

    for (const u of candidateUrls) {
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
      const names = creators.map((a) => (typeof a === "string" ? a : (a.name || a.full_name || ""))).filter(Boolean).join(", ");
      if (names) authors = names;
    } else if (typeof creators === "string") {
      authors = creators;
    }

    // Cover image
    let cover = bookJson.cover || bookJson.cover_url || bookJson.image;
    if (!cover && bookJson.images && bookJson.images.cover) {
      cover = bookJson.images.cover;
    }
    // Fallback: endpoint cover CDN tiêu chuẩn của O'Reilly hỗ trợ mọi đầu sách
    if (!cover && bookId) {
      cover = BASE + "/covers/urn:orm:book:" + encodeURIComponent(bookId) + "/400w/";
    }

    const publisher = bookJson.publisher_name || bookJson.publisher || "O'Reilly Media";
    const language = bookJson.language || "en";
    const description = bookJson.description || (bookJson.descriptions && bookJson.descriptions.description) || "";

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

  // Lấy nội dung XHTML của một chapter
  async function getChapterHtml(chapter) {
    const apiUrl = chapter.chapterApiUrl || chapter.url;
    if (!apiUrl) throw new Error("No URL for chapter: " + (chapter.title || "unknown"));

    console.log("[EPUB] Fetching chapter:", chapter.title, "from:", apiUrl);

    // Bước 1: Nếu URL là API endpoint (/api/v2/epub-chapters/... hoặc /api/v1/...)
    if (apiUrl.includes("/api/")) {
      try {
        const res = await fetch(apiUrl, { credentials: "include", headers: { Accept: "application/json" } });
        if (res.ok) {
          const j = await res.json();
          // Nếu có content_url (chuẩn API v2 O'Reilly), fetch trực tiếp file raw XHTML từ content_url
          if (j.content_url) {
            console.log("[EPUB] Found content_url:", j.content_url);
            const contentRes = await fetch(j.content_url, {
              credentials: "include",
              headers: { Accept: "application/xhtml+xml,text/html,text/plain,*/*" }
            });
            if (contentRes.ok) {
              const xhtml = await contentRes.text();
              if (xhtml && xhtml.trim().length > 0) {
                console.log("[EPUB] Successfully fetched content_url XHTML, length:", xhtml.length);
                return { html: xhtml, contentBaseUrl: j.content_url };
              }
            }
          }

          // Nếu có sẵn trường content / body / html trong JSON
          const directContent = j.content || j.body || j.html || j.text;
          if (directContent && directContent.trim().length > 50) {
            console.log("[EPUB] Using direct JSON content, length:", directContent.length);
            return { html: directContent, contentBaseUrl: apiUrl };
          }
        }
      } catch (e) {
        console.warn("[EPUB] API fetch error:", e.message);
      }
    }

    // Bước 2: Fallback fetch trực tiếp URL (nếu là content_url hoặc direct reader/file link)
    const fallbackRes = await fetch(apiUrl, {
      credentials: "include",
      headers: { Accept: "application/xhtml+xml,text/html,application/json,*/*" }
    });
    if (!fallbackRes.ok) throw new Error("HTTP " + fallbackRes.status + " fetching chapter content");
    
    const ct = fallbackRes.headers.get("content-type") || "";
    if (ct.includes("json")) {
      const j = await fallbackRes.json();
      if (j.content_url) {
        const r = await fetch(j.content_url, { credentials: "include" });
        return { html: await r.text(), contentBaseUrl: j.content_url };
      }
      return { html: j.content || j.body || j.html || "", contentBaseUrl: apiUrl };
    }

    const text = await fallbackRes.text();
    return { html: text, contentBaseUrl: apiUrl };
  }

  function extractMainContent(html, pageUrl) {
    if (!html || html.trim().length === 0) return { title: "", bodyHtml: "", doc: null };

    // Thử parse dạng xhtml trước vì O'Reilly files là raw XHTML
    let doc;
    try {
      const xhtmlDoc = new DOMParser().parseFromString(html, "application/xhtml+xml");
      if (!xhtmlDoc.querySelector("parsererror")) {
        doc = xhtmlDoc;
      }
    } catch (e) {}

    if (!doc) {
      doc = new DOMParser().parseFromString(html, "text/html");
    }

    // Chỉ lọc các script, style, và control panels, GIỮ NGUYÊN nội dung và heading
    ["script", "style", "noscript"].forEach((s) => doc.querySelectorAll(s).forEach((n) => n.remove()));
    [".site-header", ".reader-controls", ".toolbar", ".annotation-actions",
     "[data-testid='toolbar']", ".nav-sidebar", "#rm-left-sidebar"].forEach((s) => {
      doc.querySelectorAll(s).forEach((n) => n.remove());
    });

    const titleEl = doc.querySelector("title, h1, h2");
    const title = titleEl ? titleEl.textContent.trim() : "";

    // O'Reilly XHTML gốc có cấu trúc rất chuẩn, thường toàn bộ nội dung nằm trong <body> hoặc <section>
    let main = doc.querySelector("section[data-type='chapter']")
      || doc.querySelector("section[data-type]")
      || doc.querySelector("article")
      || doc.querySelector("[role=main]")
      || doc.querySelector("main")
      || doc.querySelector(".content")
      || doc.querySelector("#content")
      || doc.body;

    // Sử dụng XMLSerializer để đảm bảo thẻ tự đóng (như <img/>, <br/>, <hr/>) chuẩn cú pháp XHTML EPUB
    let bodyHtml = "";
    if (main) {
      const serializer = new XMLSerializer();
      bodyHtml = Array.from(main.childNodes)
        .map((child) => serializer.serializeToString(child))
        .join("");
    } else {
      bodyHtml = html;
    }

    return { title, bodyHtml, doc };
  }

  global.OreillyAPI = { BASE, extractBookIdFromUrl, getBookInfo, getChapterHtml, extractMainContent, delay };
})(typeof window !== "undefined" ? window : globalThis);
