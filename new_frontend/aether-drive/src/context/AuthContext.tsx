// src/context/AuthContext.tsx

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
} from "react";

// ==============================
// Context Shape
// ==============================
interface AuthContextType {
  token: string | null;

  /**
   * Master Key (RAW BYTES)
   * Mirrors Python: self.master_key = os.urandom(32)
   * NEVER persisted, memory-only.
   */
  masterKey: Uint8Array | null;

  /**
   * Called after successful login + master key unlock
   */
  login: (token: string, masterKey: Uint8Array) => void;

  /**
   * Clears all sensitive material
   */
  logout: () => void;
}

// ==============================
// Create Context
// ==============================
const AuthContext = createContext<AuthContextType | null>(null);

// ==============================
// Provider
// ==============================
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // JWT can be persisted (session existence only)
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  // 🔐 Master Key is NEVER persisted
  const [masterKey, setMasterKey] = useState<Uint8Array | null>(null);

  const login = (newToken: string, newMasterKey: Uint8Array) => {
    setToken(newToken);
    setMasterKey(newMasterKey);

    // Persist token only (NOT the key)
    localStorage.setItem("token", newToken);
  };

  const logout = () => {
    // Zeroize key material (best effort)
    if (masterKey) {
      masterKey.fill(0);
    }

    setToken(null);
    setMasterKey(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ token, masterKey, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ==============================
// Hook
// ==============================
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
};
