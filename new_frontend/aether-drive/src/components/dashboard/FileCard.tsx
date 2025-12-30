interface Item {
  id: string;
  type: "file" | "folder";
  name?: string;
}

interface Props {
  item: Item;
  selected: boolean;
  onOpenFolder: (id: string) => void;
  onToggleSelect: (item: Item) => void;
}

export const FileCard = ({
  item,
  selected,
  onOpenFolder,
  onToggleSelect,
}: Props) => {
  return (
    <div
      className={`
        relative p-4 rounded-lg border cursor-pointer transition
        ${selected ? "border-blue-500 bg-blue-500/10" : "border-gray-700 hover:border-gray-500"}
      `}
      onClick={() =>
        item.type === "folder"
          ? onOpenFolder(item.id)
          : onToggleSelect(item)
      }
    >
      {/* Checkbox for files */}
      {item.type === "file" && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item)}
          className="absolute top-2 right-2"
          onClick={(e) => e.stopPropagation()}
        />
      )}

      <div className="text-3xl mb-2">
        {item.type === "folder" ? "📁" : "📄"}
      </div>

      <div className="text-sm truncate text-gray-200">
        {item.name || "Unnamed"}
      </div>
    </div>
  );
};
