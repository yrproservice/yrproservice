import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('yr-cart') || '[]'); }
    catch { return []; }
  });

  useEffect(() => { localStorage.setItem('yr-cart', JSON.stringify(items)); }, [items]);

  function addToCart(product, quantity = 1) {
    const amount = Math.max(1, Number(quantity) || 1);
    setItems(current => {
      const found = current.find(item => item.slug === product.slug);
      if (found) return current.map(item => item.slug === product.slug ? { ...item, quantity: item.quantity + amount } : item);
      return [...current, { ...product, quantity: amount }];
    });
  }
  function removeFromCart(slug) { setItems(current => current.filter(item => item.slug !== slug)); }
  function updateQuantity(slug, quantity) { const value = Math.max(1, Number(quantity) || 1); setItems(current => current.map(item => item.slug === slug ? { ...item, quantity: value } : item)); }
  function clearCart() { setItems([]); }

  const value = useMemo(() => ({ items, cartCount: items.reduce((sum, item) => sum + item.quantity, 0), addToCart, removeFromCart, updateQuantity, clearCart }), [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { return useContext(CartContext); }
