export function compressImage(file, maxWidth = 400, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if necessary
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                if (height > maxWidth) {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // For PNGs we could use image/png, but JPEG compresses much better for base64 storage
                // If it's explicitly a transparent PNG, we might want to keep it PNG. However, JPEG is safer.
                const mimeType = (file.type === 'image/png') ? 'image/png' : 'image/jpeg';
                
                const dataUrl = canvas.toDataURL(mimeType, quality);
                resolve(dataUrl);
            };
            img.onerror = () => reject(new Error("Failed to read the image file."));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("Failed to load the file."));
        reader.readAsDataURL(file);
    });
}
