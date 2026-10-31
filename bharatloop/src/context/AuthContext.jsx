import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "bharatloop_auth";
const USERS_STORAGE_KEY = "bharatloop_users";

function loadAuthState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.user) return parsed;
    }
  } catch (_) {}
  return null;
}

function saveAuthState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function clearAuthState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

const DEFAULT_DEMO_USER = {
  id: "demo_consumer_blp",
  name: "Aarav Sharma",
  email: "aarav.sharma@example.in",
  phone: "+91 98450 12345",
  createdAt: "2026-01-15T10:00:00.000Z",
  isDemo: true,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = loadAuthState();
    return saved?.user || null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = loadAuthState();
    return !!saved?.user;
  });
  const [walletBalance, setWalletBalance] = useState(0);

  // Initialize demo users registry & verify persisted session
  useEffect(() => {
    try {
      const existing = localStorage.getItem(USERS_STORAGE_KEY);
      if (!existing) {
        localStorage.setItem(
          USERS_STORAGE_KEY,
          JSON.stringify([
            {
              ...DEFAULT_DEMO_USER,
              password: "password123",
            },
          ])
        );
      }
    } catch (_) {}

    const saved = loadAuthState();
    if (saved && saved.user) {
      setUser(saved.user);
      setIsAuthenticated(true);
    }
  }, []);

  const signup = (name, email, password, phone = "", role = "consumer") => {
    try {
      const existingUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
      const cleanEmail = email.trim().toLowerCase();
      const exists = existingUsers.find((u) => u.email.toLowerCase() === cleanEmail);
      if (exists) {
        return { success: false, error: "An account with this email already exists." };
      }

      const userId = `user_${cleanEmail.replace(/[^a-z0-9]/gi, "_")}`;
      const newUser = {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone.trim(),
        role: role || "consumer",
        createdAt: new Date().toISOString(),
        isDemo: false,
      };

      existingUsers.push({ ...newUser, password });
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(existingUsers));

      setUser(newUser);
      setIsAuthenticated(true);
      saveAuthState({ user: newUser });

      return { success: true, user: newUser };
    } catch (e) {
      return { success: false, error: e.message || "Failed to sign up" };
    }
  };

  const login = (email, password) => {
    try {
      const existingUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
      const cleanEmail = email.trim().toLowerCase();
      const found = existingUsers.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.password === password
      );

      if (!found) {
        return { success: false, error: "Invalid email or password. Try again or use Demo Sign In." };
      }

      const { password: _, ...safeUser } = found;
      setUser(safeUser);
      setIsAuthenticated(true);
      saveAuthState({ user: safeUser });

      return { success: true, user: safeUser };
    } catch (e) {
      return { success: false, error: e.message || "Failed to sign in" };
    }
  };

  const demoLogin = (role = "consumer") => {
    const demoUser = { ...DEFAULT_DEMO_USER, role };
    setUser(demoUser);
    setIsAuthenticated(true);
    saveAuthState({ user: demoUser });
    return { success: true, user: demoUser };
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    clearAuthState();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        userId: user?.id || "demo_consumer_blp",
        walletBalance,
        setWalletBalance,
        signup,
        login,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

export default AuthContext;
