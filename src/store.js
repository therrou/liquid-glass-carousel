import { create } from 'zustand'

export const useStore = create((set, get) => ({
  scrollX: 0,
  // Infinite: no clamping — the carousel wraps in strip-space.
  addScrollX: (delta) =>
    set((s) => ({ scrollX: s.scrollX + delta })),
  setScrollX: (v) => set({ scrollX: v }),
  cursor: { x: 0, y: 0 },
  setCursor: (x, y) => set({ cursor: { x, y } }),
  // Flipped true when the prism intro lands → gates the carousel reveal.
  prismEntered: false,
  setPrismEntered: (v) => set({ prismEntered: v }),
  currentIndex: 0,
  setCurrentIndex: (i) => set({ currentIndex: i }),
  // +1 when advancing, -1 when going back → drives the counter slide direction.
  direction: 1,
  setDirection: (d) => set({ direction: d }),
  totalImages: 10,
}))
