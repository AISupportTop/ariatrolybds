// ============================================================
// api/chat.js — ARIA BĐS AI Chat Proxy v2.0
// ✅ DeepSeek Chat  → xử lý hội thoại text (nhanh, rẻ)
// ✅ Groq Vision     → phân tích ảnh BĐS (Llama 4 Scout)
// ============================================================

/**
 * Tách messages thành 2 phần:
 * - visionMessages: chứa ảnh → gửi cho Groq Vision
 * - chatMessages  : text thuần → gửi cho DeepSeek
 *
 * Groq Vision format (OpenAI-compatible):
 *   content: [ { type:'image_url', image_url:{url:'data:...'} }, { type:'text', text:'...' } ]
 */
function splitMessages(messages) {
    // Tìm message cuối cùng có chứa image_url
    const lastUserIdx = [...messages].reverse().findIndex(
        m => m.role === 'user' && Array.isArray(m.content) &&
             m.content.some(p => p.type === 'image_url')
    );

    if (lastUserIdx === -1) return { hasVision: false };

    // Index thực trong mảng gốc
    const visionIdx = messages.length - 1 - lastUserIdx;
    const visionMsg  = messages[visionIdx];

    return { hasVision: true, visionMsg, visionIdx };
}

/**
 * Làm sạch messages cho DeepSeek (text-only):
 * Loại bỏ tất cả image_url, chỉ giữ text.
 */
function toTextOnly(messages) {
    return messages.map(msg => {
        if (!Array.isArray(msg.content)) return msg;
        const text = msg.content
            .filter(p => p.type === 'text')
            .map(p => p.text || '')
            .join('\n')
            .trim();
        return { ...msg, content: text || '[Nội dung hình ảnh BĐS]' };
    });
}

// ── Groq Vision: phân tích ảnh BĐS ──────────────────────────
async function callGroqVision(groqKey, systemPrompt, visionMsg, userText) {
    // Groq hỗ trợ Llama 4 Scout với vision
    const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
    const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

    const imageContent = visionMsg.content; // Array với image_url + text

    // Đảm bảo có text prompt mô tả nhiệm vụ
    const hasText = imageContent.some(p => p.type === 'text' && p.text?.trim());
    const content = hasText ? imageContent : [
        ...imageContent,
        {
            type: 'text',
            text: userText || `Bạn là chuyên gia bất động sản và pháp lý nhà đất Việt Nam. Hãy phân tích hình ảnh này, trả lời NGẮN GỌN, CHUYÊN NGHIỆP, KHÔNG dùng các ký hiệu thừa (như ####).
Nếu hình ảnh là GIẤY TỜ PHÁP LÝ (Sổ Đỏ, Sổ Hồng, Giấy chứng nhận quyền sử dụng đất):
1. Quét và trích xuất các thông tin: Số vào sổ, Số thửa đất, Số tờ bản đồ, Địa chỉ, Diện tích, Hình thức sử dụng, Mục đích sử dụng. (MỌI THÔNG TIN QUÉT ĐƯỢC PHẢI ĐƯỢC BỌC TRONG KÝ HIỆU ==Thông tin== để làm nổi bật màu vàng chanh).
2. Tự động scan mã QR (ở góc phải sổ): Cố gắng đọc mã QR và đối chiếu thông tin mã QR với thông tin in trên sổ xem có khớp không.
3. Hướng dẫn tra cứu quy hoạch (ngắn gọn): Dựa trên số tờ, số thửa, địa chỉ.
4. Google Maps (ngắn gọn): Hướng dẫn tìm vị trí lô đất.

Nếu hình ảnh là BẤT ĐỘNG SẢN THỰC TẾ:
1. 🏠 Loại BĐS: Thông tin cốt lõi bọc trong ==Nội dung==.
2. 🔍 Tình trạng & Kết cấu.
3. ✅ Ưu/Nhược điểm & 💰 Ước tính chi phí cải tạo (nếu cần).
4. 📊 Định giá sơ bộ.`
        }
    ];

    const groqMessages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
    ];

    const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
            model: GROQ_VISION_MODEL,
            messages: groqMessages,
            temperature: 0.7,
            max_tokens: 2000
        })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error?.message || `Groq Vision lỗi ${res.status}`);
    }
    return data;
}

// ── DeepSeek: chat text thông thường ────────────────────────
async function callDeepSeek(deepseekKey, messages) {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: toTextOnly(messages),
            temperature: 0.7,
            max_tokens: 2000,
            stream: false
        })
    });

    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error?.message || `DeepSeek API lỗi ${res.status}`);
    }
    return data;
}

// ── Main Handler ─────────────────────────────────────────────
module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const groqKey     = process.env.GROQ_API_KEY;

    if (!deepseekKey) {
        return res.status(500).json({ error: 'DEEPSEEK_API_KEY chưa cấu hình trong Vercel.' });
    }

    const { messages, hasImage } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array required.' });
    }

    try {
        // Nếu có ảnh và có Groq key → dùng Groq Vision
        if (hasImage && groqKey) {
            const { hasVision, visionMsg } = splitMessages(messages);

            if (hasVision && visionMsg) {
                console.log('📸 Routing to Groq Vision (Llama 4 Scout)...');
                // Lấy text từ visionMsg (nếu có)
                const userText = Array.isArray(visionMsg.content)
                    ? visionMsg.content.find(p => p.type === 'text')?.text || ''
                    : visionMsg.content || '';

                // Lấy system prompt từ message đầu tiên
                const systemContent = messages.find(m => m.role === 'system')?.content || '';

                const data = await callGroqVision(groqKey, systemContent, visionMsg, userText);
                return res.status(200).json(data);
            }
        }

        // Fallback hoặc text-only → DeepSeek
        console.log('💬 Routing to DeepSeek Chat...');
        const data = await callDeepSeek(deepseekKey, messages);
        return res.status(200).json(data);

    } catch (err) {
        console.error('Chat handler error:', err.message);
        return res.status(500).json({
            error: err.message,
            hint: hasImage && !groqKey
                ? 'GROQ_API_KEY chưa cấu hình — thêm vào Vercel Environment Variables để kích hoạt phân tích ảnh.'
                : undefined
        });
    }
};
