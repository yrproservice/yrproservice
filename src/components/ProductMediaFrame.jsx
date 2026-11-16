import React from "react";

/**
 * Shared product image stage.
 * object-fit: contain keeps tall, wide, square and transparent product images
 * fully visible without changing their source aspect ratio.
 */
export default function ProductMediaFrame({
  src,
  alt,
  variant = "card",
  className = "",
  onError,
}) {
  const safeSrc = typeof src === "string" && src.trim() ? src : "/favicon.png";
  const safeAlt = typeof alt === "string" && alt.trim() ? alt : "Product image";

  return (
    <div className={`yr-product-media yr-product-media--${variant} ${className}`.trim()}>
      <img
        src={safeSrc}
        alt={safeAlt}
        loading={variant === "detail" ? "eager" : "lazy"}
        decoding="async"
        onError={onError}
      />
    </div>
  );
}
