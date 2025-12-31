// src/hooks/useAIChat.ts
import { useState } from "react";
import axios from "axios";
import {
  toB64,
  fromB64,
  deriveFileKeyBytes,
} from "../crypto/crypto-utils";
import { useAuth } from "../context/AuthContext";

const BASE_URL = "http://localhost:8000";

interface FileItem {
  id: string;
  file_salt?: string;
}

export const useAIChat = (
  masterKey: Uint8Array | null,
  allItems: FileItem[],
  selectedFiles: FileItem[]
) => {
  const { token } = useAuth();

  // =========================
  // UI State
  // =========================
  const [showChat, setShowChat] = useState(false);
  const [chatQuery, setChatQuery] = useState("");
  const [chatResponse, setChatResponse] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Context mode
  const [useFullContext, setUseFullContext] = useState(true);

  // =========================
  // Helpers
  // =========================

  /**
   * Decide which files to use:
   * - Full folder → all files
   * - Selected → selected files only
   */
  const resolveTargetFiles = (): FileItem[] => {
    if (!useFullContext && selectedFiles.length > 0) {
      return selectedFiles;
    }
    return allItems.filter((i) => i.file_salt);
  };

  /**
   * Derive per-file keys (PBKDF2)
   */
  const deriveFileKeys = async (files: FileItem[]) => {
    if (!masterKey) throw new Error("Missing master key");

    const keys: Record<string, string> = {};

    for (const file of files) {
      if (!file.file_salt) continue;

      const saltBytes = fromB64(file.file_salt);
      const fileKeyBytes = await deriveFileKeyBytes(masterKey, saltBytes);

      keys[file.id] = toB64(fileKeyBytes);
    }

    return keys;
  };

  /**
   * 1️⃣ INGEST FILES (exactly like test.py)
   */
  const ingestFiles = async (
    files: FileItem[],
    fileKeys: Record<string, string>
  ) => {
    if (!token) throw new Error("Missing token");

    for (const file of files) {
      const form = new FormData();
      form.append("file_key", fileKeys[file.id]);
      form.append("force_reingest", "false");

      await axios.post(
        `${BASE_URL}/api/v1/ai/ingest/${file.id}`,
        form,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    }
  };

  /**
   * 2️⃣ STREAMING CHAT
   */
  const runChat = async () => {
    if (!token || !masterKey) {
      alert("Session expired. Please login again.");
      return;
    }

    const files = resolveTargetFiles();
    if (files.length === 0) {
      alert("No files available for AI chat");
      return;
    }

    setChatLoading(true);
    setChatResponse("");

    try {
      // A. Derive per-file keys
      const fileKeys = await deriveFileKeys(files);

      // B. INGEST
      await ingestFiles(files, fileKeys);

      // C. CHAT PAYLOAD
      const payload = {
        query: chatQuery || "Summarize these documents.",
        file_ids: files.map((f) => f.id),
        file_keys: fileKeys,
      };

      const res = await fetch(`${BASE_URL}/api/v1/ai/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;

          try {
            const json = JSON.parse(line.replace("data: ", ""));
            if (json.type === "token") {
              setChatResponse((prev) => prev + json.data);
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      console.error("AI Chat failed", e);
      alert("AI Chat failed. Check console.");
    } finally {
      setChatLoading(false);
    }
  };

  // =========================
  // Public API
  // =========================
  return {
    // state
    showChat,
    setShowChat,

    chatQuery,
    setChatQuery,

    chatResponse,
    chatLoading,

    useFullContext,
    setUseFullContext,

    // actions
    runChat,
  };
};
