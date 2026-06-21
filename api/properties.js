// ============================================================
// api/properties.js — CRUD Danh mục Bất động sản
// Lưu trong localStorage (client) + trả về từ data/properties.json
// ============================================================
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), 'data', 'properties.json');

function readProperties() {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        return [];
    }
}

function writeProperties(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        if (req.method === 'GET') {
            // Lấy danh sách hoặc 1 BĐS
            const { id, type, status, city, minPrice, maxPrice, search } = req.query;
            let properties = readProperties();

            if (id) {
                const p = properties.find(p => p.id === id);
                if (!p) return res.status(404).json({ error: 'Không tìm thấy BĐS' });
                return res.status(200).json(p);
            }

            // Filter
            if (type && type !== 'all') properties = properties.filter(p => p.type === type);
            if (status && status !== 'all') properties = properties.filter(p => p.status === status);
            if (city) properties = properties.filter(p => p.address.city.includes(city));
            if (minPrice) properties = properties.filter(p => p.price.value >= Number(minPrice));
            if (maxPrice) properties = properties.filter(p => p.price.value <= Number(maxPrice));
            if (search) {
                const q = search.toLowerCase();
                properties = properties.filter(p =>
                    p.title.toLowerCase().includes(q) ||
                    p.address.full.toLowerCase().includes(q) ||
                    p.description?.toLowerCase().includes(q) ||
                    p.legal?.soSo?.toLowerCase().includes(q)
                );
            }

            return res.status(200).json({ properties, total: properties.length });
        }

        if (req.method === 'POST') {
            const newProp = req.body;
            if (!newProp.title) return res.status(400).json({ error: 'Thiếu tiêu đề BĐS' });

            const properties = readProperties();
            newProp.id = 'BDS' + Date.now();
            newProp.createdAt = new Date().toISOString().split('T')[0];
            newProp.updatedAt = newProp.createdAt;
            newProp.viewCount = 0;
            newProp.inquiryCount = 0;
            properties.push(newProp);
            writeProperties(properties);

            return res.status(201).json(newProp);
        }

        if (req.method === 'PUT') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Thiếu ID' });

            const properties = readProperties();
            const idx = properties.findIndex(p => p.id === id);
            if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy BĐS' });

            properties[idx] = { ...properties[idx], ...req.body, id, updatedAt: new Date().toISOString().split('T')[0] };
            writeProperties(properties);

            return res.status(200).json(properties[idx]);
        }

        if (req.method === 'DELETE') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Thiếu ID' });

            let properties = readProperties();
            const before = properties.length;
            properties = properties.filter(p => p.id !== id);
            if (properties.length === before) return res.status(404).json({ error: 'Không tìm thấy BĐS' });
            writeProperties(properties);

            return res.status(200).json({ message: 'Đã xóa thành công' });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        console.error('Properties handler error:', err);
        return res.status(500).json({ error: err.message });
    }
};
