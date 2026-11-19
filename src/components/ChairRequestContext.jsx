import { products as catalogue } from "../data/products";
import { mergePublishedProduct } from "../data/productImages";
import { isDentalChairProduct } from "../data/productWorkflow";

import React, { createContext, useContext, useEffect, useState } from "react";

const ChairRequestContext = createContext(null);

function normalizeQuantity(value) {
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
}

export function ChairRequestProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("yr-chair-requests") || "[]");
      if (!Array.isArray(stored)) return [];
      return stored.filter((item) => item && typeof item === "object" && isDentalChairProduct(item)).map((item) => {
        const base = catalogue.find((product) => product.slug === item.slug);
        return { ...mergePublishedProduct(base, item), quantity: normalizeQuantity(item.quantity) };
      });
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("yr-chair-requests", JSON.stringify(items));
  }, [items]);

  function addChair(chair, quantity = 1) {
    if (!isDentalChairProduct(chair)) return;
    const amount = normalizeQuantity(quantity);
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
    const value = normalizeQuantity(quantity);
    setItems((current) =>
      current.map((item) =>
        item.slug === slug ? { ...item, quantity: value } : item,
      ),
    );
  }
  function clearChairs() {
    setItems([]);
  }

  const value = {
    items,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    modelCount: items.length,
    addChair,
    removeChair,
    updateChairQuantity,
    clearChairs,
  };
  return (
    <ChairRequestContext.Provider value={value}>
      {children}
    </ChairRequestContext.Provider>
  );
}
export function useChairRequests() {
  return useContext(ChairRequestContext);
}
