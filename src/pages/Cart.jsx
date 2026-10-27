import React from "react";
import { useCart } from "../components/CartContext";
import { useChairRequests } from "../components/ChairRequestContext";
import { Link } from "../components/Layout";

export default function Cart({ navigate }) {
  const { items, removeFromCart, updateQuantity, clearCart } = useCart();
  const { count: chairCount, modelCount } = useChairRequests();
  const productCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <main className="bp-cart">
      <div className="container">
        <div className="bp-page-heading">
          <p className="bp-eyebrow">REQUEST CENTRE</p>
          <h1>Your Product Cart</h1>
          <p>
            Review equipment selected from the catalogue before sending your
            quotation request.
          </p>
        </div>
        <div className="request-tabs">
          <Link to="/cart" navigate={navigate} className="request-tab active">
            Product Cart <span>{productCount}</span>
          </Link>
          <Link
            to="/dental-chair-request"
            navigate={navigate}
            className="request-tab"
          >
            Dental Chair Requests <span>{chairCount}</span>
          </Link>
        </div>
        <div className="bp-cart-layout">
          <section>
            {items.length ? (
              <>
                <div className="bp-cart-table-head">
                  <span>Product</span>
                  <span>Price</span>
                  <span>Quantity</span>
                  <span>Total</span>
                </div>
                {items.map((item) => (
                  <div className="bp-cart-row" key={item.slug}>
                    <div className="bp-cart-product">
                      <img src={item.img} alt={item.name} />
                      <div>
                        <small>{item.brand}</small>
                        <h3>{item.name}</h3>
                        <button
                          className="text-button"
                          onClick={() => removeFromCart(item.slug)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <span>Quotation</span>
                    <div className="bp-qty">
                      <button
                        onClick={() =>
                          updateQuantity(item.slug, item.quantity - 1)
                        }
                      >
                        −
                      </button>
                      <b>{item.quantity}</b>
                      <button
                        onClick={() =>
                          updateQuantity(item.slug, item.quantity + 1)
                        }
                      >
                        +
                      </button>
                    </div>
                    <span>On request</span>
                  </div>
                ))}
              </>
            ) : (
              <div className="bp-empty-cart">
                <h2>Your product cart is empty</h2>
                <p>Add equipment from the catalogue to prepare a quotation.</p>
                <Link
                  to="/products"
                  navigate={navigate}
                  className="bp-btn bp-btn-primary"
                >
                  Browse Products →
                </Link>
              </div>
            )}
            <div className="bp-cart-browse">
              <Link to="/products" navigate={navigate}>
                ← Browse More Products
              </Link>
              {items.length > 0 && (
                <button onClick={clearCart}>Clear Product Cart</button>
              )}
            </div>
            {chairCount > 0 && (
              <div className="bp-chair-note">
                <b>
                  {modelCount} dental chair model{modelCount === 1 ? "" : "s"}
                </b>{" "}
                are kept in the separate chair request list.{" "}
                <Link to="/dental-chair-request" navigate={navigate}>
                  Open Dental Chair Requests →
                </Link>
              </div>
            )}
          </section>
          <aside className="bp-cart-summary">
            <p className="bp-eyebrow bp-eyebrow-light">PRODUCT QUOTATION</p>
            <h2>Request Summary</h2>
            <dl>
              <div>
                <dt>Selected products</dt>
                <dd>{productCount}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>To be quoted</dd>
              </div>
              <div className="total">
                <dt>Total</dt>
                <dd>On request</dd>
              </div>
            </dl>
            <button
              className="bp-btn bp-btn-primary"
              disabled={!items.length}
              onClick={() => navigate("/quote")}
            >
              Proceed to Quote →
            </button>
            <Link
              to="/products"
              navigate={navigate}
              className="bp-summary-link"
            >
              Continue Shopping
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
