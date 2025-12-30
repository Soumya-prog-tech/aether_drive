// components/AIChatPanel.jsx
import React, { useState, useMemo } from "react";
import { X } from "lucide-react";
import AIConsentModal from "./AIConsentModal"; // you already have or stub this

import { api } from "../services/api";
import { exportKey } from "../services/crypto";

// ✅ Helper to fetch SSE
const fetchChatStream = async ({ query, fileIds, fileKeys, onChunk, onSources, onError }) => {
  try {
    const response = await fetch("/api/v1/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": api.defaults.headers.common["Authorization"] || "",
      },
      body: JSON.stringify({
        query,
        file_ids: fileIds,
        file_keys: fileKeys,
      }),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop(); // Keep incomplete chunk

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr) continue;

          try {
            const data = JSON.parse(jsonStr);
            if (data.type === "token") onChunk(data.data);
            if (data.type === "sources") onSources(data.data);
            if (data.type === "error") onError(data.data);
            if (data.type === "end") return;
          } catch (e) {
            console.error("SSE Parse Error", e);
          }
        }
      }
    }
  } catch (err) {
    onError(err.message);
  }
};

const AIChatPanel = ({
  onClose,
  currentFolderId,
  items = [],
  selectedItems = [],
  encryptionKey,
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isConsentOpen, setConsentOpen] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState(null);

  // remember consent in session
  const [consent, setConsent] = useState(() => {
    const raw = sessionStorage.getItem("ai_consent");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const consentValid = useMemo(() => {
    if (!consent) return false;
    if (!consent.remember) return false;
    const age = Date.now() - consent.timestamp;
    return age < consent.ttlMinutes * 60_000;
  }, [consent]);

  const openConsentIfNeeded = async (question) => {
    if (consentValid) {
      await handleAskWithConsent(question, consent);
    } else {
      setPendingQuestion(question);
      setConsentOpen(true);
    }
  };

  const onConfirmConsent = async (c) => {
    const payload = { ...c, timestamp: Date.now() };
    if (c.remember) {
      sessionStorage.setItem("ai_consent", JSON.stringify(payload));
      setConsent(payload);
    } else {
      setConsent(null);
      sessionStorage.removeItem("ai_consent");
    }
    setConsentOpen(false);
    if (pendingQuestion) {
      await handleAskWithConsent(pendingQuestion, payload);
      setPendingQuestion(null);
    }
  };

  const handleAsk = async () => {
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", content: q }]);
    setInput("");
    await openConsentIfNeeded(q);
  };

  const handleAskWithConsent = async (question, c) => {
    try {
      // 1. Determine File IDs based on scope
      let targetFileIds = [];
      if (c.scope === "selected") {
        targetFileIds = c.itemIds || selectedItems.map((i) => i.id);
      } else if (c.scope === "folder" || c.scope === "whole_drive") {
        // Note: "whole_drive" might need a different backend approach if too many files
        // For now, we just grab all loaded file items
        targetFileIds = items.filter((i) => i.type === "file").map((i) => i.id);
      }

      if (targetFileIds.length === 0) {
        setMessages((m) => [...m, { role: "assistant", content: "⚠️ No files selected for context." }]);
        return;
      }

      // 2. Prepare Keys
      // We already derived fileKey in DashboardPage.jsx and stored it in the item object.
      // We just need to export it.

      const fileKeys = {};

      for (const fid of targetFileIds) {
        const item = items.find(i => i.id === fid);
        if (item && item.fileKey) {
          fileKeys[fid] = await exportKey(item.fileKey);
        } else {
          console.warn(`No key found for file ${fid}`);
        }
      }

      // 3. Stream Response
      let currentAnswer = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]); // Placeholder

      await fetchChatStream({
        query: question,
        fileIds: targetFileIds,
        fileKeys: fileKeys,
        onChunk: (token) => {
          currentAnswer += token;
          setMessages((prev) => {
            const newMsgs = [...prev];
            newMsgs[newMsgs.length - 1].content = currentAnswer;
            return newMsgs;
          });
        },
        onSources: (sources) => {
          console.log("Sources:", sources);
          // You could display sources in the UI if you want
        },
        onError: (err) => {
          setMessages((m) => [...m, { role: "assistant", content: `⚠️ Error: ${err}` }]);
        }
      });

    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "⚠️ Couldn’t process request." },
      ]);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[30%] bg-white shadow-2xl border-l border-gray-200 flex flex-col transition-transform duration-300 ease-in-out z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-700">
          AI Assistant
          <span className="block text-xs text-gray-500">
            Folder: {currentFolderId}
          </span>
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X size={20} />
        </button>
      </div>

      {/* Chat history */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-2xl max-w-[80%] ${m.role === "user"
              ? "ml-auto bg-purple-600 text-white"
              : "mr-auto bg-gray-200 text-gray-800"
              }`}
          >
            {m.content}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-white">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask something..."
            className="flex-1 px-4 py-2 border rounded-full focus:ring-2 focus:ring-purple-400 outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          />
          <button
            onClick={handleAsk}
            className="px-4 py-2 bg-purple-600 text-white rounded-full hover:bg-purple-700"
          >
            Send
          </button>
        </div>
      </div>

      {/* Consent modal */}
      <AIConsentModal
        isOpen={isConsentOpen}
        onClose={() => setConsentOpen(false)}
        onConfirm={onConfirmConsent}
        suggestedScope="metadata"
        preselectedItemIds={selectedItems.map((i) => i.id)}
      />
    </div>
  );
};

export default AIChatPanel;
