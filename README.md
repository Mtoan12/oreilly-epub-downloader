# EPUB Downloader for O'Reilly (Chrome Extension)

A Manifest V3 Chrome Extension that downloads EPUB books directly from O'Reilly Learning for offline reading.

## Features

- **Automatic Book Detection**: Identifies title, authors, cover, and total chapters.
- **Valid EPUB 3 & EPUB 2 NCX**: Generates standard EPUB structure compatible with Apple Books, Kindle, Kobo, and Calibre.
- **Image Preservation**: Option to download chapter illustrations.
- **Rate-limit Protection**: Configurable throttling between chapter requests.
- **Local Packaging**: Uses bundled JSZip without external CDN requests.

## Installation

1. Clone or download this repository.
2. Open Chrome/Edge/Brave and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the folder containing this extension.

## Usage

1. Go to [learning.oreilly.com](https://learning.oreilly.com) and sign in.
2. Open any book you want to read.
3. Click the extension icon in the toolbar.
4. Adjust options if needed (images, delay) and click **Tải EPUB** (Download EPUB).

## Disclaimer

This project is for educational and personal offline reading purposes only. Please respect the copyright and terms of service of the content provider.
