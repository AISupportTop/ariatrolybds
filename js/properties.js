// ============================================================
// js/properties.js — Property Manager (localStorage + API sync)
// ============================================================

const PROP_STORAGE_KEY = 'aria_bds_properties';

class PropertyManager {
    constructor() {
        this._cache = null;
    }

    /** Load từ localStorage, fallback về data/properties.json */
    async load() {
        // Thử từ localStorage trước
        const local = localStorage.getItem(PROP_STORAGE_KEY);
        if (local) {
            try {
                this._cache = JSON.parse(local);
                return this._cache;
            } catch (_) {}
        }

        // Load từ JSON file
        try {
            const res = await fetch('/data/properties.json');
            this._cache = await res.json();
            this._save();
            return this._cache;
        } catch (e) {
            this._cache = [];
            return [];
        }
    }

    _save() {
        localStorage.setItem(PROP_STORAGE_KEY, JSON.stringify(this._cache));
    }

    getAll() { return this._cache || []; }

    getById(id) { return this._cache?.find(p => p.id === id); }

    filter({ type, status, city, minPrice, maxPrice, search } = {}) {
        let list = [...(this._cache || [])];
        if (type && type !== 'all') list = list.filter(p => p.type === type);
        if (status && status !== 'all') list = list.filter(p => p.status === status);
        if (city) list = list.filter(p => p.address?.city?.includes(city) || p.address?.district?.includes(city));
        if (minPrice) list = list.filter(p => p.price?.value >= minPrice);
        if (maxPrice) list = list.filter(p => p.price?.value <= maxPrice);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(p =>
                p.title?.toLowerCase().includes(q) ||
                p.address?.full?.toLowerCase().includes(q) ||
                p.legal?.soSo?.toLowerCase().includes(q) ||
                p.owner?.name?.toLowerCase().includes(q) ||
                p.owner?.phone?.includes(q)
            );
        }
        return list;
    }

    add(data) {
        const newProp = {
            ...data,
            id: 'BDS' + Date.now(),
            createdAt: new Date().toISOString().split('T')[0],
            updatedAt: new Date().toISOString().split('T')[0],
            viewCount: 0,
            inquiryCount: 0
        };
        this._cache = [newProp, ...(this._cache || [])];
        this._save();
        return newProp;
    }

    update(id, data) {
        const idx = this._cache?.findIndex(p => p.id === id);
        if (idx === -1 || idx === undefined) return null;
        this._cache[idx] = {
            ...this._cache[idx],
            ...data,
            id,
            updatedAt: new Date().toISOString().split('T')[0]
        };
        this._save();
        return this._cache[idx];
    }

    delete(id) {
        const before = this._cache?.length;
        this._cache = this._cache?.filter(p => p.id !== id) || [];
        this._save();
        return this._cache.length < before;
    }

    incrementView(id) {
        const p = this.getById(id);
        if (p) {
            p.viewCount = (p.viewCount || 0) + 1;
            this._save();
        }
    }

    getStats() {
        const all = this._cache || [];
        return {
            total: all.length,
            dangBan: all.filter(p => p.status === 'dang_ban').length,
            daBan: all.filter(p => p.status === 'da_ban').length,
            tamGiu: all.filter(p => p.status === 'tam_giu').length,
            choThue: all.filter(p => p.status === 'cho_thue').length,
            totalViews: all.reduce((s, p) => s + (p.viewCount || 0), 0),
            totalInquiries: all.reduce((s, p) => s + (p.inquiryCount || 0), 0)
        };
    }

    /** Format giá VND */
    static formatPrice(value, unit = 'vnd') {
        if (!value) return 'Thỏa thuận';
        if (unit === 'vnd/thang') return new Intl.NumberFormat('vi-VN').format(value) + ' đ/tháng';
        if (value >= 1e9) return (value / 1e9).toFixed(value % 1e9 === 0 ? 0 : 1) + ' tỷ';
        if (value >= 1e6) return (value / 1e6).toFixed(0) + ' triệu';
        return new Intl.NumberFormat('vi-VN').format(value) + ' đ';
    }

    static typeLabel(type) {
        const map = {
            can_ho: '🏢 Căn hộ',
            nha_pho: '🏘️ Nhà phố',
            biet_thu: '🏰 Biệt thự',
            dat_nen: '🌍 Đất nền',
            mat_bang: '🏪 Mặt bằng',
            khac: '🏗️ Khác'
        };
        return map[type] || type;
    }

    static statusLabel(s) {
        const map = {
            dang_ban: ['Đang bán', 'success'],
            da_ban: ['Đã bán', 'info'],
            tam_giu: ['Tạm giữ', 'warning'],
            cho_thue: ['Cho thuê', 'blue'],
            cho_gia: ['Chờ giá', 'muted']
        };
        return map[s] || [s, 'muted'];
    }

    static legalLabel(s) {
        const map = {
            co_so_day_du: ['✅ Sổ đầy đủ', 'success'],
            so_do: ['📗 Sổ đỏ', 'success'],
            so_hong: ['📕 Sổ hồng', 'success'],
            dang_lam_so: ['⏳ Đang làm sổ', 'warning'],
            chua_co_so: ['⚠️ Chưa có sổ', 'danger'],
            tranh_chap: ['🚫 Tranh chấp', 'danger']
        };
        return map[s] || [s, 'muted'];
    }

    /** Tạo Google Maps embed URL */
    static mapsEmbedUrl(address) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
    }

    /** Link tra cứu quy hoạch theo tỉnh */
    static getGovLinks(prop) {
        const city = prop.address?.city || '';
        const soSo = prop.legal?.soSo || '';
        const soTo = prop.legal?.soTo || '';
        const soThua = prop.legal?.soThua || '';

        const links = [
            {
                icon: '🏛️',
                name: 'Tra cứu Bộ TNMT (MONRE)',
                url: 'https://dichvucong.monre.gov.vn/',
                desc: 'Dịch vụ công Bộ Tài nguyên & Môi trường'
            },
            {
                icon: '🗺️',
                name: 'Quy hoạch Xây dựng Quốc gia',
                url: 'https://quyhoach.xaydung.gov.vn/',
                desc: 'Bản đồ quy hoạch sử dụng đất toàn quốc'
            },
            {
                icon: '📋',
                name: 'Dịch vụ công Quốc gia',
                url: 'https://dichvucong.gov.vn/',
                desc: 'Cổng dịch vụ công quốc gia'
            }
        ];

        if (city.includes('Hồ Chí Minh') || city.includes('HCM')) {
            links.push({
                icon: '🌆',
                name: 'Quy hoạch TP.HCM',
                url: 'https://quyhoach.hochiminhcity.gov.vn/',
                desc: 'Tra cứu quy hoạch đất TP.Hồ Chí Minh'
            });
        }
        if (city.includes('Hà Nội')) {
            links.push({
                icon: '🏯',
                name: 'Quy hoạch Hà Nội',
                url: 'https://quyhoach.hanoi.gov.vn/',
                desc: 'Tra cứu quy hoạch đất Hà Nội'
            });
        }
        if (city.includes('Bình Dương')) {
            links.push({
                icon: '🏭',
                name: 'DVC Bình Dương',
                url: 'https://dichvucong.binhduong.gov.vn/',
                desc: 'Tra cứu đất đai tỉnh Bình Dương'
            });
        }
        if (city.includes('Đồng Nai')) {
            links.push({
                icon: '🌿',
                name: 'DVC Đồng Nai',
                url: 'https://dichvucong.dongnai.gov.vn/',
                desc: 'Tra cứu đất đai tỉnh Đồng Nai'
            });
        }

        return links;
    }
}

window.propManager = new PropertyManager();
