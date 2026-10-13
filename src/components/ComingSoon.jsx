import { ProductImage } from "./ProductImage";
import { ProductLink } from "./ProductLink";

// Products marked "Coming soon" in the admin panel: shown, but not for sale yet.
export function ComingSoon({ products, images, t }) {
  if (products.length === 0) return null;
  return (
    <section aria-labelledby="coming-soon-heading">
      <h2 id="coming-soon-heading" className="text-3xl font-bold tracking-tight text-brand-deep">
        {t.comingSoon.heading}
      </h2>
      <p className="mt-1 mb-6 text-stone-600">{t.comingSoon.intro}</p>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {products.map((product) => (
          <li key={product.slug}>
            <ProductLink
              slug={product.slug}
              className="group block overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative">
                <ProductImage
                  product={product}
                  src={images[product.slug]}
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="aspect-[4/5] transition group-hover:scale-[1.02]"
                />
                <span className="absolute top-2 left-2 rounded-full bg-sun px-2 py-1 text-[11px] font-bold whitespace-nowrap text-brand-deep shadow-sm min-[340px]:px-2.5 min-[340px]:text-xs">
                  {t.comingSoon.badge}
                </span>
              </div>
              <p className="p-3 font-semibold text-stone-900 group-hover:text-brand">
                {product.name}
              </p>
            </ProductLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
