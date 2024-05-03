export const dataURLtoFile = (dataURL: string, fileName: string): File => {
    const parts = dataURL.split(";base64,");
    const contentType = parts[0].split(":")[1];
    const raw = atob(parts[1]);
    const rawLength = raw.length;
    const uint8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
        uint8Array[i] = raw.charCodeAt(i);
    }

    const blob = new Blob([uint8Array], {type: contentType});
    return new File([blob], fileName, {type: blob.type});
};
