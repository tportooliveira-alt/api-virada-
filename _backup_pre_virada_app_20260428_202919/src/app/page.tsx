import AudienceSection from "@/components/AudienceSection";
import BonusSection from "@/components/BonusSection";
import ExitPopup from "@/components/ExitPopup";
import FAQSection from "@/components/FAQSection";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import GuaranteeSection from "@/components/GuaranteeSection";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import LeadCapture from "@/components/LeadCapture";
import LearnSection from "@/components/LearnSection";
import LiveSales from "@/components/LiveSales";
import OfferSection from "@/components/OfferSection";
import PainSection from "@/components/PainSection";
import ProductSection from "@/components/ProductSection";
import PromiseSection from "@/components/PromiseSection";
import TestimonialsSection from "@/components/TestimonialsSection";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <PainSection />
        <PromiseSection />
        <ProductSection />
        <LearnSection />
        <BonusSection />
        <TestimonialsSection />
        <AudienceSection />
        <OfferSection />
        <GuaranteeSection />
        <FAQSection />
        <LeadCapture />
        <FinalCTA />
      </main>
      <Footer />
      <LiveSales />
      <ExitPopup />
    </>
  );
}
