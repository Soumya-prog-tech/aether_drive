// components/AIConsentModal.jsx
import React, { useState, useEffect } from "react";
import { Shield, X, Clock } from "lucide-react";

export default function AIConsentModal({
  isOpen,
  onClose,
  onConfirm,
  suggestedScope = "metadata",
  preselectedItemIds = [],
}) {
  const [scope, setScope] = useState(suggestedScope); // "metadata" | "selected" | "folder" | "whole_drive"
  const [remember, setRemember] = useState(false);
  const [ttl, setTtl] = useState(30); // minutes to remember
  const [itemIds, setItemIds] = useState(preselectedItemIds);

  useEffect(() => {
    if (isOpen) {
      setScope(suggestedScope);
      setItemIds(preselectedItemIds);
    }
  }, [isOpen, suggestedScope, preselectedItemIds]);

  if (!isOpen) return null;

  const confirm = () => {
    onConfirm({ scope, itemIds, remember, ttlMinutes: ttl });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Shield className="text-violet-600" size={20} />
            <h3 className="font-semibold text-slate-800">Share data with Assistant</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Your files are end-to-end encrypted. Choose what the assistant can access for this question.
          </p>

          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="scope"
                className="mt-1"
                checked={scope === "metadata"}
                onChange={() => setScope("metadata")}
              />
              <div>
                <div className="font-medium text-slate-800">Metadata only</div>
                <div className="text-xs text-slate-500">
                  Filenames, types, sizes, dates. No file contents are shared.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="scope"
                className="mt-1"
                checked={scope === "selected"}
                onChange={() => setScope("selected")}
              />
              <div>
                <div className="font-medium text-slate-800">Selected items only</div>
                <div className="text-xs text-slate-500">
                  Only decrypt and share snippets from {itemIds.length || 0} selected file(s).
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="scope"
                className="mt-1"
                checked={scope === "folder"}
                onChange={() => setScope("folder")}
              />
              <div>
                <div className="font-medium text-slate-800">This folder</div>
                <div className="text-xs text-slate-500">
                  Only decrypt and share snippets from files in the current folder.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-slate-50">
              <input
                type="radio"
                name="scope"
                className="mt-1"
                checked={scope === "whole_drive"}
                onChange={() => setScope("whole_drive")}
              />
              <div>
                <div className="font-medium text-slate-800">Whole drive</div>
                <div className="text-xs text-slate-500">
                  Decrypt and share snippets across your entire drive for better recall.
                </div>
              </div>
            </label>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span className="text-sm text-slate-700">Remember my choice for this session</span>
            </label>

            {remember && (
              <div className="flex items-center gap-2 text-sm text-slate-600 ml-auto">
                <Clock size={16} />
                <span>Expires in</span>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={ttl}
                  onChange={(e) => setTtl(Number(e.target.value))}
                  className="w-16 border rounded-md px-2 py-1"
                />
                <span>min</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200">
            Cancel
          </button>
          <button
            onClick={confirm}
            className="px-4 py-2 text-sm rounded-lg bg-violet-600 hover:bg-violet-700 text-white"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

