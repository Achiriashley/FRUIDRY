import Image from "next/image";

export function ProductImage({
  product,
  src,
  sizes,
  emojiClassName = "text-7xl",
  className = "",
  preload = false,
}) {
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${product.color} ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={product.name}
          fill
          sizes={sizes}
          preload={preload}
          className="object-cover"
        />
      ) : (
        <span className={emojiClassName} aria-hidden>
          {product.emoji}
        </span>
      )}
    </div>
  );
}
