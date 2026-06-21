// ============================================================
// js/leads.js — Lead Manager (localStorage)
// ============================================================

const LEADS_KEY = 'aria_bds_leads';

class LeadManager {
    constructor() {
        this._cache = null;
    }

    load() {
        const local = localStorage.getItem(LEADS_KEY);
        if (local) {
            try { this._cache = JSON.parse(local); return; } catch (_) {}
        }
        this._cache = [];
    }

    _save() { localStorage.setItem(LEADS_KEY, JSON.stringify(this._cache)); }

    getAll() { return [...(this._cache || [])].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); }

    getById(id) { return this._cache?.find(l => l.id === id); }

    filter({ status } = {}) {
        let list = this.getAll();
        if (status && status !== 'all') list = list.filter(l => l.status === status);
        return list;
    }

    add(data) {
        const lead = {
            id: 'LEAD' + Date.now(),
            name: data.name || 'Khách hàng',
            phone: data.phone || '',
            email: data.email || '',
            nguonDen: data.nguonDen || 'chat_ai',
            nhuCau: data.nhuCau || '',
            loaiBds: data.loaiBds || '',
            ngangSach: data.ngangSach || '',
            khuVucMong: data.khuVucMong || '',
            propertyInterested: data.propertyInterested || '',
            status: 'moi',
            priority: data.priority || 'normal',
            notes: data.notes || '',
            timeline: [{
                date: new Date().toISOString(),
                action: '📥 Tạo lead',
                note: `Lead mới từ ${data.nguonDen || 'Chat AI'}`
            }],
            nextFollowUp: data.nextFollowUp || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        this._cache = [lead, ...(this._cache || [])];
        this._save();
        return lead;
    }

    update(id, data) {
        const idx = this._cache?.findIndex(l => l.id === id);
        if (idx === -1 || idx === undefined) return null;
        this._cache[idx] = { ...this._cache[idx], ...data, id, updatedAt: new Date().toISOString() };
        this._save();
        return this._cache[idx];
    }

    addTimeline(id, action, note) {
        const lead = this.getById(id);
        if (!lead) return;
        lead.timeline = lead.timeline || [];
        lead.timeline.push({ date: new Date().toISOString(), action, note });
        lead.updatedAt = new Date().toISOString();
        this._save();
        return lead;
    }

    updateStatus(id, status) {
        const statusLabels = {
            moi: '🆕 Lead mới',
            dang_cham: '🔥 Đang chăm sóc',
            xem_nha: '🏠 Đã xem nhà',
            da_chot: '✅ Đã chốt',
            that_bai: '❌ Thất bại'
        };
        this.addTimeline(id, '🔄 Cập nhật trạng thái', statusLabels[status] || status);
        return this.update(id, { status });
    }

    delete(id) {
        const before = this._cache?.length;
        this._cache = this._cache?.filter(l => l.id !== id) || [];
        this._save();
        return (this._cache?.length || 0) < before;
    }

    getStats() {
        const all = this._cache || [];
        return {
            total: all.length,
            moi: all.filter(l => l.status === 'moi').length,
            dangCham: all.filter(l => l.status === 'dang_cham').length,
            xemNha: all.filter(l => l.status === 'xem_nha').length,
            daChot: all.filter(l => l.status === 'da_chot').length,
            thatBai: all.filter(l => l.status === 'that_bai').length
        };
    }

    static statusInfo(s) {
        const map = {
            moi:       { label: 'Mới', color: 'info',    icon: '🆕' },
            dang_cham: { label: 'Đang chăm', color: 'warning', icon: '🔥' },
            xem_nha:   { label: 'Xem nhà',   color: 'blue',    icon: '🏠' },
            da_chot:   { label: 'Đã chốt',   color: 'success', icon: '✅' },
            that_bai:  { label: 'Thất bại',  color: 'danger',  icon: '❌' }
        };
        return map[s] || { label: s, color: 'muted', icon: '•' };
    }

    static priorityInfo(p) {
        const map = {
            hot:    { label: '🔥 Hot',    color: 'danger' },
            high:   { label: '⬆️ Cao',   color: 'warning' },
            normal: { label: '→ Bình thường', color: 'muted' },
            low:    { label: '⬇️ Thấp',  color: 'muted' }
        };
        return map[p] || map.normal;
    }

    static timeAgo(iso) {
        const diff = Date.now() - new Date(iso).getTime();
        const m = Math.floor(diff / 60000);
        const h = Math.floor(m / 60);
        const d = Math.floor(h / 24);
        if (d > 0) return `${d} ngày trước`;
        if (h > 0) return `${h} giờ trước`;
        if (m > 0) return `${m} phút trước`;
        return 'Vừa xong';
    }
}

window.leadManager = new LeadManager();
