import React, { useState } from "react";
import { AuthInput } from "../ui/AuthInput";
import { AuthButton } from "../ui/AuthButton";
import { FolderPlus, X } from "lucide-react";

interface Props {
    onClose: () => void;
    onCreate: (name: string) => Promise<void>;
}

export const CreateFolderModal = ({ onClose, onCreate }: Props) => {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        try {
            await onCreate(name);
            onClose();
        } catch (error) {
            alert("Failed to create folder");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-[#1e293b] border border-gray-700 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">

                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                            <FolderPlus size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-white">New Folder</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <AuthInput
                        label="Folder Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Project Docs"
                        autoFocus
                    />

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors font-medium text-sm"
                        >
                            Cancel
                        </button>
                        <div className="flex-1">
                            <AuthButton loading={loading} disabled={!name.trim()}>
                                Create Folder
                            </AuthButton>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
