(async function() {
  const url = "https://learning.oreilly.com/api/v2/epub-chapters/urn:orm:book:9781633436541:chapter:Text%252ftitlepage.xhtml/";
  const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
  console.log("Status:", res.status);
  const j = await res.json();
  console.log("Keys:", Object.keys(j));
  console.log("content preview:", (j.content || j.body || j.html || JSON.stringify(j)).slice(0, 500));
})();
