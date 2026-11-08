// Chạy script này từ POPUP's DevTools Console
// (Chuột phải vào popup → Inspect → Console)
// Mục đích: xem chính xác extension đang fetch URL nào và nhận được gì

(async function debugFromPopup() {
  const BASE = "https://learning.oreilly.com";
  const bookId = "9781633436541";

  async function tryUrl(label, url, wantJson = false) {
    console.group("▶ " + label);
    console.log("URL:", url);
    try {
      const headers = wantJson
        ? { Accept: "application/json" }
        : { Accept: "application/xhtml+xml,text/html,application/json" };
      const res = await fetch(url, { credentials: "include", headers });
      const ct = res.headers.get("content-type") || "";
      console.log("Status:", res.status, "| Content-Type:", ct);
      if (!res.ok) { console.warn("❌ Not OK"); console.groupEnd(); return; }

      let body;
      if (ct.includes("json")) {
        body = await res.json();
        console.log("JSON keys:", Object.keys(body));
        if (body.results) console.log("results[0]:", JSON.stringify(body.results[0]).slice(0, 400));
        if (body.content) console.log("content (200 chars):", body.content.slice(0, 200));
        if (body.body)    console.log("body    (200 chars):", body.body.slice(0, 200));
      } else {
        body = await res.text();
        console.log("Text length:", body.length, "| Preview:", body.slice(0, 300));
      }
      console.log("✅ OK");
    } catch(e) {
      console.error("❌ Error:", e.message);
    }
    console.groupEnd();
  }

  console.log("=== Popup debug for book:", bookId, "===\n");

  // Book metadata
  await tryUrl("Book info v1", BASE + "/api/v1/book/" + bookId + "/?format=json", true);
  await tryUrl("Book info v2", BASE + "/api/v2/epubs/urn:orm:book:" + bookId + "/", true);

  // Chapter list
  await tryUrl("Chapter list v1", BASE + "/api/v1/book/" + bookId + "/chapter/?page_size=3", true);
  await tryUrl("TOC v2",          BASE + "/api/v2/epubs/urn:orm:book:" + bookId + "/toc/", true);
  await tryUrl("Spine v2",        BASE + "/api/v2/epubs/urn:orm:book:" + bookId + "/spine/", true);

  // Try fetching first chapter via files API (common filenames)
  for (const f of ["cover.xhtml", "OEBPS/cover.xhtml", "Text/cover.xhtml", "xhtml/cover.xhtml"]) {
    await tryUrl("Files API: " + f, BASE + "/api/v2/epubs/urn:orm:book:" + bookId + "/files/" + f);
  }

  // Try chapter 1 content
  await tryUrl("Chapter content: chapter01.xhtml",
    BASE + "/api/v1/book/" + bookId + "/chapter/chapter01.xhtml/", true);
})();
