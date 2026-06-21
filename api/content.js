// ============================================================
// api/content.js — Tạo Nội Dung Marketing BĐS bằng AI
// ============================================================

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key chưa cấu hình' });

    const { property, contentType } = req.body;
    if (!property || !contentType) {
        return res.status(400).json({ error: 'Cần property và contentType' });
    }

    const PROMPTS = {
        facebook: `Viết bài đăng Facebook bán/cho thuê bất động sản sau. Yêu cầu:
- Tiêu đề thu hút chú ý, dùng emoji 🏠🔥💎
- Mô tả ngắn gọn điểm nổi bật (3-4 bullet points)  
- Thông tin giá và liên hệ rõ ràng
- CTA (kêu gọi hành động) mạnh
- Hashtag phù hợp cuối bài (10-15 hashtag)
- Độ dài: 200-300 từ
- Tone: Chuyên nghiệp nhưng gần gũi, tạo urgency`,

        zalo: `Viết tin nhắn Zalo OA ngắn gọn, súc tích để giới thiệu BĐS sau:
- Ngắn gọn tối đa 150 từ
- Nêu bật 3 điểm hot nhất
- Giá + liên hệ ngay
- Tone: Thân thiện, nhanh gọn
- Có emoji phù hợp
- Kết bằng CTA: "Nhắn tin để xem nhà!"`,

        email: `Viết email marketing chuyên nghiệp giới thiệu BĐS sau:
- Subject line hấp dẫn (bắt đầu bằng 📌 hoặc 🏠)
- Mở đầu cá nhân hóa
- Mô tả chi tiết sản phẩm với các điểm nổi bật
- Phân tích tiềm năng đầu tư ngắn
- Thông tin pháp lý (nếu có)
- CTA rõ ràng: "Đặt lịch xem nhà"
- Footer với thông tin liên hệ
- Tone: Chuyên nghiệp, đáng tin cậy`,

        description: `Viết mô tả sản phẩm bất động sản chuyên nghiệp cho website:
- Tiêu đề SEO-friendly
- Mô tả tổng quan (2-3 câu)
- Đặc điểm nổi bật (danh sách)
- Vị trí và tiện ích xung quanh
- Thông tin pháp lý
- Kêu gọi hành động
- Độ dài: 250-350 từ
- Giọng điệu: Chuyên nghiệp, thuyết phục`,

        analysis: `Phân tích tiềm năng đầu tư BĐS sau từ góc độ chuyên gia:
- Đánh giá vị trí: ưu điểm, nhược điểm
- So sánh giá với thị trường khu vực
- Tiềm năng tăng giá 1-3 năm tới
- Tỷ suất cho thuê ước tính (nếu phù hợp)
- Rủi ro cần lưu ý
- Khuyến nghị: Mua hay không? Vì sao?
- Rating tổng thể: X/10`
    };

    const propInfo = `
THÔNG TIN BẤT ĐỘNG SẢN:
- Tên: ${property.title || 'Chưa có'}
- Loại: ${property.type || 'Chưa rõ'}
- Trạng thái: ${property.status || 'Đang bán'}
- Địa chỉ: ${property.address?.full || 'Chưa có'}
- Giá: ${property.price?.priceDisplay || property.price?.value?.toLocaleString('vi-VN') + ' đ' || 'Thỏa thuận'}
- Diện tích: ${property.area?.total || 0}m² (mặt tiền ${property.area?.frontage || 0}m)
- Số phòng: ${property.features?.bedrooms || 0} PN / ${property.features?.bathrooms || 0} WC / ${property.features?.floors || 0} tầng
- Hướng: ${property.features?.direction || 'Chưa rõ'}
- Tiện ích: ${property.features?.amenities?.join(', ') || 'Đầy đủ'}
- Pháp lý: ${property.legal?.ghiChuPhapLy || property.legal?.tinhTrangPhapLy || 'Sổ hồng/đỏ đầy đủ'}
- Liên hệ: ${property.owner?.name || 'Môi giới'} - ${property.owner?.phone || property.agent?.phone || 'Liên hệ để biết thêm'}
- Điểm nổi bật: ${property.highlights?.join(', ') || property.description || ''}
`;

    const systemPrompt = `Bạn là copywriter chuyên nghiệp BĐS Việt Nam với 10 năm kinh nghiệm tạo nội dung marketing hiệu quả cao. Viết bằng tiếng Việt, sinh động, đúng tone.`;

    try {
        const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: PROMPTS[contentType] + '\n\n' + propInfo }
                ],
                temperature: 0.8,
                max_tokens: 1500
            })
        });

        const data = await upstream.json();
        if (!upstream.ok) throw new Error(data.error?.message || 'API error');

        const content = data.choices[0].message.content;
        return res.status(200).json({ content, type: contentType });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
