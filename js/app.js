// ============================================================
// js/app.js — Main Application Controller
// Quản lý tabs, render UI, event handlers
// ============================================================

// ── Markdown simple renderer ──
function renderMarkdown(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^---$/gm, '<hr>')
        .replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^(.+)$(?!.*<\/[huol])/gm, (m) => m.startsWith('<') ? m : `<p>${m}</p>`)
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1 🔗</a>');
}

// ── Toast ──
window.toast = function(msg, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    container.appendChild(el);
    setTimeout(() => el.remove(), duration);
};

// ── Tab Navigation ──
function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.tab === tabId));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.toggle('active', t.id === `tab-${tabId}`));
    document.getElementById('topbarTitle').textContent = {
        chat: '💬 Chat AI Tư Vấn',
        properties: '🏘️ Danh Mục Bất Động Sản',
        leads: '👥 Quản Lý Khách Hàng',
        content: '📣 Tạo Nội Dung Marketing',
        dashboard: '📊 Thống Kê Tổng Quan'
    }[tabId] || 'ARIA BĐS';
    window._currentTab = tabId;
    if (tabId === 'properties') renderProperties();
    if (tabId === 'leads') renderLeads();
    if (tabId === 'dashboard') renderDashboard();
    if (tabId === 'content') initContentTab();
}

// ══════════════════════════════════════
//  CHAT MODULE
// ══════════════════════════════════════

let _pendingImagePreviewUrl = null;

function initChat() {
    const textarea = document.getElementById('chatInput');
    const sendBtn = document.getElementById('btnSend');

    // Auto resize textarea
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });

    // Enter to send (Shift+Enter = newline)
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });

    sendBtn.addEventListener('click', sendChat);

    // Image upload button
    document.getElementById('btnUploadImage').addEventListener('click', () => {
        document.getElementById('chatImageInput').click();
    });

    document.getElementById('chatImageInput').addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
            imageUploader.processFile(file, handleImageReady);
            e.target.value = '';
        }
    });

    // Paste image in textarea
    imageUploader.initChatPaste(textarea, handleImageReady);

    // Initial greeting
    addAIMessage(`# 🏠 Xin chào! Tôi là **ARIA**

Chuyên gia tư vấn bất động sản AI của bạn. Tôi có thể giúp:

- 🔍 **Tìm kiếm BĐS** phù hợp nhu cầu của khách
- 📋 **Tra cứu pháp lý**: Sổ đỏ, quy hoạch, thửa đất
- 💰 **Phân tích đầu tư**: Giá thị trường, tiềm năng, ROI
- 📸 **Phân tích ảnh BĐS**: Upload hình để tôi đánh giá
- 📣 **Tạo nội dung** marketing Facebook/Zalo/Email
- 🎯 **Kịch bản chốt sale** và xử lý objection

Hỏi tôi bất cứ điều gì về bất động sản!`);
}

function handleImageReady(imgData) {
    _pendingImagePreviewUrl = imgData.dataUrl;
    // Show preview in input area
    document.getElementById('imagePreviewBar').style.display = 'flex';
    document.getElementById('imagePreviewThumb').src = imgData.dataUrl;
    document.getElementById('imagePreviewName').textContent = imgData.file?.name || 'Hình ảnh';
    toast('Đã đính kèm ảnh. Nhập câu hỏi hoặc nhấn Gửi để phân tích', 'info');
}

function removeImagePreview() {
    _pendingImagePreviewUrl = null;
    imageUploader.clearPending();
    document.getElementById('imagePreviewBar').style.display = 'none';
    document.getElementById('imagePreviewThumb').src = '';
}

async function sendChat() {
    const textarea = document.getElementById('chatInput');
    const sendBtn = document.getElementById('btnSend');
    const msg = textarea.value.trim();
    const pending = imageUploader.consumePending();

    if (!msg && !pending) return;
    if (ai.isProcessing) return;

    // Show user message với ảnh preview gốc
    if (pending) {
        addUserMessage(msg || '(Phân tích hình ảnh BĐS)', pending.dataUrl);
    } else {
        addUserMessage(msg);
    }

    textarea.value = '';
    textarea.style.height = 'auto';
    removeImagePreview();
    sendBtn.disabled = true;

    // Show typing indicator
    const typingId = showTyping();

    let imageBase64 = null;
    let imageMimeType = 'image/jpeg';

    // ── Resize ảnh trước khi gửi (max 800px, JPEG 80%) ──
    // Giảm payload từ ~5MB → ~200KB, Groq xử lý nhanh hơn
    if (pending?.dataUrl) {
        try {
            const resizedDataUrl = await ImageUploadHandler.resizeBase64(pending.dataUrl, 800);
            imageBase64 = resizedDataUrl.split(',')[1];
            imageMimeType = 'image/jpeg';
            const origKB = Math.round(pending.dataUrl.length * 0.75 / 1024);
            const newKB  = Math.round(imageBase64.length * 0.75 / 1024);
            console.log(`📸 Ảnh resize: ${origKB}KB → ${newKB}KB`);
        } catch (e) {
            // Fallback: dùng ảnh gốc
            imageBase64 = pending.base64;
            imageMimeType = pending.mimeType || 'image/jpeg';
        }
    }

    // Gửi lên AI (Groq Vision nếu có ảnh, DeepSeek nếu text)
    const result = await ai.sendMessage(
        msg || 'Hãy phân tích chi tiết bất động sản trong hình ảnh này.',
        imageBase64,
        imageMimeType
    );

    hideTyping(typingId);
    sendBtn.disabled = false;

    if (result) {
        addAIMessage(result.reply, result.error);
        if (result.action) handleAIAction(result.action);
    }

    renderChatSidebar();
}

function addUserMessage(text, imageDataUrl = null) {
    const msgs = document.getElementById('chatMessages');
    const time = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'});
    const imgHtml = imageDataUrl
        ? `<img src="${imageDataUrl}" class="chat-image-preview" alt="Hình BĐS">`
        : '';
    const div = document.createElement('div');
    div.className = 'msg user';
    div.innerHTML = `
        <div class="msg-avatar">👤</div>
        <div>
            <div class="msg-bubble">${imgHtml}${text ? escHtml(text) : ''}</div>
            <div class="msg-time">${time}</div>
        </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function addAIMessage(text, isError = false) {
    const msgs = document.getElementById('chatMessages');
    const time = new Date().toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'});
    const div = document.createElement('div');
    div.className = 'msg ai';
    div.innerHTML = `
        <div class="msg-avatar">🏠</div>
        <div>
            <div class="msg-bubble markdown-body ${isError ? 'text-danger' : ''}">${renderMarkdown(text)}</div>
            <div class="msg-time">${time}</div>
        </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
}

function showTyping() {
    const msgs = document.getElementById('chatMessages');
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'msg ai'; div.id = id;
    div.innerHTML = `
        <div class="msg-avatar">🏠</div>
        <div>
            <div class="msg-bubble">
                <div class="typing-indicator">
                    <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
                </div>
            </div>
        </div>`;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return id;
}

function hideTyping(id) {
    document.getElementById(id)?.remove();
}

function handleAIAction(action) {
    if (!action) return;
    switch (action.type) {
        case 'property_search':
            const results = propManager.filter(action.params || {});
            if (results.length > 0) {
                renderChatSidebar(results);
                toast(`Tìm thấy ${results.length} sản phẩm phù hợp`, 'success');
            }
            break;
        case 'lead_capture':
            if (action.params?.phone || action.params?.name) {
                openAddLeadModal(action.params);
            }
            break;
        case 'content_create':
            if (action.params?.propertyId) {
                switchTab('content');
                selectPropertyForContent(action.params.propertyId);
            }
            break;
    }
}

function renderChatSidebar(props = null) {
    const list = props || propManager.filter({ status: 'dang_ban' }).slice(0, 5);
    const container = document.getElementById('chatPropList');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:30px 16px">
            <div class="empty-state-icon">🏘️</div>
            <div class="empty-state-text">Chưa có sản phẩm trong danh mục</div>
        </div>`;
        return;
    }

    container.innerHTML = list.map(p => {
        const [statusLabel, statusColor] = PropertyManager.statusLabel(p.status);
        const img = p.media?.images?.[0];
        return `<div class="prop-mini-card" onclick="showPropertyDetail('${p.id}')">
            <div class="prop-mini-img">${img ? `<img src="${img}" alt="">` : '🏠'}</div>
            <div class="prop-mini-status badge badge-${p.status}">${statusLabel}</div>
            <div class="prop-mini-title">${escHtml(p.title)}</div>
            <div class="prop-mini-price">${p.price?.priceDisplay || PropertyManager.formatPrice(p.price?.value)}</div>
            <div class="prop-mini-meta">
                <span>📐 ${p.area?.total || 0}m²</span>
                <span>📍 ${p.address?.district || ''}</span>
            </div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════
//  PROPERTIES MODULE
// ══════════════════════════════════════

let _propImages = []; // images being added/edited

function renderProperties(filter = {}) {
    const list = propManager.filter(filter);
    const container = document.getElementById('propGrid');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
            <div class="empty-state-icon">🏘️</div>
            <div class="empty-state-title">Chưa có bất động sản nào</div>
            <div class="empty-state-text">Nhấn "+ Thêm BĐS" để bắt đầu thêm sản phẩm vào danh mục</div>
        </div>`;
        return;
    }

    container.innerHTML = list.map(p => buildPropertyCard(p)).join('');
}

function buildPropertyCard(p) {
    const [statusLabel, statusColor] = PropertyManager.statusLabel(p.status);
    const [legalLabel, legalColor] = PropertyManager.legalLabel(p.legal?.loaiSo || p.legal?.tinhTrangPhapLy);
    const img = p.media?.images?.[0];
    const typeLabel = PropertyManager.typeLabel(p.type);

    return `<div class="prop-card" onclick="showPropertyDetail('${p.id}')">
        <div class="prop-card-img">
            ${img ? `<img src="${img}" alt="${escHtml(p.title)}">` : typeLabel.split(' ')[0]}
            <span class="prop-card-badge badge badge-${p.status}">${statusLabel}</span>
            <div class="prop-card-actions" onclick="event.stopPropagation()">
                <div class="prop-card-action-btn" title="Chỉnh sửa" onclick="openEditProp('${p.id}')">✏️</div>
                <div class="prop-card-action-btn" title="Tạo nội dung" onclick="quickContent('${p.id}')">📣</div>
                <div class="prop-card-action-btn" title="Xóa" onclick="deleteProp('${p.id}')">🗑️</div>
            </div>
        </div>
        <div class="prop-card-body">
            <div class="prop-card-title">${escHtml(p.title)}</div>
            <div class="prop-card-price">${p.price?.priceDisplay || PropertyManager.formatPrice(p.price?.value, p.price?.unit)}</div>
            <div class="prop-card-meta">
                ${p.area?.total ? `<span class="meta-chip">📐 ${p.area.total}m²</span>` : ''}
                ${p.area?.frontage ? `<span class="meta-chip">↔️ ${p.area.frontage}m</span>` : ''}
                ${p.features?.bedrooms ? `<span class="meta-chip">🛏️ ${p.features.bedrooms}</span>` : ''}
                ${p.features?.floors ? `<span class="meta-chip">🏗️ ${p.features.floors} tầng</span>` : ''}
                ${p.features?.direction ? `<span class="meta-chip">🧭 ${p.features.direction}</span>` : ''}
            </div>
            <div class="prop-card-addr">
                <span>📍</span>
                <span>${escHtml(p.address?.full || '')}</span>
            </div>
            ${p.legal?.soSo ? `<div class="prop-card-legal">
                <span>${legalLabel}</span>
                ${p.legal.soSo ? `<span style="margin-left:auto;font-size:0.72rem;opacity:0.7">Sổ: ${p.legal.soSo}</span>` : ''}
            </div>` : ''}
            <div class="prop-card-footer">
                <div class="prop-card-contact">
                    ${p.owner?.isDirectOwner ? '✅ Chính chủ' : '🤝 Qua môi giới'}
                    ${p.owner?.phone ? ` · <a href="tel:${p.owner.phone}" onclick="event.stopPropagation()">${p.owner.phone}</a>` : ''}
                </div>
                <div style="font-size:0.75rem;color:var(--text-muted)">
                    👁️ ${p.viewCount || 0}
                </div>
            </div>
        </div>
    </div>`;
}

function openAddPropModal() {
    _propImages = [];
    document.getElementById('propModalTitle').textContent = '➕ Thêm Bất Động Sản Mới';
    document.getElementById('propForm').reset();
    document.getElementById('propId').value = '';
    document.getElementById('propImagePreview').innerHTML = '';
    updateGovLinksPreview();
    openModal('propModal');
}

function openEditProp(id) {
    const p = propManager.getById(id);
    if (!p) return;
    _propImages = [...(p.media?.images || [])];
    document.getElementById('propModalTitle').textContent = '✏️ Chỉnh Sửa BĐS';
    fillPropForm(p);
    renderPropImagePreview();
    updateGovLinksPreview();
    openModal('propModal');
}

function fillPropForm(p) {
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val||''; };
    document.getElementById('propId').value = p.id;
    set('propTitle', p.title);
    set('propType', p.type);
    set('propStatus', p.status);
    set('propAddrFull', p.address?.full);
    set('propAddrDistrict', p.address?.district);
    set('propAddrCity', p.address?.city);
    set('propMapLink', p.address?.googleMapLink);
    set('propPrice', p.price?.value);
    set('propPriceUnit', p.price?.unit);
    document.getElementById('propNegotiable').checked = !!p.price?.negotiable;
    set('propArea', p.area?.total);
    set('propFrontage', p.area?.frontage);
    set('propDepth', p.area?.depth);
    set('propBedrooms', p.features?.bedrooms);
    set('propBathrooms', p.features?.bathrooms);
    set('propFloors', p.features?.floors);
    set('propDirection', p.features?.direction);
    set('propSoSo', p.legal?.soSo);
    set('propLoaiSo', p.legal?.loaiSo);
    set('propSoTo', p.legal?.soTo);
    set('propSoThua', p.legal?.soThua);
    set('propTinhTrangPhapLy', p.legal?.tinhTrangPhapLy);
    set('propGhiChuPhapLy', p.legal?.ghiChuPhapLy);
    set('propOwnerName', p.owner?.name);
    set('propOwnerPhone', p.owner?.phone);
    set('propOwnerPhone2', p.owner?.phone2);
    document.getElementById('propIsDirectOwner').checked = !!p.owner?.isDirectOwner;
    set('propOwnerNote', p.owner?.note);
    set('propAgentName', p.agent?.name);
    set('propAgentPhone', p.agent?.phone);
    set('propHighlights', p.highlights?.join('\n'));
    set('propDescription', p.description);
}

function savePropForm() {
    const id = document.getElementById('propId').value;
    const get = (eid) => document.getElementById(eid)?.value?.trim() || '';

    const data = {
        title: get('propTitle'),
        type: get('propType') || 'nha_pho',
        status: get('propStatus') || 'dang_ban',
        address: {
            full: get('propAddrFull'),
            district: get('propAddrDistrict'),
            city: get('propAddrCity'),
            googleMapLink: get('propMapLink')
        },
        price: {
            value: parseFloat(get('propPrice')) || 0,
            unit: get('propPriceUnit') || 'vnd',
            negotiable: document.getElementById('propNegotiable').checked,
            priceDisplay: PropertyManager.formatPrice(parseFloat(get('propPrice')), get('propPriceUnit'))
        },
        area: {
            total: parseFloat(get('propArea')) || 0,
            frontage: parseFloat(get('propFrontage')) || 0,
            depth: parseFloat(get('propDepth')) || 0
        },
        features: {
            bedrooms: parseInt(get('propBedrooms')) || 0,
            bathrooms: parseInt(get('propBathrooms')) || 0,
            floors: parseInt(get('propFloors')) || 0,
            direction: get('propDirection')
        },
        legal: {
            soSo: get('propSoSo'),
            loaiSo: get('propLoaiSo'),
            soTo: get('propSoTo'),
            soThua: get('propSoThua'),
            tinhTrangPhapLy: get('propTinhTrangPhapLy'),
            ghiChuPhapLy: get('propGhiChuPhapLy')
        },
        owner: {
            name: get('propOwnerName'),
            phone: get('propOwnerPhone'),
            phone2: get('propOwnerPhone2'),
            isDirectOwner: document.getElementById('propIsDirectOwner').checked,
            note: get('propOwnerNote')
        },
        agent: { name: get('propAgentName'), phone: get('propAgentPhone') },
        highlights: get('propHighlights').split('\n').filter(Boolean),
        description: get('propDescription'),
        media: { images: _propImages }
    };

    if (!data.title) { toast('Vui lòng nhập tiêu đề BĐS', 'error'); return; }

    if (id) {
        propManager.update(id, data);
        toast('Đã cập nhật bất động sản thành công!', 'success');
    } else {
        propManager.add(data);
        toast('Đã thêm bất động sản mới!', 'success');
    }

    closeModal('propModal');
    renderProperties();
    renderChatSidebar();
    updateLeadBadge();
}

function deleteProp(id) {
    if (!confirm('Bạn chắc chắn muốn xóa BĐS này?')) return;
    propManager.delete(id);
    toast('Đã xóa bất động sản', 'info');
    renderProperties();
    renderChatSidebar();
}

function renderPropImagePreview() {
    const grid = document.getElementById('propImagePreview');
    grid.innerHTML = _propImages.map((img, i) =>
        `<div class="image-preview-item">
            <img src="${img}" alt="Ảnh ${i+1}">
            <button class="image-preview-remove" onclick="removePropImage(${i})">✕</button>
        </div>`
    ).join('');
}

function removePropImage(idx) {
    _propImages.splice(idx, 1);
    renderPropImagePreview();
}

function updateGovLinksPreview() {
    const city = document.getElementById('propAddrCity')?.value || '';
    const container = document.getElementById('govLinksContainer');
    if (!container) return;
    const mock = { address: { city }, legal: {} };
    const links = PropertyManager.getGovLinks(mock);
    container.innerHTML = links.slice(0, 4).map(l =>
        `<a href="${l.url}" target="_blank" class="gov-link-item">
            <span class="gov-link-icon">${l.icon}</span>
            <div>
                <div style="font-weight:600;color:var(--text-primary)">${l.name}</div>
                <div style="font-size:0.72rem">${l.desc}</div>
            </div>
            <span style="margin-left:auto;font-size:0.8rem">→</span>
        </a>`
    ).join('');
}

function showPropertyDetail(id) {
    const p = propManager.getById(id);
    if (!p) return;
    propManager.incrementView(id);
    const [legalLabel, legalColor] = PropertyManager.legalLabel(p.legal?.loaiSo || p.legal?.tinhTrangPhapLy);
    const govLinks = PropertyManager.getGovLinks(p);

    document.getElementById('detailModalTitle').textContent = p.title;
    document.getElementById('detailModalBody').innerHTML = `
        ${p.media?.images?.length ? `
            <div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:20px;padding-bottom:8px">
                ${p.media.images.map(img => `<img src="${img}" style="height:180px;border-radius:10px;object-fit:cover;flex-shrink:0;">`).join('')}
            </div>` : ''}

        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
            <span class="badge badge-${p.status}">${PropertyManager.statusLabel(p.status)[0]}</span>
            <span class="badge" style="background:var(--gold-alpha);color:var(--gold)">${PropertyManager.typeLabel(p.type)}</span>
            ${p.owner?.isDirectOwner ? '<span class="badge" style="background:var(--success-alpha);color:var(--success)">✅ Chính chủ</span>' : ''}
            <span class="badge badge-${legalColor}">${legalLabel}</span>
        </div>

        <div class="form-section">
            <div class="form-section-title">💰 Giá & Diện Tích</div>
            <div class="detail-row">
                <div class="detail-label">Giá</div>
                <div class="detail-value fw-bold text-gold" style="font-size:1.1rem">${p.price?.priceDisplay || PropertyManager.formatPrice(p.price?.value, p.price?.unit)} ${p.price?.negotiable ? '<span style="font-size:0.8rem;color:var(--text-secondary)">(Thương lượng)</span>' : ''}</div>
            </div>
            ${p.price?.pricePerM2 ? `<div class="detail-row"><div class="detail-label">Giá/m²</div><div class="detail-value">${PropertyManager.formatPrice(p.price.pricePerM2)}/m²</div></div>` : ''}
            <div class="detail-row">
                <div class="detail-label">Diện tích</div>
                <div class="detail-value">${p.area?.total || 0} m² (mặt tiền ${p.area?.frontage || 0}m × sâu ${p.area?.depth || 0}m)</div>
            </div>
        </div>

        <div class="form-section">
            <div class="form-section-title">📍 Vị Trí</div>
            <div class="detail-row"><div class="detail-label">Địa chỉ</div><div class="detail-value">${escHtml(p.address?.full || '')}</div></div>
            ${p.address?.googleMapLink ? `
                <div class="detail-row">
                    <div class="detail-label">Google Maps</div>
                    <div class="detail-value">
                        <a href="${p.address.googleMapLink}" target="_blank" class="btn btn-sm btn-secondary">🗺️ Xem trên Google Maps</a>
                    </div>
                </div>` : ''}
        </div>

        <div class="form-section">
            <div class="form-section-title">📜 Pháp Lý & Sổ Sách</div>
            ${p.legal?.soSo ? `<div class="detail-row"><div class="detail-label">Số sổ GCN</div><div class="detail-value fw-bold">${escHtml(p.legal.soSo)}</div></div>` : ''}
            ${p.legal?.loaiSo ? `<div class="detail-row"><div class="detail-label">Loại sổ</div><div class="detail-value">${legalLabel}</div></div>` : ''}
            ${p.legal?.soTo ? `<div class="detail-row"><div class="detail-label">Số tờ / Số thửa</div><div class="detail-value">Tờ số ${p.legal.soTo} — Thửa số ${p.legal.soThua || '?'}</div></div>` : ''}
            ${p.legal?.ghiChuPhapLy ? `<div class="detail-row"><div class="detail-label">Ghi chú</div><div class="detail-value">${escHtml(p.legal.ghiChuPhapLy)}</div></div>` : ''}
            <div class="detail-row">
                <div class="detail-label">Tra cứu Online</div>
                <div class="detail-value">
                    <div class="gov-links">${govLinks.slice(0,3).map(l =>
                        `<a href="${l.url}" target="_blank" class="gov-link-item">
                            <span class="gov-link-icon">${l.icon}</span>
                            <span>${l.name}</span>
                            <span style="margin-left:auto">↗️</span>
                        </a>`).join('')}
                    </div>
                </div>
            </div>
        </div>

        <div class="form-section">
            <div class="form-section-title">👤 Liên Hệ Chính Chủ</div>
            ${p.owner?.name ? `<div class="detail-row"><div class="detail-label">Họ tên</div><div class="detail-value fw-bold">${escHtml(p.owner.name)} ${p.owner.isDirectOwner ? '(Chính chủ)' : ''}</div></div>` : ''}
            ${p.owner?.phone ? `<div class="detail-row"><div class="detail-label">Điện thoại</div><div class="detail-value"><a href="tel:${p.owner.phone}" class="fw-bold">${p.owner.phone}</a> ${p.owner.phone2 ? `/ <a href="tel:${p.owner.phone2}">${p.owner.phone2}</a>` : ''}</div></div>` : ''}
            ${p.owner?.note ? `<div class="detail-row"><div class="detail-label">Ghi chú</div><div class="detail-value text-secondary">${escHtml(p.owner.note)}</div></div>` : ''}
        </div>

        ${p.description ? `<div class="form-section">
            <div class="form-section-title">📝 Mô Tả</div>
            <div style="font-size:0.9rem;line-height:1.7;color:var(--text-secondary)">${escHtml(p.description)}</div>
        </div>` : ''}

        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="quickContent('${p.id}');closeModal('detailModal')">📣 Tạo nội dung Marketing</button>
            <button class="btn btn-secondary" onclick="openEditProp('${p.id}');closeModal('detailModal')">✏️ Chỉnh sửa</button>
            <button class="btn btn-secondary" onclick="chatAboutProp('${p.id}');closeModal('detailModal')">💬 Hỏi AI về BĐS này</button>
        </div>
    `;
    openModal('detailModal');
}

function chatAboutProp(id) {
    const p = propManager.getById(id);
    if (!p) return;
    switchTab('chat');
    document.getElementById('chatInput').value = `Tư vấn cho tôi về bất động sản: ${p.title}. Giá ${p.price?.priceDisplay}. Địa chỉ: ${p.address?.full}`;
}

function quickContent(id) {
    switchTab('content');
    setTimeout(() => selectPropertyForContent(id), 100);
}

// ══════════════════════════════════════
//  LEADS MODULE
// ══════════════════════════════════════

function renderLeads(filterStatus = 'all') {
    const list = leadManager.filter({ status: filterStatus === 'all' ? undefined : filterStatus });
    const container = document.getElementById('leadsList');
    const stats = leadManager.getStats();

    // Update stats
    ['total','moi','dangCham','daChot'].forEach(k => {
        const el = document.getElementById(`leadStat_${k}`);
        if (el) el.textContent = stats[k] || 0;
    });

    if (!list.length) {
        container.innerHTML = `<div class="empty-state">
            <div class="empty-state-icon">👥</div>
            <div class="empty-state-title">Chưa có lead nào</div>
            <div class="empty-state-text">Lead khách hàng sẽ được AI tự ghi nhận khi họ hỏi thông tin</div>
        </div>`;
        return;
    }

    container.innerHTML = list.map(l => buildLeadCard(l)).join('');
}

function buildLeadCard(l) {
    const st = LeadManager.statusInfo(l.status);
    const pr = LeadManager.priorityInfo(l.priority);
    const ago = LeadManager.timeAgo(l.createdAt);

    return `<div class="lead-card" onclick="showLeadDetail('${l.id}')">
        <div class="lead-header">
            <div>
                <div class="lead-name">${escHtml(l.name)}</div>
                <div class="lead-phone">📞 ${l.phone || 'Chưa có SĐT'}</div>
            </div>
            <div style="text-align:right">
                <div class="badge badge-${l.status}" style="background:var(--${st.color === 'info' ? 'info' : st.color}-alpha);color:var(--${st.color === 'info' ? 'info' : st.color});border:1px solid var(--${st.color === 'info' ? 'info' : st.color})">${st.icon} ${st.label}</div>
                <div style="font-size:0.72rem;color:var(--text-muted);margin-top:4px">${ago}</div>
            </div>
        </div>
        ${l.nhuCau ? `<div style="font-size:0.82rem;color:var(--text-secondary);margin:6px 0">💬 ${escHtml(l.nhuCau)}</div>` : ''}
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            ${l.loaiBds ? `<span class="meta-chip">${l.loaiBds}</span>` : ''}
            ${l.ngangSach ? `<span class="meta-chip">💰 ${l.ngangSach}</span>` : ''}
            ${l.khuVucMong ? `<span class="meta-chip">📍 ${l.khuVucMong}</span>` : ''}
        </div>
        <div style="display:flex;gap:8px;margin-top:10px" onclick="event.stopPropagation()">
            <a href="tel:${l.phone}" class="btn btn-sm btn-success">📞 Gọi</a>
            <button class="btn btn-sm btn-secondary" onclick="updateLeadStatus('${l.id}')">🔄 Cập nhật</button>
            <button class="btn btn-sm btn-ghost" onclick="deleteLeadConfirm('${l.id}')">🗑️</button>
        </div>
    </div>`;
}

function openAddLeadModal(prefill = {}) {
    document.getElementById('leadForm').reset();
    document.getElementById('leadId').value = '';
    if (prefill.name) document.getElementById('leadName').value = prefill.name;
    if (prefill.phone) document.getElementById('leadPhone').value = prefill.phone;
    if (prefill.nhuCau) document.getElementById('leadNhuCau').value = prefill.nhuCau;
    openModal('leadModal');
}

function saveLeadForm() {
    const id = document.getElementById('leadId').value;
    const get = (eid) => document.getElementById(eid)?.value?.trim() || '';
    const data = {
        name: get('leadName'),
        phone: get('leadPhone'),
        email: get('leadEmail'),
        nhuCau: get('leadNhuCau'),
        loaiBds: get('leadLoaiBds'),
        ngangSach: get('leadNganSach'),
        khuVucMong: get('leadKhuVuc'),
        notes: get('leadNotes'),
        nguonDen: get('leadNguon') || 'thu_cong',
        priority: get('leadPriority') || 'normal'
    };
    if (!data.name) { toast('Vui lòng nhập tên khách hàng', 'error'); return; }

    if (id) {
        leadManager.update(id, data);
        toast('Đã cập nhật thông tin khách hàng', 'success');
    } else {
        leadManager.add(data);
        toast('Đã thêm lead mới!', 'success');
        updateLeadBadge();
    }
    closeModal('leadModal');
    renderLeads();
}

function showLeadDetail(id) {
    const l = leadManager.getById(id);
    if (!l) return;
    const st = LeadManager.statusInfo(l.status);

    document.getElementById('leadDetailTitle').textContent = l.name;
    document.getElementById('leadDetailBody').innerHTML = `
        <div class="detail-row"><div class="detail-label">Trạng thái</div><div class="detail-value"><span class="badge">${st.icon} ${st.label}</span></div></div>
        <div class="detail-row"><div class="detail-label">Điện thoại</div><div class="detail-value"><a href="tel:${l.phone}" class="fw-bold">${l.phone}</a></div></div>
        ${l.email ? `<div class="detail-row"><div class="detail-label">Email</div><div class="detail-value"><a href="mailto:${l.email}">${l.email}</a></div></div>` : ''}
        <div class="detail-row"><div class="detail-label">Nhu cầu</div><div class="detail-value">${escHtml(l.nhuCau || 'Chưa ghi rõ')}</div></div>
        ${l.loaiBds ? `<div class="detail-row"><div class="detail-label">Loại BĐS</div><div class="detail-value">${l.loaiBds}</div></div>` : ''}
        ${l.ngangSach ? `<div class="detail-row"><div class="detail-label">Ngân sách</div><div class="detail-value">${l.ngangSach}</div></div>` : ''}
        ${l.khuVucMong ? `<div class="detail-row"><div class="detail-label">Khu vực</div><div class="detail-value">${l.khuVucMong}</div></div>` : ''}
        ${l.notes ? `<div class="detail-row"><div class="detail-label">Ghi chú</div><div class="detail-value">${escHtml(l.notes)}</div></div>` : ''}

        <div style="margin-top:16px">
            <div class="form-section-title">📅 Lịch Sử Chăm Sóc</div>
            <div style="margin-top:12px">
                ${(l.timeline || []).map(t => `
                    <div class="timeline-item">
                        <div class="timeline-dot"></div>
                        <div>
                            <div style="font-weight:600">${t.action}</div>
                            <div style="font-size:0.78rem;color:var(--text-muted)">${t.note} · ${new Date(t.date).toLocaleDateString('vi-VN')}</div>
                        </div>
                    </div>`).join('')}
            </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:20px;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="updateLeadStatusModal('${l.id}')">🔄 Cập nhật trạng thái</button>
            <button class="btn btn-secondary" onclick="openEditLeadModal('${l.id}')">✏️ Chỉnh sửa</button>
            <a href="tel:${l.phone}" class="btn btn-success">📞 Gọi ngay</a>
        </div>
    `;
    openModal('leadDetailModal');
}

function updateLeadStatus(id) {
    const statuses = ['moi','dang_cham','xem_nha','da_chot','that_bai'];
    const labels = ['🆕 Mới','🔥 Đang chăm sóc','🏠 Xem nhà','✅ Đã chốt','❌ Thất bại'];
    const choice = prompt(`Cập nhật trạng thái:\n${labels.map((l,i) => `${i+1}. ${l}`).join('\n')}\n\nNhập số (1-5):`);
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < statuses.length) {
        leadManager.updateStatus(id, statuses[idx]);
        toast(`Đã cập nhật: ${labels[idx]}`, 'success');
        renderLeads();
        updateLeadBadge();
    }
}

function updateLeadStatusModal(id) {
    closeModal('leadDetailModal');
    updateLeadStatus(id);
}

function openEditLeadModal(id) {
    const l = leadManager.getById(id);
    if (!l) return;
    closeModal('leadDetailModal');
    document.getElementById('leadId').value = l.id;
    document.getElementById('leadName').value = l.name;
    document.getElementById('leadPhone').value = l.phone;
    document.getElementById('leadEmail').value = l.email || '';
    document.getElementById('leadNhuCau').value = l.nhuCau || '';
    openModal('leadModal');
}

function deleteLeadConfirm(id) {
    if (!confirm('Xóa lead này?')) return;
    leadManager.delete(id);
    toast('Đã xóa lead', 'info');
    renderLeads();
    updateLeadBadge();
}

function updateLeadBadge() {
    const stats = leadManager.getStats();
    const badge = document.getElementById('leadNavBadge');
    if (badge) badge.textContent = stats.moi || 0;
}

// ══════════════════════════════════════
//  CONTENT MODULE
// ══════════════════════════════════════

let _contentSelectedPropId = null;
let _contentSelectedType = 'facebook';

function initContentTab() {
    renderContentPropSelector();
}

function selectPropertyForContent(id) {
    _contentSelectedPropId = id;
    renderContentPropSelector();
}

function renderContentPropSelector() {
    const list = propManager.getAll();
    const sel = document.getElementById('contentPropSelect');
    if (!sel) return;
    sel.innerHTML = `<option value="">-- Chọn BĐS --</option>` +
        list.map(p => `<option value="${p.id}" ${p.id === _contentSelectedPropId ? 'selected' : ''}>${p.title}</option>`).join('');
    if (_contentSelectedPropId) sel.value = _contentSelectedPropId;
}

function selectContentType(type) {
    _contentSelectedType = type;
    document.querySelectorAll('.content-type-btn').forEach(b => {
        b.classList.toggle('selected', b.dataset.type === type);
    });
}

async function generateContent() {
    const propId = document.getElementById('contentPropSelect')?.value || _contentSelectedPropId;
    if (!propId) { toast('Vui lòng chọn bất động sản', 'error'); return; }

    const p = propManager.getById(propId);
    if (!p) { toast('Không tìm thấy BĐS', 'error'); return; }

    const btn = document.getElementById('btnGenerateContent');
    const output = document.getElementById('contentOutput');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner"></div> Đang tạo...';
    output.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted)"><div class="spinner" style="margin:0 auto 12px"></div>AI đang viết nội dung...</div>';

    try {
        const res = await fetch('/api/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ property: p, contentType: _contentSelectedType })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Lỗi tạo nội dung');

        output.innerHTML = `
            <button class="btn btn-sm btn-secondary content-copy-btn" onclick="copyContent()">📋 Sao chép</button>
            <div id="contentText" style="white-space:pre-wrap">${escHtml(data.content)}</div>`;

        // Save to property
        if (!p.marketingContent) p.marketingContent = {};
        p.marketingContent[_contentSelectedType] = data.content;
        propManager.update(p.id, { marketingContent: p.marketingContent });

        toast('Đã tạo nội dung thành công!', 'success');

    } catch (err) {
        output.innerHTML = `<div class="text-danger">❌ ${err.message}</div>`;
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '✨ Tạo Nội Dung';
    }
}

function copyContent() {
    const text = document.getElementById('contentText')?.textContent || '';
    navigator.clipboard.writeText(text).then(() => toast('Đã sao chép vào clipboard!', 'success'));
}

// ══════════════════════════════════════
//  DASHBOARD MODULE
// ══════════════════════════════════════

function renderDashboard() {
    const ps = propManager.getStats();
    const ls = leadManager.getStats();

    const setEl = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    setEl('dash_total_prop', ps.total);
    setEl('dash_dang_ban', ps.dangBan);
    setEl('dash_cho_thue', ps.choThue);
    setEl('dash_da_ban', ps.daBan);
    setEl('dash_total_lead', ls.total);
    setEl('dash_lead_moi', ls.moi);
    setEl('dash_lead_cham', ls.dangCham);
    setEl('dash_da_chot', ls.daChot);

    // Recent properties
    const recentProps = propManager.getAll().slice(0, 5);
    const recentPropsEl = document.getElementById('dash_recent_props');
    if (recentPropsEl) {
        recentPropsEl.innerHTML = recentProps.map(p =>
            `<div class="detail-row" style="cursor:pointer" onclick="showPropertyDetail('${p.id}')">
                <div style="flex:1;font-size:0.875rem;font-weight:600">${escHtml(p.title)}</div>
                <div style="font-size:0.82rem;color:var(--gold)">${p.price?.priceDisplay || 'TT'}</div>
                <div style="margin-left:8px"><span class="badge badge-${p.status}">${PropertyManager.statusLabel(p.status)[0]}</span></div>
            </div>`
        ).join('') || '<div class="text-muted" style="padding:16px">Chưa có sản phẩm</div>';
    }

    // Recent leads
    const recentLeads = leadManager.getAll().slice(0, 5);
    const recentLeadsEl = document.getElementById('dash_recent_leads');
    if (recentLeadsEl) {
        recentLeadsEl.innerHTML = recentLeads.map(l => {
            const st = LeadManager.statusInfo(l.status);
            return `<div class="detail-row" style="cursor:pointer" onclick="showLeadDetail('${l.id}')">
                <div style="flex:1">
                    <div style="font-size:0.875rem;font-weight:600">${escHtml(l.name)}</div>
                    <div style="font-size:0.78rem;color:var(--text-secondary)">${l.phone}</div>
                </div>
                <div style="font-size:0.78rem">${st.icon} ${st.label}</div>
            </div>`;
        }).join('') || '<div class="text-muted" style="padding:16px">Chưa có khách hàng</div>';
    }
}

// ══════════════════════════════════════
//  MODAL HELPERS
// ══════════════════════════════════════

function openModal(id) {
    document.getElementById(id)?.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id)?.classList.remove('active');
    document.body.style.overflow = '';
}

// Close on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ── Escape key to close modals ──
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
            m.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
});

// ── Utility ──
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════
//  PROPERTY IMAGE UPLOAD (in form)
// ══════════════════════════════════════

async function handlePropImageUpload(input) {
    const files = [...input.files].filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    const results = await ImageUploadHandler.filesToBase64Array(files);
    results.forEach(r => _propImages.push(r.dataUrl));
    renderPropImagePreview();
    toast(`Đã thêm ${files.length} ảnh`, 'success');
    input.value = '';
}

// ══════════════════════════════════════
//  INIT
// ══════════════════════════════════════

async function init() {
    // Load data
    await propManager.load();
    leadManager.load();

    // Default tab
    switchTab('chat');
    initChat();
    renderChatSidebar();
    updateLeadBadge();

    console.log('✅ ARIA BĐS initialized');
}

init();
