// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from "react";
import { api } from "../services/api";
import * as Crypto from "../services/crypto";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [masterKey, setMasterKey] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // ✅ Add loading state

  // ✅ 1. Session Restoration (Hydration)
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const res = await api.get("/users/me");
          setUser(res.data);
          setIsAuthenticated(true);
          // Note: We cannot recover MasterKey here automatically without password
          // The Dashboard handles prompting for the password on refresh.
        } catch (err) {
          console.error("Session expired:", err);
          localStorage.removeItem("accessToken");
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  // ✅ 2. Register
  const register = async (email, password) => {
    const rawMK = Crypto.generateMasterKey();
    const salt = Crypto.generateSalt();
    const passwordKey = await Crypto.deriveKey(password, salt);
    const { encrypted: encMK, iv: mkIV } = await Crypto.encryptData(rawMK, passwordKey);

    await api.post("/register", {
      email,
      password,
      encrypted_master_key: Crypto.buff_to_b64(encMK),
      master_key_salt: Crypto.buff_to_b64(salt),
      master_key_iv: Crypto.buff_to_b64(mkIV),
    });
  };

  // ✅ 3. Login
  const login = async (email, password) => {
    const response = await api.post("/login", { email, password });
    localStorage.setItem("accessToken", response.data.access_token);
    
    // Get User Profile
    const userRes = await api.get("/users/me");
    const userData = userRes.data;
    
    // Unlock Master Key
    const salt = Crypto.b64_to_buff(userData.master_key_salt);
    const iv = Crypto.b64_to_buff(userData.master_key_iv);
    const encMK = Crypto.b64_to_buff(userData.encrypted_master_key);
    
    const passwordKey = await Crypto.deriveKey(password, salt);
    const rawMK = await Crypto.decryptData(encMK, passwordKey, iv);
    
    const importedMK = await Crypto.importKeyFromRaw(rawMK);
    
    setMasterKey(importedMK);
    setUser(userData);
    setIsAuthenticated(true);
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        setUser,
        isAuthenticated, 
        setIsAuthenticated, 
        masterKey, 
        login, 
        register,
        isLoading // ✅ Export loading state
    }}>
      {children}
    </AuthContext.Provider>
  );
};