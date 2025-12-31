import { useState } from "react";
import axios from "axios";
import { toB64 } from "../../crypto/crypto-utils";

interface Props {
  token: string;
  masterKey: Uint8Array;
  files: { id: string; file_salt: string }[];
  onClose: () => void;
}

const BASE_URL = "http://localhost:8000";

export const AIChatModal = ({ token, masterKey, files, onClose }: Props) => {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [useFolderContext, setUseFolderContext] = useState(false);

  const ingestFiles = async () => {
    for (const file of files) {
      const fileKey = await deriveFileKey(
        masterKey,
        fromB64(file.file_salt)
      );

      const rawKey = await crypto.subtle.exportKey("raw", fileKey);

      await axios.post(
        `${BASE_URL}/api/v1/ai/ingest/${file.id}`,
        {
          file_key: toB64(rawKey),
          force_reingest: "false",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    }
  };

  const runChat = async () => {
    setLoading(true);
    setResponse("");

    const fileKeys: Record<string, string> = {};

    for (const f of files) {
      const key = await deriveFileKey(masterKey, fromB64(f.file_salt));
      const raw = await crypto.subtle.exportKey("raw", key);
      fileKeys[f.id] = toB64(raw);
    }

    const res = await fetch(`${BASE_URL}/api/v1/ai/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        file_ids: files.map(f => f.id),
        file_keys: fileKeys,
      }),
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      chunk.split("\n").forEach((line) => {
        if (line.startsWith("data:")) {
          try {
            const json = JSON.parse(line.replace("data:", ""));
            if (json.type === "token") {
              setResponse(prev => prev + json.data);
            }
          } catch {}
        }
      });
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    await ingestFiles();
    await runChat();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-2xl rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">🤖 AI Chat</h2>

        <textarea 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask something about your files..."
          className="w-full border rounded-lg p-3 mb-4"
        />

        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useFolderContext}
              onChange={() => setUseFolderContext(!useFolderContext)}
            />
            Use full folder context
          </label>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg"
        >
          {loading ? "Thinking..." : "Ingest & Chat"}
        </button>

        <pre className="mt-4 bg-gray-100 p-4 rounded-lg h-64 overflow-y-auto">
          {response || "AI response will appear here..."}
        </pre>

        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-500"
        >
          Close
        </button>
      </div>
    </div>
  );
};
