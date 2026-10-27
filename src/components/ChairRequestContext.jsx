import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ChairRequestContext = createContext(null);

export function ChairRequestProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("yr-chair-requests") || "[]");
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("yr-chair-requests", JSON.stringify(items));
  }, [items]);

  function addChair(chair, quantity = 1) {
    const amount = Math.max(1, Number(quantity) || 1);
    setItems((current) => {
      const found = current.find((item) => item.slug === chair.slug);
      if (found)
        return current.map((item) =>
          item.slug === chair.slug
            ? { ...item, quantity: item.quantity + amount }
            : item,
        );
      return [...current, { ...chair, quantity: amount }];
    });
  }
  function removeChair(slug) {
    setItems((current) => current.filter((item) => item.slug !== slug));
  }
  function updateChairQuantity(slug, quantity) {
    const value = Math.max(1, Number(quantity) || 1);
    setItems((current) =>
      current.map((item) =>
        item.slug === slug ? { ...item, quantity: value } : item,
      ),
    );
  }
  function clearChairs() {
    setItems([]);
  }

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + (item.quantity || 1), 0),
      modelCount: items.length,
      addChair,
      removeChair,
      updateChairQuantity,
      clearChairs,
    }),
    [items],
  );
  return (
    <ChairRequestContext.Provider value={value}>
      {children}
    </ChairRequestContext.Provider>
  );
}
export function useChairRequests() {
  return useContext(ChairRequestContext);
}
