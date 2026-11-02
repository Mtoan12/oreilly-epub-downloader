# O'Reilly EPUB Downloader (Chrome Extension)

[![GitHub stars](https://img.shields.io/github/stars/Mtoan12/oreilly-epub-downloader?style=flat-square)](https://github.com/Mtoan12/oreilly-epub-downloader/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/Mtoan12/oreilly-epub-downloader?style=flat-square)](https://github.com/Mtoan12/oreilly-epub-downloader/network)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Compatibility](https://img.shields.io/badge/Chrome%20%7C%20Brave%20%7C%20Edge-Supported-green?style=flat-square)](https://github.com/Mtoan12/oreilly-epub-downloader)

> **Fast, clean, and reliable Google Chrome Extension (Manifest V3) to export and download books from O'Reilly Learning (Safari Books Online) into standard, beautifully formatted EPUB 3 files with images and Table of Contents (TOC).**

---

## ⚡ Highlights & Key Features

- 🚀 **1-Click Auto-Detection**: Automatically identifies the active book ID, title, author(s), cover thumbnail, and chapter tree from any `learning.oreilly.com` reader page.
- 📱 **Kindle & E-Reader Ready**: Produces valid **EPUB 3** with backward-compatible **EPUB 2 NCX** navigation (`toc.ncx` + `toc.xhtml`). Works natively on **Kindle (Send to Kindle / Scribe), Apple Books, Kobo, Onyx Boox, PocketBook, and Calibre**.
- 🖼️ **Illustration & Image Preservation**: Extracts high-resolution diagrams, code snippets, and charts, rebinding them directly inside `OEBPS/images/` for full offline reading.
- 🛡️ **Anti-Ban & Rate-Limit Safeguard**: Includes customizable delay intervals between chapter downloads to ensure safe browsing and prevent account throttling.
- 🔒 **Privacy-First & Standalone**: Zero external dependencies, telemetry, or remote servers. Uses a bundled `JSZip` library running entirely in your browser session.

---

## 📸 Screenshots

```
┌──────────────────────────────────────────┐
│ 📖 O'Reilly Downloader            EPUB 3 │
├──────────────────────────────────────────┤
│ ┌────┐  AI Agents and Applications       │
│ │ 📕 │  By Author Name                   │
│ └────┘  Chapters: 18                     │
│                                          │
│ [x] Download illustrations and images    │
│ Delay between chapters: [Safe (500ms) ▾] │
│                                          │
│ [████████████████████████████░░░░░] 85%  │
│ Downloading chapter 15/18: Agent Memory  │
│                                          │
│           [ Download EPUB ]              │
└──────────────────────────────────────────┘
```

---

## 📦 Installation Guide

### Method 1: Load Unpacked (Chrome / Edge / Brave / Opera)

1. **Clone or Download** this repository:
   ```bash
   git clone https://github.com/Mtoan12/oreilly-epub-downloader.git
   ```
   *(Or click **Code ➔ Download ZIP** on GitHub and extract it).*

2. Open your browser and navigate to the Extensions page:
   - **Google Chrome**: `chrome://extensions/`
   - **Brave**: `brave://extensions/`
   - **Microsoft Edge**: `edge://extensions/`

3. Toggle **Developer mode** in the top-right corner.

4. Click **Load unpacked**.

5. Select the `oreilly-epub-downloader` folder.

---

## 📖 How to Use

1. Log in to your personal or enterprise account at [learning.oreilly.com](https://learning.oreilly.com).
2. Open any book or interactive course reader (URL matching `https://learning.oreilly.com/library/view/...`).
3. Click the **O'Reilly Downloader** extension icon in your toolbar.
4. Review the detected book details and chapter count.
5. Choose your preferences:
   - Check **Download illustrations and images** (recommended for technical books).
   - Select throttle delay (`200ms`, `500ms`, or `1000ms`).
6. Click **Download EPUB**. The resulting `.epub` file will automatically save to your computer's `Downloads` directory.

---

## 🛠️ Architecture & Technology Stack

```
oreilly-epub-downloader/
├── manifest.json            # Chrome Manifest V3 configuration
├── popup/
│   ├── popup.html           # Modern popup interface
│   ├── popup.css            # Responsive dark-mode styling
│   └── popup.js             # Pipeline manager & event handlers
├── scripts/
│   ├── background.js        # Background worker for browser download triggers
│   ├── content.js           # Reader DOM parser and fallback TOC scraper
│   ├── oreilly-api.js       # Authenticated O'Reilly v1/v2 API client
│   └── epub-builder.js      # EPUB 3 + NCX packager powered by JSZip
├── vendor/
│   └── jszip.min.js         # Offline ZIP compressor
└── icons/                   # High-res extension icons
```

---

## 🔍 Topics & SEO Keywords

`oreilly-downloader` · `oreilly-epub` · `safari-books-downloader` · `epub-exporter` · `chrome-extension` · `manifest-v3` · `kindle-books` · `kobo` · `calibre` · `offline-reader` · `oreilly-learning` · `ebook-converter`

---

## ⚖️ Legal & Disclaimer

This software is developed strictly for **educational and personal offline reading purposes**. 
- Users are solely responsible for complying with the Terms of Service of O'Reilly Media.
- The authors do not endorse or encourage unauthorized redistribution or commercial exploitation of copyrighted content.
- All product and company names are trademarks™ or registered® trademarks of their respective holders. Use of them does not imply any affiliation with or endorsement by them.

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
