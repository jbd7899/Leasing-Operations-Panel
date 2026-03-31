import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { ProductOverview } from "@/components/sections/ProductOverview";
import { FeatureDeepDive } from "@/components/sections/FeatureDeepDive";
import { AnalyticsSection } from "@/components/sections/AnalyticsSection";
import { IntegrationStrip } from "@/components/sections/IntegrationStrip";
import { StatsSection } from "@/components/sections/StatsSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { FAQSection } from "@/components/sections/FAQSection";
import { FooterCTA } from "@/components/sections/FooterCTA";

export default function App() {
  return (
    <div className="min-h-screen bg-navy">
      <ScrollProgress />
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <ProductOverview />
        <FeatureDeepDive />
        <AnalyticsSection />
        <IntegrationStrip />
        <StatsSection />
        <PricingSection />
        <FAQSection />
        <FooterCTA />
      </main>
      <Footer />
    </div>
  );
}
