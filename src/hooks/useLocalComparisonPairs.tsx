import { useState, useEffect } from "react";
import { ComparisonPair } from "@/components/comparison/BeforeAfterComparison";

const STORAGE_KEY = "hufmanager_comparison_pairs";

export function useLocalComparisonPairs(entityId?: string) {
  const storageKey = entityId ? `${STORAGE_KEY}_${entityId}` : STORAGE_KEY;
  
  const [pairs, setPairs] = useState<ComparisonPair[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(pairs));
    } catch (e) {
      console.warn("Could not save comparison pairs to localStorage:", e);
    }
  }, [pairs, storageKey]);

  const addPair = (label?: string) => {
    const newPair: ComparisonPair = {
      id: crypto.randomUUID(),
      label: label || `Vergleich ${pairs.length + 1}`,
      beforeImage: null,
      afterImage: null,
    };
    setPairs((prev) => [...prev, newPair]);
    return newPair.id;
  };

  const removePair = (pairId: string) => {
    setPairs((prev) => prev.filter((p) => p.id !== pairId));
  };

  const updatePair = (pairId: string, updates: Partial<ComparisonPair>) => {
    setPairs((prev) =>
      prev.map((p) => (p.id === pairId ? { ...p, ...updates } : p))
    );
  };

  const clearAll = () => {
    setPairs([]);
    localStorage.removeItem(storageKey);
  };

  return {
    pairs,
    setPairs,
    addPair,
    removePair,
    updatePair,
    clearAll,
  };
}
