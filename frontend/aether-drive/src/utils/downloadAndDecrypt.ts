import axios from "axios";
import {
    deriveFileKeyBytes,
    decryptData,
    fromB64,
} from "../crypto/crypto-utils";

interface FileItem {
    id: string;
    name: string;
    file_salt: string;
    file_iv: string;
}

export const downloadAndDecrypt = async (
    file: FileItem,
    token: string,
    masterKey: Uint8Array
) => {
    try {
        // 1. Get SAS URL from API (Authenticated)
        const sasResp = await axios.get(
            `http://localhost:8000/api/v1/files/${file.id}/download`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        const downloadUrl = sasResp.data.download_url;

        // 2. Download from Azure (Direct, No Auth Header)
        const blobResp = await axios.get(downloadUrl, {
            responseType: "arraybuffer",
        });

        const encryptedBytes = new Uint8Array(blobResp.data);

        // 3. Re-Derive Key (Simulating fresh client state)
        const salt = fromB64(file.file_salt);
        const iv = fromB64(file.file_iv);

        const fileKeyBytes = await deriveFileKeyBytes(masterKey, salt);

        // Import key for decryption
        const fileKey = await crypto.subtle.importKey(
            "raw",
            fileKeyBytes as unknown as BufferSource,
            { name: "AES-GCM" },
            false,
            ["decrypt"]
        );

        // 4. Decrypt
        const decryptedBytes = await decryptData(fileKey, encryptedBytes, iv);

        // 5. Trigger Browser Download
        const blob = new Blob([decryptedBytes as unknown as BlobPart]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return true;
    } catch (error) {
        console.error("Download failed:", error);
        throw error;
    }
};
