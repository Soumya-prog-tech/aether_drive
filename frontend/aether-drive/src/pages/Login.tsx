import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  derivePasswordKey,
  decryptData,
  fromB64,
} from "../crypto/crypto-utils";

import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/ui/AuthInput";
import { AuthButton } from "../components/ui/AuthButton";
import { Divider } from "../components/ui/Divider";

const BASE_URL = "http://localhost:8000";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const loginResp = await axios.post(`${BASE_URL}/api/v1/login`, {
        email,
        password,
      });

      const token = loginResp.data.access_token;

      const userResp = await axios.get(`${BASE_URL}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const u = userResp.data;
      const salt = fromB64(u.master_key_salt);
      const iv = fromB64(u.master_key_iv);
      const enc = fromB64(u.encrypted_master_key);

      const pwKey = await derivePasswordKey(password, salt);
      const masterKey = await decryptData(pwKey, enc, iv);

      login(token, masterKey);
      navigate("/dashboard");
    } catch {
      alert("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back
        </h1>
        <p className="text-gray-400 text-sm">
          Please enter your details to sign in
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-5">
        <AuthInput
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />

        <AuthInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />

        <AuthButton loading={loading}>
          Sign in
        </AuthButton>
      </form>

      <Divider />

      {/* GOOGLE BUTTON (UI ONLY FOR NOW) */}
      <button
        className="w-full py-2.5 rounded-lg border border-gray-700 bg-[#0f172a]
                   flex items-center justify-center gap-2 text-gray-300
                   hover:bg-gray-800 hover:text-white transition-all text-sm font-medium"
        onClick={() => alert("Google auth not wired yet")}
      >
        <img src="/google.svg" className="w-4 h-4" alt="Google" onError={(e) => e.currentTarget.style.display = 'none'} />
        Continue with Google
      </button>

      <p className="text-sm text-gray-500 mt-8 text-center">
        Don’t have an account?{" "}
        <Link to="/register" className="text-blue-500 hover:text-blue-400 font-medium hover:underline transition-colors">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
