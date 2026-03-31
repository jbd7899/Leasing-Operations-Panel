import { ScrollProgress } from "@/components/layout/ScrollProgress";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { PricingSection } from "@/components/sections/PricingSection";

export default function App() {
  return (
    <div className="min-h-screen bg-navy">
      <ScrollProgress />
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorks />
        <PricingSection />
      </main>
      <Footer />
    </div>
  );
}
