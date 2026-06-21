// ============================================================
// api/leads.js — Quản lý Lead Khách Hàng BĐS
// ============================================================
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'data', 'leads.json');

function readLeads() {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (e) { return []; }
}

function writeLeads(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            const { id, status } = req.query;
            let leads = readLeads();

            if (id) {
                const l = leads.find(l => l.id === id);
                if (!l) return res.status(404).json({ error: 'Không tìm thấy lead' });
                return res.status(200).json(l);
            }

            if (status && status !== 'all') {
                leads = leads.filter(l => l.status === status);
            }

            // Sort by createdAt desc
            leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            const stats = {
                total: leads.length,
                moi: leads.filter(l => l.status === 'moi').length,
                dangCham: leads.filter(l => l.status === 'dang_cham').length,
                chot: leads.filter(l => l.status === 'da_chot').length,
                that: leads.filter(l => l.status === 'that_bai').length
            };

            return res.status(200).json({ leads, stats });
        }

        if (req.method === 'POST') {
            const lead = req.body;
            if (!lead.name || !lead.phone) {
                return res.status(400).json({ error: 'Cần có họ tên và số điện thoại' });
            }

            const leads = readLeads();
            const newLead = {
                id: 'LEAD' + Date.now(),
                name: lead.name,
                phone: lead.phone,
                email: lead.email || '',
                nguonDen: lead.nguonDen || 'chat_ai',
                nhuCau: lead.nhuCau || '',
                loaiBds: lead.loaiBds || '',
                ngangSach: lead.ngangSach || '',
                khuVucMong: lead.khuVucMong || '',
                propertyInterested: lead.propertyInterested || '',
                status: 'moi',
                priority: lead.priority || 'normal',
                notes: lead.notes || '',
                timeline: [{
                    date: new Date().toISOString(),
                    action: 'Tạo lead',
                    note: `Lead mới từ ${lead.nguonDen || 'chat AI'}`
                }],
                nextFollowUp: lead.nextFollowUp || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            leads.unshift(newLead);
            writeLeads(leads);

            return res.status(201).json(newLead);
        }

        if (req.method === 'PUT') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Thiếu ID' });

            const leads = readLeads();
            const idx = leads.findIndex(l => l.id === id);
            if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy lead' });

            const update = req.body;

            // Nếu có timeline mới, push vào array
            if (update.newTimeline) {
                leads[idx].timeline = leads[idx].timeline || [];
                leads[idx].timeline.push({
                    date: new Date().toISOString(),
                    action: update.newTimeline.action,
                    note: update.newTimeline.note
                });
                delete update.newTimeline;
            }

            leads[idx] = { ...leads[idx], ...update, id, updatedAt: new Date().toISOString() };
            writeLeads(leads);

            return res.status(200).json(leads[idx]);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Thiếu ID' });

            let leads = readLeads();
            const before = leads.length;
            leads = leads.filter(l => l.id !== id);
            if (leads.length === before) return res.status(404).json({ error: 'Không tìm thấy lead' });
            writeLeads(leads);

            return res.status(200).json({ message: 'Đã xóa' });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        console.error('Leads handler error:', err);
        return res.status(500).json({ error: err.message });
    }
};
