import { products as catalogue } from "../data/products";
import { mergePublishedProduct } from "../data/productImages";
import { isDentalChairProduct } from "../data/productWorkflow";
import { migrateLegacyChairStorage } from "../data/cartMigration";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useCart } from "./CartContext";

const ChairRequestContext = createContext(null);

function normalizeQuantity(value) {
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
}

function readChairState() {
  try {
    const stored = JSON.parse(localStorage.getItem("yr-chair-requests") || "[]");
    if (!Array.isArray(stored)) throw new Error("The saved dental chair request list is not valid.");
    return {
      items: stored
        .filter((item) => item && typeof item === "object" && !Array.isArray(item) && isDentalChairProduct(item))
        .map((item) => {
          const base = catalogue.find((product) => product.slug === item.slug);
          return { ...mergePublishedProduct(base, item), quantity: normalizeQuantity(item.quantity) };
        }),
      storageReady: true,
      storageError: "",
    };
  } catch {
    return {
      items: [],
      storageReady: false,
      storageError: "The saved dental chair request list could not be read and has not been overwritten.",
    };
  }
}

export function ChairRequestProvider({ children }) {
  const {
    items: cartItems,
    legacyChairItems,
    migrationReady,
    migrationError,
    migrationRetry,
    cartStorageReady,
    completeLegacyChairMigration,
    reportMigrationError,
    retryLegacyChairMigration,
  } = useCart();
  const [initialState] = useState(readChairState);
  const [items, setItems] = useState(initialState.items);
  const [storageReady, setStorageReady] = useState(initialState.storageReady);
  const [storageError, setStorageError] = useState(initialState.storageError);
  const skipNextChairPersist = useRef(false);

  useEffect(() => {
    if (migrationReady || !cartStorageReady || legacyChairItems.length === 0) return;
    try {
      const migrated = migrateLegacyChairStorage(localStorage, cartItems, legacyChairItems);
      skipNextChairPersist.current = true;
      setItems(migrated);
      setStorageReady(true);
      setStorageError("");
      completeLegacyChairMigration();
    } catch {
      reportMigrationError("Legacy dental chair requests could not be moved to their separate storage. The original product cart has not been overwritten. Check browser storage space/permissions, then retry.");
    }
  }, [
    migrationReady,
    cartStorageReady,
    legacyChairItems,
    cartItems,
    migrationRetry,
    completeLegacyChairMigration,
    reportMigrationError,
  ]);

  useEffect(() => {
    if (!migrationReady || !cartStorageReady || !storageReady) return;
    if (skipNextChairPersist.current) {
      skipNextChairPersist.current = false;
      return;
    }
    try {
      localStorage.setItem("yr-chair-requests", JSON.stringify(items));
      setStorageError("");
    } catch {
      setStorageError("Your dental chair request changes could not be saved to this browser. Retry saving before leaving this page.");
    }
  }, [items, migrationReady, cartStorageReady, storageReady]);

  function retryChairPersistence() {
    if (!storageReady) {
      const refreshed = readChairState();
      if (!refreshed.storageReady) {
        setStorageError(refreshed.storageError);
        return;
      }
      setItems(refreshed.items);
      setStorageReady(true);
      setStorageError("");
      return;
    }
    try {
      localStorage.setItem("yr-chair-requests", JSON.stringify(items));
      setStorageError("");
    } catch {
      setStorageError("Your dental chair requests are still not saved. Check browser storage space/permissions and retry.");
    }
  }

  function addChair(chair, quantity = 1) {
    if (!migrationReady || !cartStorageReady || !storageReady || !isDentalChairProduct(chair)) return;
    const amount = normalizeQuantity(quantity);
    setItems((current) => {
      const found = current.find((item) => item.slug === chair.slug);
      if (found)
        return current.map((item) =>
          item.slug === chair.slug
            ? { ...item, quantity: normalizeQuantity(item.quantity) + amount }
            : item,
        );
      return [...current, { ...chair, quantity: amount }];
    });
  }

  function removeChair(slug) {
    if (!migrationReady || !cartStorageReady || !storageReady) return;
    setItems((current) => current.filter((item) => item.slug !== slug));
  }

  function updateChairQuantity(slug, quantity) {
    if (!migrationReady || !cartStorageReady || !storageReady) return;
    const value = normalizeQuantity(quantity);
    setItems((current) =>
      current.map((item) =>
        item.slug === slug ? { ...item, quantity: value } : item,
      ),
    );
  }

  function clearChairs() {
    if (!migrationReady || !cartStorageReady || !storageReady) return;
    setItems([]);
  }

  const value = {
    items,
    count: items.reduce((sum, item) => sum + normalizeQuantity(item.quantity), 0),
    modelCount: items.length,
    addChair,
    removeChair,
    updateChairQuantity,
    clearChairs,
    migrationReady,
    migrationError,
    retryLegacyChairMigration,
    storageReady,
    storageError,
    retryChairPersistence,
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
