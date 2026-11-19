import test from "node:test";
import assert from "node:assert/strict";
import { products } from "../src/data/products.js";
import { migrateLegacyChairStorage, mergeLegacyChairRequests } from "../src/data/cartMigration.js";

const chair = products.find((item) => item.slug === "signo-t100");
const normalProduct = products.find((item) => !["signo-t100", "signo-t500"].includes(item.slug));

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    failSetKey: "",
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      if (this.failSetKey === key) throw new Error("QuotaExceededError");
      values.set(key, String(value));
    },
  };
}

test("legacy chair migration adds quantities once when the destination already contains the model", () => {
  const existing = [{ ...chair, quantity: 2 }];
  const legacy = [{ ...chair, quantity: 3 }];
  const first = mergeLegacyChairRequests(existing, legacy);
  assert.equal(first.length, 1);
  assert.equal(first[0].quantity, 5);
  assert.equal(first[0].legacyCartMigratedQuantity, 3);

  const retry = mergeLegacyChairRequests(first, legacy);
  assert.equal(retry.length, 1);
  assert.equal(retry[0].quantity, 5);
});

test("a failed cart rewrite preserves the original cart and retry does not duplicate migrated chairs", () => {
  const legacy = [{ ...chair, quantity: 2 }];
  const cartItems = [normalProduct];
  const originalCart = JSON.stringify([...cartItems, ...legacy]);
  const storage = createStorage({
    "yr-cart": originalCart,
    "yr-chair-requests": "[]",
  });
  storage.failSetKey = "yr-cart";

  assert.throws(
    () => migrateLegacyChairStorage(storage, cartItems, legacy),
    /QuotaExceededError/
  );
  assert.equal(storage.getItem("yr-cart"), originalCart);
  const firstDestination = JSON.parse(storage.getItem("yr-chair-requests"));
  assert.equal(firstDestination.length, 1);
  assert.equal(firstDestination[0].quantity, 2);

  storage.failSetKey = "";
  const retry = migrateLegacyChairStorage(storage, cartItems, legacy);
  assert.equal(retry.length, 1);
  assert.equal(retry[0].quantity, 2);
  assert.deepEqual(JSON.parse(storage.getItem("yr-cart")), cartItems);
});

test("a failed destination write leaves the original cart untouched", () => {
  const legacy = [{ ...chair, quantity: 4 }];
  const cartItems = [normalProduct];
  const originalCart = JSON.stringify([...cartItems, ...legacy]);
  const storage = createStorage({
    "yr-cart": originalCart,
    "yr-chair-requests": "[]",
  });
  storage.failSetKey = "yr-chair-requests";

  assert.throws(
    () => migrateLegacyChairStorage(storage, cartItems, legacy),
    /QuotaExceededError/
  );
  assert.equal(storage.getItem("yr-cart"), originalCart);
  assert.equal(storage.getItem("yr-chair-requests"), "[]");
});
