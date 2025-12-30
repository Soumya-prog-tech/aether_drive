// src/hooks/useFiles.ts
import { useEffect, useState } from "react";
import axios from "axios";
import {
  fromB64,
  deriveFileKeyBytes,
  decryptData,
} from "../crypto/crypto-utils";
import { useAuth } from "../context/AuthContext";

const BASE_URL = "http://localhost:8000";

export const useFiles = (masterKey: Uint8Array | null) => {
  const { token } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState("root");
  const [history, setHistory] = useState<string[]>([]);

  const fetchItems = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const res = await axios.get(`${BASE_URL}/api/v1/items`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { folder_id: currentFolder },
      });

      const rawItems = res.data;

      // If master key is not unlocked, return raw items
      if (!masterKey) {
        setItems(rawItems);
        return;
      }

      const resolvedItems = await Promise.all(
        rawItems.map(async (item: any) => {
          // Folders are plaintext
          if (item.type === "folder") return item;

          try {
            // 1️⃣ Decode crypto params
            const salt = fromB64(item.file_salt);
            const metaIv = fromB64(item.metadata_iv);
            const encMeta = fromB64(item.encrypted_metadata);

            // 2️⃣ Derive FILE KEY BYTES (PBKDF2)
            const fileKeyBytes = await deriveFileKeyBytes(
              masterKey,
              salt
            );

            // 3️⃣ Import AES-GCM key
            const fileKey = await crypto.subtle.importKey(
              "raw",
              fileKeyBytes,
              { name: "AES-GCM" },
              false,
              ["decrypt"]
            );

            // 4️⃣ Decrypt metadata
            const decryptedMeta = await decryptData(
              fileKey,
              encMeta,
              metaIv
            );

            const metadata = JSON.parse(
              new TextDecoder().decode(decryptedMeta)
            );

            return {
              ...item,
              name: metadata.filename,
            };
          } catch (err) {
            console.error("Metadata decrypt failed:", err);
            return {
              ...item,
              name: "⚠️ Decryption failed",
            };
          }
        })
      );

      setItems(resolvedItems);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [currentFolder, token, masterKey]);

  return {
    items,
    loading,
    currentFolder,

    openFolder: (id: string) => {
      setHistory((h) => [...h, currentFolder]);
      setCurrentFolder(id);
    },

    goBack: () => {
      if (!history.length) return;
      const prev = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setCurrentFolder(prev);
    },

    refresh: fetchItems,
  };
};
