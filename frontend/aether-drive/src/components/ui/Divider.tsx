

export const Divider = () => {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-700" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-[#1e293b] text-gray-500">
          Or continue with
        </span>
      </div>
    </div>
  );
};
