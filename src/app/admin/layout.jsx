import { SiteFrame } from "@/components/SiteFrame";
import "../globals.css";

export const metadata = {
  title: { default: "Admin", template: "%s | Fruidry" },
  robots: { index: false, follow: false },
};

// The admin panel is in English and has its own address outside /fr and /en.
export default function AdminLayout({ children }) {
  return <SiteFrame lang="en" languageSwitch={false}>{children}</SiteFrame>;
}
