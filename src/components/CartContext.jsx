import { products as catalogue } from "../data/products";
import { mergePublishedProduct } from "../data/productImages";
import { isDentalChairProduct } from "../data/productWorkflow";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const CartContext = createContext(null);

function normalizeQuantity(value) {
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
}

function readCartState() {
  try {
    const stored = JSON.parse(localStorage.getItem("yr-cart") || "[]");
    if (!Array.isArray(stored)) throw new Error("The saved product cart is not a valid list.");
    const hydrated = stored
      .filter((item) => item && typeof item === "object" && !Array.isArray(item))
      .map((item) => {
        const base = catalogue.find((product) => product.slug === item.slug);
        return { ...mergePublishedProduct(base, item), quantity: normalizeQuantity(item.quantity) };
      });
    const legacyChairItems = hydrated.filter(isDentalChairProduct);
    return {
      items: hydrated.filter((item) => !isDentalChairProduct(item)),
      legacyChairItems,
      cartStorageReady: true,
      migrationReady: legacyChairItems.length === 0,
      migrationError: "",
    };
  } catch {
    return {
      items: [],
      legacyChairItems: [],
      cartStorageReady: false,
      migrationReady: false,
      migrationError: "The saved product cart could not be read. It has not been overwritten. Check browser storage permissions, then retry.",
    };
  }
}

export function CartProvider({ children }) {
  const [initialState] = useState(readCartState);
  const [items, setItems] = useState(initialState.items);
  const [legacyChairItems, setLegacyChairItems] = useState(initialState.legacyChairItems);
  const [cartStorageReady, setCartStorageReady] = useState(initialState.cartStorageReady);
  const [migrationReady, setMigrationReady] = useState(initialState.migrationReady);
  const [migrationError, setMigrationError] = useState(initialState.migrationError);
  const [migrationRetry, setMigrationRetry] = useState(0);
  const [cartStorageError, setCartStorageError] = useState("");
  const skipNextCartPersist = useRef(false);

  useEffect(() => {
    if (!migrationReady || !cartStorageReady) return;
    if (skipNextCartPersist.current) {
      skipNextCartPersist.current = false;
      return;
    }
    try {
      localStorage.setItem("yr-cart", JSON.stringify(items));
      setCartStorageError("");
    } catch {
      setCartStorageError("Your product cart changes could not be saved to this browser. Retry saving before leaving this page.");
    }
  }, [items, migrationReady, cartStorageReady]);

  const completeLegacyChairMigration = useCallback(() => {
    skipNextCartPersist.current = true;
    setLegacyChairItems([]);
    setMigrationReady(true);
    setMigrationError("");
  }, []);

  const reportMigrationError = useCallback((message) => {
    setMigrationError(message || "The legacy chair requests could not be moved safely. Your original cart has been preserved.");
  }, []);

  const retryLegacyChairMigration = useCallback(() => {
    const refreshed = readCartState();
    setItems(refreshed.items);
    setLegacyChairItems(refreshed.legacyChairItems);
    setCartStorageReady(refreshed.cartStorageReady);
    setMigrationReady(refreshed.migrationReady);
    setMigrationError(refreshed.migrationError);
    setCartStorageError("");
    setMigrationRetry((value) => value + 1);
  }, []);

  function retryCartPersistence() {
    try {
      localStorage.setItem("yr-cart", JSON.stringify(items));
      setCartStorageError("");
    } catch {
      setCartStorageError("Your product cart is still not saved. Check browser storage space/permissions and retry.");
    }
  }

  function addToCart(product, quantity = 1) {
    if (!migrationReady || !cartStorageReady || isDentalChairProduct(product)) return;
    const amount = normalizeQuantity(quantity);
    setItems((current) => {
      const found = current.find((item) => item.slug === product.slug);
      if (found)
        return current.map((item) =>
          item.slug === product.slug
            ? { ...item, quantity: normalizeQuantity(item.quantity) + amount }
            : item,
        );
      return [...current, { ...product, quantity: amount }];
    });
  }

  function removeFromCart(slug) {
    if (!migrationReady || !cartStorageReady) return;
    setItems((current) => current.filter((item) => item.slug !== slug));
  }

  function updateQuantity(slug, quantity) {
    if (!migrationReady || !cartStorageReady) return;
    const value = normalizeQuantity(quantity);
    setItems((current) =>
      current.map((item) =>
        item.slug === slug ? { ...item, quantity: value } : item,
      ),
    );
  }

  function clearCart() {
    if (!migrationReady || !cartStorageReady) return;
    setItems([]);
  }

  const value = {
    items,
    cartCount: items.reduce((sum, item) => sum + normalizeQuantity(item.quantity), 0),
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    legacyChairItems,
    migrationReady,
    migrationError,
    migrationRetry,
    cartStorageReady,
    cartStorageError,
    completeLegacyChairMigration,
    reportMigrationError,
    retryLegacyChairMigration,
    retryCartPersistence,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}
