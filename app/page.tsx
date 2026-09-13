import type { Metadata } from "next";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { Hero } from "@/components/marketing/hero";
import { ProductDemo } from "@/components/marketing/product-demo";
import {
  FeatureGrid,
  FinalCta,
  HowItWorks,
  ProblemSection,
  ProductShowcase,
  RoleSection,
  TrustStrip,
  WhySanitaryLogic,
} from "@/components/marketing/sections";
import { Pricing } from "@/components/marketing/pricing";
import { Faq } from "@/components/marketing/faq";

const description =
  "Manage sites, cleaners, periodic services, work orders, assets, compliance and reporting in one commercial cleaning operations platform.";

export const metadata: Metadata = {
  title: "Sanitary Logic | Commercial Cleaning Operations Software",
  description,
  openGraph: {
    title: "Sanitary Logic | Commercial Cleaning Operations Software",
    description,
    type: "website",
    siteName: "Sanitary Logic",
  },
};

export default function Home() {
  return (
    <div className="marketing-page min-h-screen overflow-hidden bg-white text-slate-950">
      <MarketingNavbar />
      <main>
        <Hero />
        <TrustStrip />
        <ProblemSection />
        <HowItWorks />
        <ProductDemo />
        <ProductShowcase />
        <FeatureGrid />
        <RoleSection />
        <WhySanitaryLogic />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  );
}
