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
        encrypted_master_key: toB64(ciphertext.buffer),
        master_key_salt: toB64(salt.buffer),
        master_key_iv: toB64(iv.buffer),
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
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Create Account
      </h1>
      <p className="text-gray-500 mb-6">
        Your encryption keys are generated locally
      </p>

      <form onSubmit={handleRegister} className="space-y-4">
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
          Create Secure Account
        </AuthButton>
      </form>

      <Divider />

      {/* GOOGLE BUTTON (UI ONLY FOR NOW) */}
      <button
        className="w-full py-2 rounded-md border border-gray-300
                   flex items-center justify-center gap-2
                   hover:bg-gray-50 transition"
        onClick={() => alert("Google sign-up not wired yet")}
      >
        <img src="/home/soumya/Documents/smart_drive/new_frontend/aether-drive/src/assets/google.svg" className="w-4 h-4" />
        Continue with Google
      </button>

      <p className="text-sm text-gray-500 mt-6 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
};

export default Register;
