import { create } from "zustand";
import type { Lead } from "@/lib/types";

export type ActivityEvent = { t: number; kind: "search" | "open" | "save" | "draft"; detail: string };

type FieldState = {
  goal: string;
  useCaseKey: string;
  query: string;
  leads: Lead[];
  saved: Lead[];
  activity: ActivityEvent[];
  searching: boolean;
  selectedLead: Lead | null;
  setSelectedLead: (l: Lead | null) => void;
  setGoal: (goal: string, useCaseKey: string) => void;
  setQuery: (q: string) => void;
  setLeads: (l: Lead[]) => void;
  setSearching: (b: boolean) => void;
  saveLead: (l: Lead) => void;
  unsaveLead: (id: string) => void;
  logActivity: (kind: ActivityEvent["kind"], detail: string) => void;
  reset: () => void;
};

export const useField = create<FieldState>((set) => ({
  goal: "",
  useCaseKey: "",
  query: "",
  leads: [],
  saved: [],
  activity: [],
  searching: false,
  selectedLead: null,
  setSelectedLead: (selectedLead) => set({ selectedLead }),
  setGoal: (goal, useCaseKey) => set({ goal, useCaseKey }),
  setQuery: (query) => set({ query }),
  setLeads: (leads) => set({ leads }),
  setSearching: (searching) => set({ searching }),
  saveLead: (lead) => set((s) => (s.saved.some((x) => x.id === lead.id) ? s : { saved: [...s.saved, lead] })),
  unsaveLead: (id) => set((s) => ({ saved: s.saved.filter((x) => x.id !== id) })),
  logActivity: (kind, detail) => set((s) => ({ activity: [...s.activity, { t: Date.now(), kind, detail }].slice(-40) })),
  reset: () => set({ goal: "", useCaseKey: "", query: "", leads: [], saved: [], activity: [] })
}));
