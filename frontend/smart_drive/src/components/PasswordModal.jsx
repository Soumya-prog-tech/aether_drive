// components/PasswordModal.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Lock, Loader2 } from "lucide-react";

const PasswordModal = ({ isOpen, onSubmit, onCancel, error, loading }) => {
  const [password, setPassword] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!password.trim()) return;
    onSubmit(password);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Lock className="text-sky-600" size={24} />
          <h2 className="text-lg font-bold text-slate-800">Enter your password</h2>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          To unlock and decrypt your files, please enter your account password.
        </p>

        <motion.div
          // subtle “shake” when there's an error
          animate={error ? { x: [0, -8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.35 }}
        >
          <input
            type="password"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={loading}
          />
        </motion.div>

        {error && (
          <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-medium flex items-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            Unlock
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PasswordModal;
