# 🏠 ARIA BĐS — Trợ Lý AI Bất Động Sản Chuyên Nghiệp

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/AISupportTop/ariatrolybds)

> **ARIA** là trợ lý AI chuyên gia bất động sản giúp môi giới tư vấn nhanh, tra cứu pháp lý, phân tích ảnh BĐS, tạo nội dung marketing và quản lý khách hàng.

---

## 🚀 Tính Năng Chính

| Tính năng | Mô tả |
|-----------|-------|
| 💬 **Chat AI Chuyên Gia** | System prompt chuyên sâu BĐS, tư vấn pháp lý, kịch bản chốt sale |
| 📸 **Phân tích ảnh BĐS** | Upload/chụp hình BĐS để AI nhận xét tình trạng, đánh giá |
| 🏘️ **Quản lý danh mục** | Thêm BĐS với đầy đủ: Số sổ, địa chỉ, chính chủ, Google Maps |
| 📜 **Tra cứu pháp lý** | Link trực tiếp đến monre.gov.vn, quyhoach.xaydung.gov.vn |
| 👥 **Quản lý Lead** | Theo dõi khách, timeline chăm sóc, cập nhật trạng thái |
| 📣 **Tạo nội dung** | AI viết bài Facebook, Zalo, Email, mô tả website |
| 📊 **Dashboard** | Thống kê tổng quan, BĐS & khách hàng mới nhất |

---

## ⚙️ Cách Deploy lên Vercel

### Bước 1: Import GitHub repo vào Vercel
1. Vào [vercel.com](https://vercel.com) → **Add New Project**
2. Chọn **Import Git Repository** → `AISupportTop/ariatrolybds`
3. Click **Deploy**

### Bước 2: Cấu hình Environment Variables
Vào **Project Settings → Environment Variables**, thêm:

| Variable | Value | Required |
|----------|-------|----------|
| `DEEPSEEK_API_KEY` | `sk-d2f48ffea75b4c03b6c1b7aba74f24f9` | ✅ Bắt buộc |
| `ADMIN_PASSWORD` | Mật khẩu admin của bạn | Tùy chọn |

### Bước 3: Redeploy
Click **Redeploy** sau khi thêm env vars.

---

## 📁 Cấu Trúc Dự Án

```
ariatrolybds/
├── index.html              ← Giao diện SPA chính
├── vercel.json             ← Cấu hình Vercel
├── api/
│   ├── chat.js             ← DeepSeek AI proxy (với Vision)
│   ├── properties.js       ← CRUD danh mục BĐS
│   ├── leads.js            ← Quản lý lead khách hàng
│   └── content.js          ← Tạo nội dung marketing
├── css/
│   └── main.css            ← Design system dark luxury
├── js/
│   ├── ai.js               ← AI Controller + System Prompt BĐS
│   ├── properties.js       ← Property Manager
│   ├── leads.js            ← Lead Manager
│   ├── upload.js           ← Image Upload Handler
│   └── app.js              ← Main App Controller
└── data/
    ├── properties.json     ← Database BĐS (JSON)
    └── leads.json          ← Database Lead
```

---

## 🔒 Thông Tin Pháp Lý BĐS (Tích Hợp Sẵn)

Các link tra cứu chính phủ được tích hợp:
- 🏛️ **MONRE**: https://dichvucong.monre.gov.vn/
- 🗺️ **Quy hoạch Xây dựng**: https://quyhoach.xaydung.gov.vn/
- 🌆 **Quy hoạch TP.HCM**: https://quyhoach.hochiminhcity.gov.vn/
- 🏯 **Quy hoạch Hà Nội**: https://quyhoach.hanoi.gov.vn/
- 📋 **DVC Quốc gia**: https://dichvucong.gov.vn/

---

## 💡 Hướng Dẫn Sử Dụng

### Chat AI
- Gõ câu hỏi về BĐS, pháp lý, giá cả...
- Click 📸 **Phân tích ảnh** để upload hình BĐS và AI sẽ đánh giá
- Dùng nút gợi ý nhanh để hỏi về tìm sản phẩm, kịch bản sale, tra cứu pháp lý

### Thêm BĐS
- Tab **🏘️ Danh mục** → **➕ Thêm BĐS**
- Điền đầy đủ: Số sổ GCN, địa chỉ, SĐT chính chủ, link Google Maps
- Upload hình ảnh để AI phân tích và tạo nội dung

### Quản lý Khách Hàng
- AI sẽ tự ghi nhận lead khi khách hỏi thông tin
- Tab **👥 Khách hàng** để xem và cập nhật trạng thái

---

## 📞 Hỗ Trợ
- **Đơn vị phát triển**: AI Support Top
- **Website**: https://ai-support.top
- **Email**: hotrosudungai@gmail.com
- **GitHub**: https://github.com/AISupportTop/ariatrolybds
