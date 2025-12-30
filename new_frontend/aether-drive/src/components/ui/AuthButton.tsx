// src/components/ui/AuthButton.tsx
interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export const AuthButton = ({ loading, children, ...props }: Props) => (
  <button
    {...props}
    disabled={loading}
    className="w-full py-2 rounded-md
               bg-indigo-600 text-white font-medium
               hover:bg-indigo-500 transition
               disabled:opacity-50"
  >
    {loading ? "Please wait…" : children}
  </button>
);
