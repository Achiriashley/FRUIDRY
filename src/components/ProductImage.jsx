import Image from "next/image";

export function ProductImage({
  product,
  src,
  sizes,
  alt = product.name,
  emojiClassName = "text-7xl",
  className = "",
  preload = false,
}) {
  // A photo uploaded in the admin panel wins over a file in public/products.
  const imageSrc = product.image || src;
  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br ${product.color} ${className}`}
    >
      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          sizes={sizes}
          preload={preload}
          className="object-contain p-[7%] drop-shadow-xl"
        />
      ) : (
        <span className={emojiClassName} aria-hidden>
          {product.emoji}
        </span>
      )}
    </div>
  );
}
