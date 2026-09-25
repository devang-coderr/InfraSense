import { Hero } from "@/components/landing/Hero";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { MobileShowcase } from "@/components/landing/MobileShowcase";
import { CitizenSection } from "@/components/landing/CitizenSection";
import { AuthoritySection } from "@/components/landing/AuthoritySection";
import { HealthSection } from "@/components/landing/HealthSection";
import { PredictionSection } from "@/components/landing/PredictionSection";
import { ExplainableAI } from "@/components/landing/ExplainableAI";
import { AboutSection } from "@/components/landing/AboutSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <MobileShowcase />
      <CitizenSection />
      <AuthoritySection />
      <HealthSection />
      <PredictionSection />
      <ExplainableAI />
      <AboutSection />
      <ContactSection />
      <Footer />
    </>
  );
}
