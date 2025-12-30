import React, { useState, useContext, useEffect } from "react";
// ✅ Import from the new Context file, not App.js
import { AuthContext } from "../context/AuthContext"; 
import { Eye, EyeOff, Loader2 } from "lucide-react";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // ✅ Use the cryptographic login/register functions
  const { login, register } = useContext(AuthContext);

  useEffect(() => {
    // Autofocus email on load
    document.getElementById("email-input")?.focus();
  }, [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLogin) {
        // 🔐 Login: Context handles API + Master Key Decryption
        await login(email, password); 
        // No need to set localStorage/User here manually, Context does it.
      } else {
        // 🔐 Register: Context handles Key Generation + Encryption + API
        await register(email, password);
        
        setIsLogin(true);
        setEmail("");
        setPassword("");
        alert("✅ Registration successful! Please log in.");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // ------------------------------------------------------------------
  // UI SECTION (Unchanged from your provided code)
  // ------------------------------------------------------------------
  return (
    <div className="flex min-h-screen">
      {/* Left side with gradient + illustration */}
      <div className="hidden lg:flex w-1/2 flex-col items-center justify-center bg-gradient-to-br from-purple-500 via-blue-500 to-indigo-600 text-white p-10">
        <div className="max-w-md text-center">
          <img
            src="/logo.png"
            alt="Secure Cloud Illustration"
            className="w-72 mx-auto mb-8"
          />
          <h1 className="text-4xl font-bold mb-4">Secure Drive</h1>
          <p className="text-lg opacity-90">
            Your private cloud — encrypted, reliable, and accessible anywhere.
          </p>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 p-8">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg border border-gray-200 animate-fadeIn">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
            {isLogin ? "Welcome Back 👋" : "Join Secure Drive 🚀"}
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            {isLogin
              ? "Login to access your files"
              : "Register to start your secure journey"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <input
                id="email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 mt-2 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Processing...
                </>
              ) : isLogin ? (
                "Login"
              ) : (
                "Register"
              )}
            </button>
          </form>

          {/* Toggle login/register */}
          <p className="text-sm text-center text-gray-600 mt-6">
            {isLogin ? "Don’t have an account?" : "Already registered?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 font-bold text-blue-600 hover:underline"
            >
              {isLogin ? "Register" : "Login"}
            </button>
          </p>
          <br></br>
          <div className="flex items-center space-x-2">
            <button className="flex-1 flex items-center justify-center px-4 py-2 border rounded-md hover:bg-gray-100">
              <img src="/google.png" className="w-5 mr-2" /> Google
            </button>
            <button className="flex-1 flex items-center justify-center px-4 py-2 border rounded-md hover:bg-gray-100">
              <img src="/github.png" className="w-5 mr-2" /> GitHub
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AuthPage;