// ============================================================
// api/chat.js — ARIA BĐS AI Chat Proxy
// Hỗ trợ: Text chat + Vision (phân tích ảnh BĐS)
// Model: DeepSeek Chat (text) + Vision (ảnh)
// ============================================================

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'DeepSeek API key chưa được cấu hình.' });

    const { messages, hasImage } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'messages array required.' });
    }

    try {
        // Chọn model phù hợp - deepseek-chat cho text, thử vision nếu có ảnh
        const model = hasImage ? 'deepseek-chat' : 'deepseek-chat';

        const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.7,
                max_tokens: 2000,
                stream: false
            }),
        });

        const data = await upstream.json();

        if (!upstream.ok) {
            console.error('DeepSeek API error:', data);
            return res.status(upstream.status).json({
                error: data.error?.message || 'Lỗi từ DeepSeek API',
                details: data
            });
        }

        return res.status(200).json(data);

    } catch (err) {
        console.error('Chat handler error:', err);
        return res.status(500).json({ error: err.message });
    }
};
