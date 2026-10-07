import Link from "next/link";

export const metadata = {
  title: "Our story",
  description: "How Fruidry started and how we make our freeze-dried fruit.",
};

const steps = [
  {
    n: "01",
    title: "Pick it ripe",
    text: "We buy fruit at peak ripeness from growers we know by name.",
  },
  {
    n: "02",
    title: "Slice by hand",
    text: "Every piece is washed, peeled and sliced to the right thickness.",
  },
  {
    n: "03",
    title: "Freeze and dry",
    text: "We flash-freeze the fruit, then a vacuum turns the ice straight to vapour. No high heat, so flavour, colour and nutrients stay in.",
  },
  {
    n: "04",
    title: "Pack it fresh",
    text: "Sealed into airtight, resealable pouches the same day, so every piece stays crunchy.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-extrabold tracking-tight">Our story</h1>
      <div className="mt-6 space-y-4 text-lg text-stone-700">
        <p>
          Fruidry started with a simple frustration: most dried fruit on the shelf was chewy, sticky
          or coated in sugar, oil or preservatives. We wanted snacks that tasted like the fruit they
          came from.
        </p>
        <p>
          So we turned to freeze-drying. Fruit is frozen at peak ripeness and the water is gently
          removed under vacuum. The result is crunchy strawberries, golden mango and crisp apple
          that taste like fresh fruit, with nothing added.
        </p>
      </div>

      <h2 className="mt-14 text-2xl font-bold">How we make it</h2>
      <ol className="mt-6 grid gap-6 sm:grid-cols-2">
        {steps.map((s) => (
          <li key={s.n} className="rounded-2xl bg-white p-6 shadow-sm">
            <span className="text-sm font-bold text-brand">{s.n}</span>
            <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
            <p className="mt-1 text-stone-600">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-50 p-8 text-center">
        <h2 className="text-2xl font-bold">Taste the difference</h2>
        <Link
          href="/shop"
          className="mt-4 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark"
        >
          Shop the range
        </Link>
      </div>
    </div>
  );
}
