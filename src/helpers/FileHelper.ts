export const dataURLtoFile = (dataURL: string, fileName: string): File => {
    const parts = dataURL.split(";base64,");
    const mimeType = parts[0].split(":")[1];
    const raw = atob(parts[1]);
    const rawLength = raw.length;
    const uint8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
        uint8Array[i] = raw.charCodeAt(i);
    }

    const blob = new Blob([uint8Array], { type: mimeType });
    return new File([blob], `${fileName}${getFileExtensionFromMimeType(mimeType)}`, { type: blob.type });
};


function getFileExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: {[key: string]: string} = {
        'text/plain': 'txt',
        'text/html': 'html',
        'text/css': 'css',
        'text/javascript': 'js',
        'application/json': 'json',
        'application/xml': 'xml',
        'application/pdf': 'pdf',
        'application/zip': 'zip',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'audio/mpeg': 'mp3',
        'audio/ogg': 'ogg',
        'audio/wav': 'wav',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/x-msvideo': 'avi',
        // Add more mappings as needed
    };

    return mimeToExt[mimeType] ? `.${mimeToExt[mimeType]}` : ``;
}