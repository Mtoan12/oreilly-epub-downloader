# O'Reilly Learning Platform - API Reference & Architecture Guide

Tài liệu này ghi lại kiến trúc API thực tế của O'Reilly Learning (`learning.oreilly.com`), các endpoint quan trọng và những cạm bẫy kỹ thuật (pitfalls) đã được điều tra và xác minh.

---

## 1. Định danh sách (Book ID / URN)

- **Book ID (ISBN/Slug)**: ví dụ `9781633436541`
- **Book URN**: `urn:orm:book:{bookId}` (ví dụ: `urn:orm:book:9781633436541`)
- **Chapter URN**: `urn:orm:book:{bookId}:chapter:{encodedFilePath}`  
  *(Ví dụ: `urn:orm:book:9781633436541:chapter:Text%2ftitlepage.xhtml`)*

---

## 2. Các API Endpoint chính thức (API v2)

> **LƯU Ý QUAN TRỌNG:** API v1 (`/api/v1/book/{id}/chapter/` hoặc `/api/v1/book/{id}/toc/`) đã bị O'Reilly **ngừng hỗ trợ hoặc trả về 404** cho hầu hết các sách phát hành gần đây. Bắt buộc phải sử dụng **API v2**.

### 2.1. Lấy thông tin sách (Metadata)
- **Method:** `GET`
- **Endpoint:** `https://learning.oreilly.com/api/v2/epubs/urn:orm:book:{bookId}/`
- **Headers:** `{ "Accept": "application/json" }`
- **Response chính:**
  ```json
  {
    "ourn": "urn:orm:book:9781633436541",
    "identifier": "9781633436541",
    "title": "AI Agents and Applications",
    "descriptions": { "description": "..." },
    "spine": "https://learning.oreilly.com/api/v2/epubs/urn:orm:book:9781633436541/spine/",
    "files": "https://learning.oreilly.com/api/v2/epubs/urn:orm:book:9781633436541/files/",
    "language": "en"
  }
  ```
  *(Lưu ý: API v2 **không** chứa trường `cover` hay `cover_url` trực tiếp trong object này)*.

---

### 2.2. Ảnh bìa sách (Cover Image CDN)
- **Method:** `GET`
- **Endpoint:** `https://learning.oreilly.com/covers/urn:orm:book:{bookId}/400w/`  
  *(Có thể thay `400w` bằng `600w` hoặc `800w` để lấy độ phân giải cao hơn)*
- **Headers:** `credentials: "include"`
- **Response:** File ảnh nhị phân JPEG (`image/jpeg`)
- **Đặc điểm:** Endpoint này hoạt động ổn định cho 100% các đầu sách trên O'Reilly.

---

### 2.3. Danh sách chương theo thứ tự (Spine API)
- **Method:** `GET`
- **Endpoint:** `https://learning.oreilly.com/api/v2/epubs/urn:orm:book:{bookId}/spine/`
- **Headers:** `{ "Accept": "application/json" }`
- **Cơ chế phân trang:** Endpoint này có phân trang! Nếu sách dài (> 20-30 chương), response sẽ có `next`. Bắt buộc phải lặp `next` cho đến khi `next === null`.
- **Response:**
  ```json
  {
    "count": 35,
    "next": "https://learning.oreilly.com/api/v2/epubs/urn:orm:book:9781633436541/spine/?page=2",
    "previous": null,
    "results": [
      {
        "ourn": "urn:orm:book:9781633436541:chapter:Text%2ftitlepage.xhtml",
        "url": "https://learning.oreilly.com/api/v2/epub-chapters/urn:orm:book:9781633436541:chapter:Text%252ftitlepage.xhtml/",
        "reference_id": "9781633436541-/Text/titlepage.xhtml",
        "title": "Cover"
      },
      {
        "ourn": "urn:orm:book:9781633436541:chapter:Text%2fch01.xhtml",
        "url": "https://learning.oreilly.com/api/v2/epub-chapters/urn:orm:book:9781633436541:chapter:Text%252fch01.xhtml/",
        "reference_id": "9781633436541-/Text/ch01.xhtml",
        "title": "Chapter 1. Introduction"
      }
    ]
  }
  ```

---

### 2.4. Lấy chi tiết chương và Content URL
- **Method:** `GET`
- **Endpoint:** `https://learning.oreilly.com/api/v2/epub-chapters/{ourn}/`  
  *(Chính là URL nằm trong `item.url` của spine)*
- **Headers:** `{ "Accept": "application/json" }`
- **Response:**
  ```json
  {
    "ourn": "urn:orm:book:9781633436541:chapter:Text%2ftitlepage.xhtml",
    "title": "Cover",
    "content_url": "https://learning.oreilly.com/api/v2/epubs/urn:orm:book:9781633436541/files/Text/titlepage.xhtml",
    "related_assets": [...]
  }
  ```
  > **Chìa khóa cốt lõi:** Nội dung bài viết thực tế nằm ở URL trong trường **`content_url`**!

---

### 2.5. Tải nội dung nguyên gốc (Raw XHTML Content)
- **Method:** `GET`
- **Endpoint:** URL từ `content_url` (ví dụ: `https://learning.oreilly.com/api/v2/epubs/urn:orm:book:{bookId}/files/{path}`)
- **Headers:** `{ "Accept": "application/xhtml+xml,text/html,*/*" }`
- **Response:** Nội dung XHTML chuẩn gốc của nhà xuất bản O'Reilly.

---

### 2.6. Tải ảnh minh họa bên trong chương (Images / Assets)
- Trong file XHTML, các thẻ `<img>` thường sử dụng đường dẫn tương đối, ví dụ:
  `<img src="../Images/fig1_1.png" />` hoặc `<img src="images/cover.jpg" />`
- **Cách tính URL tuyệt đối:** Sử dụng `new URL(src, content_url).href`
  - Ví dụ `content_url` = `.../files/Text/ch01.xhtml`
  - `src` = `../Images/fig1_1.png`
  - URL chuẩn = `https://learning.oreilly.com/api/v2/epubs/urn:orm:book:{bookId}/files/Images/fig1_1.png`
- Tải file ảnh dưới dạng `arrayBuffer()` và thay thế `src` trong XHTML thành đường dẫn nội bộ của EPUB (`../images/{localName}`).

---

## 3. Các cạm bẫy kỹ thuật (Pitfalls & Lessons Learned)

| Vấn đề | Hiện tượng | Nguyên nhân | Giải pháp |
| :--- | :--- | :--- | :--- |
| **Fetch reader URL trực tiếp** | File EPUB chỉ có mỗi tiêu đề, nội dung bên trong rỗng hoặc có chữ báo lỗi | Web Reader (`/library/view/...`) là React SPA client-side. Fetch trả về HTML shell rỗng không có nội dung tĩnh | Không fetch reader URL. Bắt buộc đi qua luồng: `spine` -> `epub-chapters` -> `content_url`. |
| **Dùng API v1 cũ** | Bị lỗi HTTP 404 cho hầu hết các cuốn sách mới | O'Reilly đã ngưng phục vụ endpoint `/api/v1/book/{id}/chapter/` | Chuyển toàn bộ sang API v2: `/api/v2/epubs/.../spine/`. |
| **Thiếu ảnh bìa (Cover)** | Popup không hiện bìa; EPUB tải về không có thumbnail trong Apple Books/Kindle | API v2 không có key `cover` trong metadata | Dùng endpoint CDN trực tiếp: `https://learning.oreilly.com/covers/urn:orm:book:{id}/400w/` và thêm `<meta name="cover" content="cover-img"/>` vào OPF metadata. |
| **Trình đọc EPUB báo lỗi XML** | Mở trên app đọc sách báo XML Parsing Error | Ép chuỗi `innerHTML` trên DOMParser text/html làm mất dấu đóng tự thân của XHTML (`<img ...>`, `<br>` thay vì `<img ... />`, `<br />`) | Dùng `new XMLSerializer().serializeToString()` để tuần tự hóa DOM thành chuẩn XML/XHTML hợp lệ. |
| **Thiếu chương sách** | Cuốn sách 40 chương nhưng chỉ tải được 20 chương | Spine endpoint phân trang ngầm định | Phải có vòng lặp kiểm tra `json.next` của spine endpoint. |
