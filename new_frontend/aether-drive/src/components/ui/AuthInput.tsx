// src/components/ui/AuthInput.tsx
interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const AuthInput = ({ label, ...props }: Props) => (
  <div className="space-y-1">
    <label className="text-sm text-gray-600">{label}</label>
    <input
      {...props}
      className="w-full px-3 py-2 rounded-md
                 border border-gray-300
                 focus:outline-none focus:ring-2 focus:ring-indigo-500
                 transition"
    />
  </div>
);
