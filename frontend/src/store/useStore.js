import { create } from "zustand";
import { auth as authApi, settingsApi } from "../lib/api.js";

export const useStore = create((set, get) => ({
  user: null,
  settings: null,
  language: localStorage.getItem("lang") || "fr",
  authChecked: false,

  setLanguage: (lang) => {
    localStorage.setItem("lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    set({ language: lang });
  },

  async loadMe() {
    try {
      const user = await authApi.getUser();
      set({ user, authChecked: true });
      if (user) get().loadSettings();
      return user;
    } catch {
      set({ user: null, authChecked: true });
      return null;
    }
  },

  async loadSettings() {
    try {
      const data = await settingsApi.get();
      if (data) set({ settings: data });
    } catch {
      /* settings are public; ignore failures */
    }
  },

  setUser: (user) => set({ user }),
  setSettings: (settings) => set({ settings }),

  async login(email, password) {
    const user = await authApi.login(email, password);
    set({ user });
    get().loadSettings();
    return user;
  },

  async register(payload) {
    const user = await authApi.register(payload);
    set({ user });
    get().loadSettings();
    return user;
  },

  async logout() {
    await authApi.logout();
    set({ user: null });
  },
}));
