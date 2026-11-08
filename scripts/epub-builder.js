(function (global) {
  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function slug(i) { return "ch" + String(i + 1).padStart(3, "0"); }
  function mimeOf(url) {
    const u = String(url).split("?")[0].toLowerCase();
    if (u.endsWith(".png")) return "image/png";
    if (u.endsWith(".gif")) return "image/gif";
    if (u.endsWith(".svg")) return "image/svg+xml";
    if (u.endsWith(".webp")) return "image/webp";
    return "image/jpeg";
  }
  const CSS = "body{font-family:Georgia,serif;line-height:1.6;margin:5%;}img{max-width:100%;height:auto;}pre,code{white-space:pre-wrap;}h1,h2,h3{line-height:1.3;}";

  async function buildEpub(book, chaptersHtml, images, onProgress) {
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.file("META-INF/container.xml", '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
    zip.file("OEBPS/styles/stylesheet.css", CSS);

    const manifest = [
      '<item id="css" href="styles/stylesheet.css" media-type="text/css"/>',
      '<item id="nav" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
      '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
    ];
    const spine = [];
    const navItems = [];
    const ncxItems = [];
    let playOrder = 1;

    chaptersHtml.forEach((ch, i) => {
      const name = slug(i) + ".xhtml";
      const id = slug(i);
      const title = ch.title || ("Chapter " + (i + 1));
      // Tránh lặp tiêu đề nếu trong nội dung chapter đã có thẻ heading <h1>
      const hasHeading = /<h1[\s>]/i.test(ch.body || "");
      const headingHtml = hasHeading ? "" : ('<h1>' + esc(title) + '</h1>');
      const xhtml = '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>' + esc(title) + '</title><link rel="stylesheet" href="../styles/stylesheet.css"/></head><body>' + headingHtml + (ch.body || "") + '</body></html>';
      zip.file("OEBPS/chapters/" + name, xhtml);
      manifest.push('<item id="' + id + '" href="chapters/' + name + '" media-type="application/xhtml+xml"/>');
      spine.push('<itemref idref="' + id + '"/>');
      navItems.push('<li><a href="chapters/' + name + '">' + esc(title) + '</a></li>');
      ncxItems.push('<navPoint id="' + id + '" playOrder="' + (playOrder++) + '"><navLabel><text>' + esc(title) + '</text></navLabel><content src="chapters/' + name + '"/></navPoint>');
    });

    Object.keys(images || {}).forEach((fname, idx) => {
      const id = "img" + idx;
      zip.file("OEBPS/images/" + fname, images[fname], { binary: true });
      manifest.push('<item id="' + id + '" href="images/' + fname + '" media-type="' + mimeOf(fname) + '"/>');
    });

    if (book.coverData && book.coverExt) {
      zip.file("OEBPS/images/cover" + book.coverExt, book.coverData, { binary: true });
      manifest.push('<item id="cover-img" href="images/cover' + book.coverExt + '" media-type="' + mimeOf(book.coverExt) + '" properties="cover-image"/>');
    }

    const opf = '<?xml version="1.0" encoding="utf-8"?><package version="3.0" unique-identifier="bookid" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">urn:orm:book:' + esc(book.id) + '</dc:identifier><dc:title>' + esc(book.title) + '</dc:title><dc:creator>' + esc(book.authors) + '</dc:creator><dc:language>' + esc(book.language || "en") + '</dc:language><dc:publisher>' + esc(book.publisher || "OReilly Media") + '</dc:publisher><meta property="dcterms:modified">' + new Date().toISOString().replace(/\.\d+Z$/, "Z") + '</meta></metadata><manifest>' + manifest.join("") + '</manifest><spine>' + spine.join("") + '</spine></package>';
    zip.file("OEBPS/content.opf", opf);
    zip.file("OEBPS/toc.xhtml", '<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol>' + navItems.join("") + '</ol></nav></body></html>');
    zip.file("OEBPS/toc.ncx", '<?xml version="1.0" encoding="utf-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="urn:orm:book:' + esc(book.id) + '"/></head><docTitle><text>' + esc(book.title) + '</text></docTitle><navMap>' + ncxItems.join("") + '</navMap></ncx>');
    if (onProgress) onProgress("Compressing EPUB", 95);
    return zip.generateAsync({ type: "blob", mimeType: "application/epub+zip", compression: "DEFLATE" });
  }

  async function fetchImageAsArrayBuffer(url) {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("img " + res.status);
    return res.arrayBuffer();
  }

  global.EpubBuilder = { buildEpub, fetchImageAsArrayBuffer, mimeOf };
})(typeof window !== "undefined" ? window : globalThis);
