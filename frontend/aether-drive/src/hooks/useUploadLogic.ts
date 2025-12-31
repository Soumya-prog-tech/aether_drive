
import { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
    generateRandomBytes,
    deriveFileKeyBytes,
    encryptData,
    toB64,
} from "../crypto/crypto-utils";
import { generateThumbnail } from "../utils/thumbnailUtils";

export type UploadStatus = "idle" | "encrypting" | "uploading" | "done";

export const useUploadLogic = (
    folderId: string,
    onSuccess: () => void,
    onClose: () => void
) => {
    const { token, masterKey } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<UploadStatus>("idle");

    const handleUpload = async () => {
        if (!file || !masterKey || !token) return;

        try {
            setStatus("encrypting");

            // 1. Read file bytes
            const fileBuffer = await file.arrayBuffer();
            const fileBytes = new Uint8Array(fileBuffer);

            // 2. Generate per-file salt (16 bytes)
            const fileSalt = generateRandomBytes(16);

            // 3. Derive FILE KEY BYTES (PBKDF2)
            const fileKeyBytes = await deriveFileKeyBytes(masterKey, fileSalt);

            // 4. Import AES-GCM key
            const fileKey = await crypto.subtle.importKey(
                "raw",
                fileKeyBytes as unknown as BufferSource,
                { name: "AES-GCM" },
                false,
                ["encrypt"]
            );



            // ...

            // 5. Encrypt file content
            const { ciphertext: encFile, iv: fileIv } = await encryptData(
                fileKey,
                fileBytes
            );

            // 6. Generate Thumbnail & Encrypt Metadata
            const thumbnail = await generateThumbnail(file);

            const metaJson = JSON.stringify({
                filename: file.name,
                thumbnail: thumbnail // { type, mime, data } or null
            });

            const { ciphertext: encMeta, iv: metaIv } = await encryptData(
                fileKey,
                metaJson
            );

            setStatus("uploading");

            // 7. Prepare multipart form data
            const formData = new FormData();
            formData.append("encrypted_file", new Blob([encFile]), file.name);
            formData.append("encrypted_metadata", toB64(encMeta));
            formData.append("metadata_iv", toB64(metaIv));
            formData.append("file_iv", toB64(fileIv));
            formData.append("file_salt", toB64(fileSalt));
            formData.append("folder_id", folderId);

            // 8. Upload to backend
            await axios.post("http://localhost:8000/api/v1/files/upload", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setStatus("done");
            onSuccess();
            setTimeout(onClose, 800);
        } catch (e) {
            console.error("Upload failed:", e);
            alert("Upload failed. See console for details.");
            setStatus("idle");
        }
    };

    return {
        file,
        setFile,
        status,
        handleUpload,
    };
};
