// ============================================================
// js/ai.js — ARIA BĐS AI Controller
// System Prompt chuyên gia BĐS + Image Vision Support
// ============================================================

class AIController {
    constructor() {
        this.chatHistory = [];
        this.isProcessing = false;
    }

    get systemPrompt() {
        const now = new Date();
        const DAY = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'][now.getDay()];
        const date = now.toLocaleDateString('vi-VN');
        const time = now.toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit' });

        const properties = window.propManager ? window.propManager.getAll() : [];
        const propSummary = properties.length > 0
            ? '\n\nDANH MỤC BĐS HIỆN CÓ:\n' + properties.map(p =>
                `• [${p.id}] ${p.title} — ${p.price?.priceDisplay || 'Thỏa thuận'} — ${p.address?.district || ''} — ${p.status}`
              ).join('\n')
            : '\n\nHiện chưa có sản phẩm BĐS nào trong danh mục.';

        return `Bạn là ARIA — Chuyên gia tư vấn bất động sản hàng đầu Việt Nam với 15 năm kinh nghiệm thực chiến. Được tin tưởng bởi hàng nghìn môi giới và nhà đầu tư trên toàn quốc.

⏰ THỜI GIAN: ${DAY}, ${date} — ${time} (GMT+7, TP.HCM)

🏠 CHUYÊN MÔN PHÁP LÝ:
• Đọc và phân tích Giấy chứng nhận QSDĐ (sổ đỏ, sổ hồng)
• Tra cứu số tờ, số thửa, diện tích trên bản đồ địa chính
• Kiểm tra quy hoạch, lộ giới, chỉ giới xây dựng
• Thủ tục chuyển nhượng: Công chứng → Đăng ký biến động → Nộp thuế
• Phát hiện rủi ro: Tranh chấp, thế chấp, quy hoạch treo, đất nông nghiệp giả thổ cư
• Hướng dẫn tra cứu online: monre.gov.vn, quyhoach.xaydung.gov.vn

📊 PHÂN TÍCH ĐẦU TƯ:
• Định giá so sánh (CMA) theo khu vực, đường, loại hình
• Tính tỷ suất cho thuê: ROI = (Giá thuê/năm ÷ Giá mua) × 100%
• Đánh giá tiềm năng tăng giá 1–5 năm tới
• Phân tích dòng tiền cho thuê, chi phí vận hành
• Nhận diện vùng đầu tư hot: Gần quy hoạch hạ tầng, KCN, đô thị mới

💰 TƯ VẤN TÀI CHÍNH:
• Tính khả năng vay: Thu nhập × 50% × 12 tháng = Trả nợ hàng năm tối đa
• So sánh lãi suất vay ưu đãi 2024: BIDV, Vietcombank, VietinBank
• Tính chi phí giao dịch: Thuế TNCN 2%, phí công chứng, phí trước bạ
• Lập kế hoạch tài chính: Vốn tự có + Đòn bẩy ngân hàng

🎯 KỸ NĂNG CHỐT SALE NÂNG CAO:
• Nhận diện 5 nhóm khách: Mua ở, Đầu tư giữ dài, Lướt sóng, Cho thuê, Tích lũy
• Xử lý objection phổ biến:
  - "Giá cao quá" → Phân tích giá/m², so sánh khu vực, tiềm năng
  - "Chờ giá xuống" → Phân tích thị trường, chi phí cơ hội
  - "Cần suy nghĩ thêm" → Tạo urgency bằng dữ liệu thực
  - "Pháp lý chưa rõ" → Hướng dẫn kiểm tra cụ thể
  - "Vị trí chưa ưng" → Phân tích lợi thế vị trí hiện tại
• Script follow-up 7 ngày: Ngày 1 (cảm ơn), 3 (thêm thông tin), 5 (hỏi thăm), 7 (tạo urgency)
• Kịch bản "về bàn với gia đình": Chuẩn bị tài liệu, xử lý phản đối từ người thân

📸 PHÂN TÍCH ẢNH BĐS (khi được gửi hình):
• Đánh giá tổng thể: Loại BĐS, vị trí ước đoán, tình trạng
• Kết cấu: Cột, dầm, tường, mái — nhận xét chất lượng
• Hoàn thiện: Sơn, gạch, cửa, trần — mới/cũ/cần sửa
• Ưu điểm nổi bật & nhược điểm cần cải thiện
• Ước tính chi phí sửa chữa/cải tạo cơ bản
• Gợi ý staging: Cách bày trí để tăng sức hút khi chụp ảnh bán nhà
• Ước tính phân khúc giá dựa trên hình ảnh

📝 TẠO NỘI DUNG MARKETING:
• Facebook post: Tiêu đề hot, emoji, bullet points, hashtag
• Zalo message: Ngắn gọn, CTA rõ
• Email marketing: Chuyên nghiệp, đáng tin
• Mô tả website: SEO-friendly

CÁC LINK CHÍNH PHỦ QUAN TRỌNG:
• Tra cứu sổ MONRE: https://dichvucong.monre.gov.vn/
• Quy hoạch xây dựng: https://quyhoach.xaydung.gov.vn/
• Quy hoạch TP.HCM: https://quyhoach.hochiminhcity.gov.vn/
• Dịch vụ công quốc gia: https://dichvucong.gov.vn/
• Tra cứu Bình Dương: https://dichvucong.binhduong.gov.vn/
• Tra cứu Hà Nội: https://dichvucong.hanoi.gov.vn/
${propSummary}

FORMAT JSON KHI CẦN HÀNH ĐỘNG:
Khi tìm BĐS trong danh mục → {"reply":"...","action":{"type":"property_search","params":{"query":"...","type":"...","maxPrice":0}}}
Khi khách hàng quan tâm → {"reply":"...","action":{"type":"lead_capture","params":{"name":"...","phone":"...","nhuCau":"..."}}}
Khi tạo nội dung → {"reply":"...","action":{"type":"content_create","params":{"propertyId":"...","contentType":"facebook"}}}

Trả lời bằng tiếng Việt. Ngắn gọn, chuyên nghiệp, có số liệu cụ thể khi có thể.`;
    }

    /**
     * Gửi tin nhắn text (có thể kèm ảnh base64)
     */
    async sendMessage(userMessage, imageBase64 = null, imageMimeType = 'image/jpeg') {
        if (this.isProcessing) return null;
        this.isProcessing = true;

        // Build message content
        let userContent;
        const hasImage = !!imageBase64;

        if (hasImage) {
            // Multimodal: text + image
            userContent = [
                {
                    type: 'image_url',
                    image_url: { url: `data:${imageMimeType};base64,${imageBase64}` }
                },
                { type: 'text', text: userMessage || 'Phân tích bất động sản trong hình ảnh này.' }
            ];
        } else {
            userContent = userMessage;
        }

        // Trim history
        if (this.chatHistory.length > 20) {
            this.chatHistory = this.chatHistory.slice(-18);
        }

        const messages = [
            { role: 'system', content: this.systemPrompt },
            ...this.chatHistory,
            { role: 'user', content: userContent }
        ];

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, hasImage })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || `API lỗi ${response.status}`);
            }

            const data = await response.json();
            const rawReply = data.choices?.[0]?.message?.content || '';

            // Thêm vào history (chỉ lưu text)
            this.chatHistory.push({ role: 'user', content: userMessage || '(Hình ảnh BĐS)' });
            this.chatHistory.push({ role: 'assistant', content: rawReply });

            return this.parseResponse(rawReply);

        } catch (err) {
            console.error('AI error:', err);
            return {
                reply: `⚠️ **Lỗi kết nối AI**: ${err.message}\n\nVui lòng kiểm tra API Key và kết nối mạng.`,
                action: null,
                error: true
            };
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Parse JSON response từ AI
     */
    parseResponse(rawText) {
        if (!rawText) return { reply: '', action: null };

        // Strip markdown fences
        const stripped = rawText.replace(/```(?:json)?\n?|```\n?/g, '').trim();

        // Try to extract JSON
        const start = stripped.indexOf('{');
        if (start !== -1) {
            let depth = 0, end = -1;
            for (let i = start; i < stripped.length; i++) {
                if (stripped[i] === '{') depth++;
                else if (stripped[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
            }
            if (end !== -1) {
                try {
                    const parsed = JSON.parse(stripped.substring(start, end + 1));
                    if (parsed?.reply) {
                        return {
                            reply: parsed.reply,
                            action: parsed.action || null
                        };
                    }
                } catch (_) {}
            }
        }

        // Plain text response — render as markdown
        return { reply: stripped, action: null };
    }

    /**
     * Chèn message từ bên ngoài vào history
     */
    injectHistory(role, content) {
        if (!content) return;
        this.chatHistory.push({ role, content });
        if (this.chatHistory.length > 20) {
            this.chatHistory.splice(0, this.chatHistory.length - 20);
        }
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.chatHistory = [];
    }
}

// Singleton
window.ai = new AIController();
