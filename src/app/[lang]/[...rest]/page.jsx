import { notFound } from "next/navigation";

// Any other address under /fr or /en shows the "page not found" page in that language.
export default function UnknownPage() {
  notFound();
}
