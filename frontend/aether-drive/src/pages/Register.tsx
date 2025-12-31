import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  generateRandomBytes,
  derivePasswordKey,
  encryptData,
  toB64,
} from "../crypto/crypto-utils";

import { AuthLayout } from "../components/auth/AuthLayout";
import { AuthInput } from "../components/ui/AuthInput";
import { AuthButton } from "../components/ui/AuthButton";
import { Divider } from "../components/ui/Divider";

const BASE_URL = "http://localhost:8000";

const Register = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1️⃣ Generate Master Key locally
      const masterKey = generateRandomBytes(32);

      // 2️⃣ Generate salt for password → key
      const salt = generateRandomBytes(16);

      // 3️⃣ Derive password key (PBKDF2)
      const passwordKey = await derivePasswordKey(password, salt);

      // 4️⃣ Encrypt Master Key using password key
      const { ciphertext, iv } = await encryptData(passwordKey, masterKey);

      // 5️⃣ Send registration payload
      await axios.post(`${BASE_URL}/api/v1/register`, {
        email,
        password,
        encrypted_master_key: toB64(ciphertext),
        master_key_salt: toB64(salt),
        master_key_iv: toB64(iv),
      });

      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          Create Account
        </h1>
        <p className="text-gray-400 text-sm">
          Your encryption keys are generated locally
        </p>
      </div>

      <form onSubmit={handleRegister} className="space-y-5">
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
          placeholder="Create a strong password"
        />

        <AuthButton loading={loading}>
          Create Secure Account
        </AuthButton>
      </form>

      <Divider />

      {/* GOOGLE BUTTON (UI ONLY FOR NOW) */}
      <button
        className="w-full py-2.5 rounded-lg border border-gray-700 bg-[#0f172a]
                   flex items-center justify-center gap-2 text-gray-300
                   hover:bg-gray-800 hover:text-white transition-all text-sm font-medium"
        onClick={() => alert("Google sign-up not wired yet")}
      >
        <img src="/google.svg" className="w-4 h-4" alt="Google" onError={(e) => e.currentTarget.style.display = 'none'} />
        Continue with Google
      </button>

      <p className="text-sm text-gray-500 mt-8 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-500 hover:text-blue-400 font-medium hover:underline transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
