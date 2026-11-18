import React, { useEffect, useState } from "react";

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
  const safeSrc = typeof src === "string" && src.trim() ? src.trim() : "";
  const safeAlt = typeof alt === "string" && alt.trim() ? alt.trim() : "Product image";
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [safeSrc]);

  return (
    <div className={`yr-product-media yr-product-media--${variant} ${className}`.trim()}>
      {!safeSrc || imageFailed ? (
        <div
          className="yr-product-media-placeholder"
          role="img"
          aria-label={`${safeAlt} — image unavailable`}
        >
          <span>Product image unavailable</span>
        </div>
      ) : (
        <img
          src={safeSrc}
          alt={safeAlt}
          loading={variant === "detail" ? "eager" : "lazy"}
          decoding="async"
          onError={(event) => {
            setImageFailed(true);
            onError?.(event);
          }}
        />
      )}
    </div>
  );
}
