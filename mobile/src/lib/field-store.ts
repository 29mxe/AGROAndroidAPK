// Device-local state for the field-observation features: per-post metadata overrides
// ("needs advice" / "resolved" / status / crop / location privacy), bookmarks,
// the reaction A/B experiment counters and the unfinished post draft.
//
// Persisted with AsyncStorage (already a project dependency) through zustand's
// persist middleware — pure JS, nothing to configure natively.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { FieldStatus, LocalPostMeta, LocationPrivacy } from "./field-meta";

export type ExperimentGroup = "A" | "B";

export interface PostDraft {
  text: string;
  status: FieldStatus | null;
  crop: string | null;
  needsAdvice: boolean;
  locationPrivacy: LocationPrivacy;
  photoUri: string | null;
  photoName: string | null;
  photoMime: string | null;
  savedAt: number;
}

export const draftHasContent = (draft: PostDraft | null | undefined): boolean =>
  !!draft &&
  (draft.text.trim().length > 0 ||
    !!draft.photoUri ||
    !!draft.status ||
    !!draft.crop ||
    draft.needsAdvice);

interface FieldState {
  hydrated: boolean;
  postMeta: Record<string, LocalPostMeta>;
  bookmarks: string[];
  experimentGroup: ExperimentGroup | null;
  reactionClicks: number;
  draft: PostDraft | null;

  setHydrated: (value: boolean) => void;
  updatePostMeta: (postId: string, patch: Omit<Partial<LocalPostMeta>, "updatedAt">) => void;
  setResolved: (postId: string, resolved: boolean) => void;
  toggleBookmark: (postId: string) => void;
  ensureExperiment: () => ExperimentGroup;
  recordReactionClick: () => void;
  saveDraft: (draft: Omit<PostDraft, "savedAt">) => void;
  clearDraft: () => void;
}

const STORAGE_KEY = "agroconnect.field.v1";

export const useFieldStore = create<FieldState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      postMeta: {},
      bookmarks: [],
      experimentGroup: null,
      reactionClicks: 0,
      draft: null,

      setHydrated: (value) => set({ hydrated: value }),

      updatePostMeta: (postId, patch) =>
        set((state) => ({
          postMeta: {
            ...state.postMeta,
            [postId]: { ...state.postMeta[postId], ...patch, updatedAt: Date.now() },
          },
        })),

      setResolved: (postId, resolved) => get().updatePostMeta(postId, { resolved }),

      toggleBookmark: (postId) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(postId)
            ? state.bookmarks.filter((id) => id !== postId)
            : [postId, ...state.bookmarks],
        })),

      ensureExperiment: () => {
        const current = get().experimentGroup;
        if (current) return current;
        const group: ExperimentGroup = Math.random() < 0.5 ? "A" : "B";
        set({ experimentGroup: group });
        return group;
      },

      recordReactionClick: () => set((state) => ({ reactionClicks: state.reactionClicks + 1 })),

      saveDraft: (draft) => set({ draft: { ...draft, savedAt: Date.now() } }),

      clearDraft: () => set({ draft: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        postMeta: state.postMeta,
        bookmarks: state.bookmarks,
        experimentGroup: state.experimentGroup,
        reactionClicks: state.reactionClicks,
        draft: state.draft,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHydrated(true);
        } else {
          // Storage read failed — continue with in-memory defaults, never block the UI.
          setTimeout(() => useFieldStore.setState({ hydrated: true }), 0);
        }
      },
    }
  )
);

// Small selector helpers (keep components subscribed to the narrowest slice possible)
export const selectPostMeta = (postId: string) => (state: FieldState) => state.postMeta[postId];
export const selectIsBookmarked = (postId: string) => (state: FieldState) =>
  state.bookmarks.includes(postId);
