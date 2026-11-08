(async function() {
  const url = "https://learning.oreilly.com/api/v2/epub-chapters/urn:orm:book:9781633436541:chapter:Text%252ftitlepage.xhtml/";
  try {
    const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
    console.log("Status:", res.status);
    const ct = res.headers.get("content-type");
    console.log("Content-Type:", ct);
    const j = await res.json();
    console.log("Keys in epub-chapter:", Object.keys(j));
    console.log("Full JSON (or preview):", j);
  } catch(e) {
    console.error("Error:", e);
  }
})();
