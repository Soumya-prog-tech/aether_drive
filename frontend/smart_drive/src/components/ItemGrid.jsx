import React from "react";
// ✅ Use the same icon library as your Dashboard for consistency
import { FileText, Folder, AlertCircle } from "lucide-react"; 

const ItemGrid = ({ items, onFileSelect, onFolderSelect }) => {
  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
        <Folder size={48} className="mb-4 opacity-50" />
        <p className="font-medium">This folder is empty</p>
      </div>
    );
  }

  const handleOpen = (item) => {
    if (item.type === "folder") {
      onFolderSelect(item);
    } else {
      onFileSelect(item);
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
      {items.map((item) => (
        <div
          key={item.id}
          tabIndex={0}
          onClick={() => handleOpen(item)}
          onKeyDown={(e) => e.key === "Enter" && handleOpen(item)}
          className="group flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 bg-white 
                     cursor-pointer transition-all duration-200 
                     hover:shadow-lg hover:-translate-y-1 hover:border-blue-400 active:scale-95"
        >
          <div
            className={`w-14 h-14 flex items-center justify-center rounded-lg mb-3 transition-colors ${
              item.type === "folder" 
                ? "bg-amber-100 text-amber-500 group-hover:bg-amber-200" 
                : "bg-blue-100 text-blue-500 group-hover:bg-blue-200"
            }`}
          >
            {item.type === "folder" ? (
              <Folder size={32} />
            ) : (
              <FileText size={32} />
            )}
          </div>
          
          <div className="w-full relative">
            <p
              className="text-sm font-medium text-center text-slate-700 truncate w-full px-2"
              // ✅ FIX: Added item.fileName to the check list
              title={item.displayName || item.name || item.original_filename || item.fileName} 
            >
              {item.displayName || item.name || item.original_filename || item.fileName || "Untitled"}
            </p>

            {/* Warning Icon for Decryption Failures */}
            {item.__metaDecryptFailed && (
              <div className="absolute -top-10 right-0 text-red-500 bg-white rounded-full shadow-sm" title="Decryption Failed">
                 <AlertCircle size={16} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ItemGrid;