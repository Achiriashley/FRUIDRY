"use client";

import { useActionState, useId, useRef, useState } from "react";
import { addDays, invoiceTotals } from "@/lib/invoice-math";
import { formatPrice } from "@/lib/products";
import { submitKeepingInput, useFieldErrors } from "@/lib/use-keep-form";
import { saveInvoiceAction } from "./actions";

const inputClass =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
const CLIENT_KEYS = ["name", "contact", "phone", "email", "address", "niu"];
const FIELDS = [...CLIENT_KEYS, "issueDate", "dueDate", "discount", "notes"];
const EMPTY_CLIENT = Object.fromEntries(CLIENT_KEYS.map((key) => [key, ""]));

const toNumber = (text) => {
  const n = Number(String(text).replace(/[\s  ]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// The product's name in the invoice's language.
const productName = (product, lang) =>
  (lang === "fr" && product.nameFr) || product.name || product.slug;

let nextKey = 1;
const newLine = (line = {}) => ({
  key: nextKey++,
  slug: line.slug ?? "",
  description: line.description ?? "",
  quantity: String(line.quantity ?? 1),
  price: line.price === undefined ? "" : String(line.price),
});

// Makes or edits an invoice or proforma. `initial` holds what to start with (an
// invoice being edited, a copy, a website order or a chosen client).
export function InvoiceForm({ kind, initial, clients, products, dueDays, vatRate, editingId }) {
  const uid = useId();
  const [state, formAction, pending] = useActionState(saveInvoiceAction, { status: "idle" });
  const { formRef, errorId, fieldProps } = useFieldErrors(state, uid, FIELDS);

  const [lang, setLang] = useState(initial.lang ?? "fr");
  const [clientId, setClientId] = useState(initial.client?.id ?? "");
  const [client, setClient] = useState({ ...EMPTY_CLIENT, ...initial.client });
  const [lines, setLines] = useState(() =>
    initial.items?.length
      ? initial.items.map((item) =>
          // A product deleted since becomes a line of its own (same text and price).
          newLine({ ...item, slug: products.some((p) => p.slug === item.slug) ? item.slug : "" }),
        )
      : [newLine()],
  );
  const [discount, setDiscount] = useState(initial.discount ? String(initial.discount) : "");
  const [issueDate, setIssueDate] = useState(initial.issueDate);
  const [dueDate, setDueDate] = useState(initial.dueDate);
  const dueTouched = useRef(Boolean(editingId));

  const items = lines.map((line) => ({
    quantity: toNumber(line.quantity),
    price: toNumber(line.price),
  }));
  const totals = invoiceTotals({ items, discount: toNumber(discount), vatRate });
  const proforma = kind === "proforma";

  function chooseClient(id) {
    setClientId(id);
    const saved = clients.find((c) => c.id === id);
    if (saved) setClient(Object.fromEntries(CLIENT_KEYS.map((key) => [key, saved[key] ?? ""])));
  }

  function changeLine(key, change) {
    setLines((list) => list.map((line) => (line.key === key ? { ...line, ...change } : line)));
  }

  function chooseProduct(key, slug) {
    const product = products.find((p) => p.slug === slug);
    changeLine(
      key,
      product
        ? { slug, description: productName(product, lang), price: String(product.price) }
        : { slug: "" },
    );
  }

  // Product lines whose description is still the product's name follow the language.
  function changeLang(next) {
    setLang(next);
    setLines((list) =>
      list.map((line) => {
        const product = products.find((p) => p.slug === line.slug);
        const named =
          product && [product.name, product.nameFr].filter(Boolean).includes(line.description);
        return named ? { ...line, description: productName(product, next) } : line;
      }),
    );
  }

  const field = (name, label, input, hint) => (
    <div>
      <label htmlFor={`${uid}-${name}`} className="text-sm font-medium">
        {label}
      </label>
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
      {input({ id: `${uid}-${name}`, name, className: inputClass, ...fieldProps(name) })}
      {state.errors?.[name] && (
        <p id={errorId(name)} className="mt-1 text-sm text-red-600">
          {state.errors[name]}
        </p>
      )}
    </div>
  );

  // What a client field needs: its value and keeping what's typed.
  const clientValue = (key) => ({
    value: client[key],
    onChange: (e) => setClient((c) => ({ ...c, [key]: e.target.value })),
  });

  const linesForServer = JSON.stringify(
    lines.map(({ slug, description, quantity, price }) => ({
      slug: slug || null,
      description,
      quantity,
      price,
    })),
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={submitKeepingInput(formAction)}
      noValidate
      className="space-y-6"
    >
      {editingId && <input type="hidden" name="id" value={editingId} />}
      <input type="hidden" name="kind" value={kind} />
      {initial.orderId && <input type="hidden" name="orderId" value={initial.orderId} />}
      <input type="hidden" name="items" value={linesForServer} />

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Client</h2>
        {clients.length > 0 && (
          <div>
            <label htmlFor={`${uid}-clientId`} className="text-sm font-medium">
              Saved client
            </label>
            <select
              id={`${uid}-clientId`}
              name="clientId"
              value={clientId}
              onChange={(e) => chooseClient(e.target.value)}
              className={inputClass}
            >
              <option value="">New client (type the details below)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {field(
            "name",
            "Client name",
            (props) => (
              <input {...props} {...clientValue("name")} />
            ),
            "Business or person",
          )}
          {field("contact", "Contact person (optional)", (props) => (
            <input {...props} {...clientValue("contact")} />
          ))}
          {field("phone", "Phone / WhatsApp (optional)", (props) => (
            <input {...props} {...clientValue("phone")} type="tel" inputMode="tel" />
          ))}
          {field("email", "Email (optional)", (props) => (
            <input {...props} {...clientValue("email")} type="email" inputMode="email" />
          ))}
          {field("address", "Address (optional)", (props) => (
            <input {...props} {...clientValue("address")} />
          ))}
          {field(
            "niu",
            "Client's NIU (optional)",
            (props) => (
              <input {...props} {...clientValue("niu")} />
            ),
            "Their taxpayer number",
          )}
        </div>
        {!clientId && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="saveClient" defaultChecked={!initial.orderId} />
            Save to my clients
          </label>
        )}
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">Details</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={`${uid}-lang`} className="text-sm font-medium">
              Language
            </label>
            <select
              id={`${uid}-lang`}
              name="lang"
              value={lang}
              onChange={(e) => changeLang(e.target.value)}
              className={inputClass}
            >
              <option value="fr">French</option>
              <option value="en">English</option>
            </select>
          </div>
          {field("issueDate", "Date", (props) => (
            <input
              {...props}
              type="date"
              value={issueDate}
              onChange={(e) => {
                setIssueDate(e.target.value);
                if (!dueTouched.current && e.target.value) {
                  setDueDate(addDays(e.target.value, dueDays));
                }
              }}
            />
          ))}
          {field("dueDate", proforma ? "Valid until" : "Pay by", (props) => (
            <input
              {...props}
              type="date"
              value={dueDate}
              onChange={(e) => {
                dueTouched.current = true;
                setDueDate(e.target.value);
              }}
            />
          ))}
        </div>
      </section>

      <section
        className="space-y-4 rounded-2xl bg-white p-5 shadow-sm"
        aria-labelledby={`${uid}-lines`}
      >
        <h2 id={`${uid}-lines`} className="text-lg font-bold">
          What you&apos;re billing
        </h2>
        <ol className="space-y-4">
          {lines.map((line, index) => (
            <li key={line.key} className="rounded-xl border border-stone-200 p-4">
              <fieldset className="grid gap-3 sm:grid-cols-6">
                <legend className="mb-2 text-sm font-semibold">Line {index + 1}</legend>
                <div className="sm:col-span-6">
                  <label htmlFor={`${uid}-product-${line.key}`} className="text-sm font-medium">
                    Product
                  </label>
                  <select
                    id={`${uid}-product-${line.key}`}
                    value={line.slug}
                    onChange={(e) => chooseProduct(line.key, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Something else (write it below)</option>
                    {products.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {productName(p, lang)} · {formatPrice(p.price)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-6">
                  <label htmlFor={`${uid}-description-${line.key}`} className="text-sm font-medium">
                    Description
                  </label>
                  <input
                    id={`${uid}-description-${line.key}`}
                    value={line.description}
                    onChange={(e) => changeLine(line.key, { description: e.target.value })}
                    placeholder="e.g. Delivery to Yaoundé"
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={`${uid}-quantity-${line.key}`} className="text-sm font-medium">
                    Quantity
                  </label>
                  <input
                    id={`${uid}-quantity-${line.key}`}
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(e) => changeLine(line.key, { quantity: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={`${uid}-price-${line.key}`} className="text-sm font-medium">
                    Unit price (FCFA)
                  </label>
                  <input
                    id={`${uid}-price-${line.key}`}
                    inputMode="numeric"
                    value={line.price}
                    onChange={(e) => changeLine(line.key, { price: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <p className="flex items-end justify-between gap-2 sm:col-span-2">
                  <span className="text-sm text-stone-600">
                    {formatPrice(toNumber(line.quantity) * toNumber(line.price))}
                  </span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((list) => list.filter((l) => l.key !== line.key))}
                      className="text-sm font-semibold text-red-700 underline"
                    >
                      Remove line {index + 1}
                    </button>
                  )}
                </p>
              </fieldset>
            </li>
          ))}
        </ol>
        {state.errors?.items && (
          <p role="alert" className="text-sm text-red-600">
            {state.errors.items}
          </p>
        )}
        <button
          type="button"
          onClick={() => setLines((list) => [...list, newLine()])}
          className="rounded-full border border-brand px-4 py-2 text-sm font-semibold text-brand hover:bg-brand-light"
        >
          + Add a line
        </button>

        <div className="grid gap-4 border-t border-stone-100 pt-4 sm:grid-cols-2">
          {field(
            "discount",
            "Discount in FCFA (optional)",
            (props) => (
              <input
                {...props}
                inputMode="numeric"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            ),
            "Taken off the total",
          )}
          <dl className="grid grid-cols-[1fr_auto] content-end gap-x-4 gap-y-1 text-sm">
            <dt className="text-stone-600">Subtotal</dt>
            <dd className="text-right">{formatPrice(totals.subtotal)}</dd>
            {totals.discount > 0 && (
              <>
                <dt className="text-stone-600">Discount</dt>
                <dd className="text-right">−{formatPrice(totals.discount)}</dd>
              </>
            )}
            {vatRate > 0 && (
              <>
                <dt className="text-stone-600">TVA {Math.round(vatRate * 10000) / 100}%</dt>
                <dd className="text-right">{formatPrice(totals.vat)}</dd>
              </>
            )}
            <dt className="text-base font-bold">Total</dt>
            <dd className="text-right text-base font-bold" aria-live="polite">
              {formatPrice(totals.total)}
            </dd>
          </dl>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        {field(
          "notes",
          "Notes on the invoice (optional)",
          (props) => (
            <textarea {...props} rows={3} defaultValue={initial.notes ?? ""} />
          ),
          "For example delivery details or a purchase order number",
        )}
      </section>

      {state.errors?.form && (
        <p role="alert" className="text-sm text-red-600">
          {state.errors.form}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {pending
          ? "Saving…"
          : editingId
            ? "Save changes"
            : proforma
              ? "Save proforma"
              : "Save invoice"}
      </button>
    </form>
  );
}
