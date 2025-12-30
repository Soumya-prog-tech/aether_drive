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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Welcome back
      </h1>
      <p className="text-gray-500 mb-6">
        Please enter your details
      </p>

      <form onSubmit={handleLogin} className="space-y-4">
        <AuthInput
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <AuthInput
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <AuthButton loading={loading}>
          Sign in
        </AuthButton>
      </form>

      <Divider />

      {/* GOOGLE BUTTON (UI ONLY FOR NOW) */}
      <button
        className="w-full py-2 rounded-md border border-gray-300
                   flex items-center justify-center gap-2
                   hover:bg-gray-50 transition"
        onClick={() => alert("Google auth not wired yet")}
      >
        <img src="/home/soumya/Documents/smart_drive/new_frontend/aether-drive/src/assets/google.svg" className="w-4 h-4" />
        Continue with Google
      </button>

      <p className="text-sm text-gray-500 mt-6 text-center">
        Don’t have an account?{" "}
        <Link to="/register" className="text-indigo-600 hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Login;
