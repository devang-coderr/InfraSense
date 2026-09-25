import { AboutSection } from "@/components/landing/AboutSection";
import { Footer } from "@/components/landing/Footer";

export default function AboutPage() {
  return (
    <div className="pt-16">
      <div className="container-px pt-20 pb-4">
        <div className="eyebrow mb-3">About</div>
        <h1 className="display-xl text-[clamp(28px,4.5vw,48px)] max-w-2xl">
          Built to make infrastructure intelligence accessible.
        </h1>
      </div>
      <AboutSection />
      <Footer />
    </div>
  );
}
