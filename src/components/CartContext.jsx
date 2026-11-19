import { products as catalogue } from "../data/products";
import { mergePublishedProduct } from "../data/productImages";
import { isDentalChairProduct } from "../data/productWorkflow";

import React, { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

function normalizeQuantity(value) {
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("yr-cart") || "[]");
      if (!Array.isArray(stored)) return [];
      const hydrated = stored.filter((item) => item && typeof item === "object").map((item) => {
        const base = catalogue.find((product) => product.slug === item.slug);
        return { ...mergePublishedProduct(base, item), quantity: normalizeQuantity(item.quantity) };
      });
      // Move legacy chair entries into their dedicated request store before
      // ChairRequestProvider initializes (CartProvider is its parent).
      const chairs = hydrated.filter(isDentalChairProduct);
      if (chairs.length) {
        let existing = [];
        try {
          const saved = JSON.parse(localStorage.getItem("yr-chair-requests") || "[]");
          if (Array.isArray(saved)) existing = saved.filter((item) => item && typeof item === "object" && isDentalChairProduct(item)).map((item) => ({ ...item, quantity: normalizeQuantity(item.quantity) }));
        } catch { /* Recover using the chair entries found in the old cart. */ }
        const migrated = [...existing];
        for (const chair of chairs) {
          const found = migrated.find((item) => item.slug === chair.slug);
          if (found) found.quantity = normalizeQuantity(found.quantity) + normalizeQuantity(chair.quantity);
          else migrated.push({ ...chair, quantity: normalizeQuantity(chair.quantity) });
        }
        localStorage.setItem("yr-chair-requests", JSON.stringify(migrated));
      }
      return hydrated.filter((item) => !isDentalChairProduct(item));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("yr-cart", JSON.stringify(items));
  }, [items]);

  function addToCart(product, quantity = 1) {
    if (isDentalChairProduct(product)) return;
    const amount = normalizeQuantity(quantity);
    setItems((current) => {
      const found = current.find((item) => item.slug === product.slug);
      if (found)
        return current.map((item) =>
          item.slug === product.slug
            ? { ...item, quantity: item.quantity + amount }
            : item,
        );
      return [...current, { ...product, quantity: amount }];
    });
  }
  function removeFromCart(slug) {
    setItems((current) => current.filter((item) => item.slug !== slug));
  }
  function updateQuantity(slug, quantity) {
    if (items.some((item) => item.slug === slug && isDentalChairProduct(item))) return;
    const value = normalizeQuantity(quantity);
    setItems((current) =>
      current.map((item) =>
        item.slug === slug ? { ...item, quantity: value } : item,
      ),
    );
  }
  function clearCart() {
    setItems([]);
  }

  const value = {
    items,
    cartCount: items.reduce((sum, item) => sum + item.quantity, 0),
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  return useContext(CartContext);
}
