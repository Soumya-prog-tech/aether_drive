interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export const AuthCard = ({ title, subtitle, children }: Props) => {
  return (
    <div className="w-full max-w-md bg-gray-900/70 backdrop-blur
                    border border-gray-800 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-2xl font-semibold text-white">{title}</h2>
      <p className="text-sm text-gray-400 mt-1 mb-6">{subtitle}</p>
      {children}
    </div>
  );
};
