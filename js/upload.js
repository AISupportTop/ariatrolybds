// ============================================================
// js/upload.js — Image Upload Handler
// Hỗ trợ: drag & drop, paste, file picker
// Output: Base64 cho AI Vision Analysis
// ============================================================

class ImageUploadHandler {
    constructor() {
        this._pendingImage = null; // { base64, mimeType, dataUrl, file }
    }

    /**
     * Khởi tạo khu vực chat input cho paste ảnh
     */
    initChatPaste(textarea, onImageReady) {
        textarea.addEventListener('paste', (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    this.processFile(file, onImageReady);
                    break;
                }
            }
        });
    }

    /**
     * Xử lý file ảnh → Base64
     */
    processFile(file, onImageReady) {
        if (!file || !file.type.startsWith('image/')) {
            toast('Vui lòng chọn file hình ảnh (JPG, PNG, WEBP)', 'error');
            return;
        }

        const maxMB = 10;
        if (file.size > maxMB * 1024 * 1024) {
            toast(`Ảnh quá lớn. Vui lòng chọn ảnh dưới ${maxMB}MB`, 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            // dataUrl = "data:image/jpeg;base64,XXXXX"
            const base64 = dataUrl.split(',')[1];
            const mimeType = file.type;

            this._pendingImage = { base64, mimeType, dataUrl, file, name: file.name };

            if (typeof onImageReady === 'function') {
                onImageReady(this._pendingImage);
            }
        };
        reader.readAsDataURL(file);
    }

    /**
     * Lấy và xóa ảnh đang chờ
     */
    consumePending() {
        const img = this._pendingImage;
        this._pendingImage = null;
        return img;
    }

    hasPending() { return !!this._pendingImage; }

    clearPending() { this._pendingImage = null; }

    /**
     * Resize ảnh xuống max 1024px để tiết kiệm token
     */
    static resizeBase64(dataUrl, maxSize = 1024) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = Math.round(height * maxSize / width);
                        width = maxSize;
                    } else {
                        width = Math.round(width * maxSize / height);
                        height = maxSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const resized = canvas.toDataURL('image/jpeg', 0.85);
                resolve(resized);
            };
            img.src = dataUrl;
        });
    }

    /**
     * Khởi tạo drag & drop cho property image uploader
     */
    static initDropZone(zone, onFiles) {
        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragging');
        });
        zone.addEventListener('dragleave', () => zone.classList.remove('dragging'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragging');
            const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
            if (files.length) onFiles(files);
        });
    }

    /**
     * Chuyển nhiều files thành array of base64
     */
    static async filesToBase64Array(files) {
        const results = [];
        for (const file of files) {
            const result = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve({
                    dataUrl: e.target.result,
                    base64: e.target.result.split(',')[1],
                    mimeType: file.type,
                    name: file.name,
                    size: file.size
                });
                reader.readAsDataURL(file);
            });
            results.push(result);
        }
        return results;
    }
}

window.imageUploader = new ImageUploadHandler();
