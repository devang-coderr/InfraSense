import { Button } from "@/components/ui/Button";
import { Github, Mail, FileText, Linkedin } from "lucide-react";

export function ContactSection() {
  return (
    <section id="contact" className="relative z-10 container-px py-28 md:py-36">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="display-xl text-[clamp(30px,5vw,54px)] mb-5">
          Your city is always changing.
        </h2>
        <p className="text-[var(--text-secondary)] text-[16px] mb-10">
          Let&apos;s make its infrastructure smarter.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mb-14">
          <Button href="/citizen" withArrow>
            Get Started
          </Button>
          <Button href="#contact-form" variant="secondary">
            Contact Us
          </Button>
        </div>
        <div className="flex justify-center gap-8 text-[var(--text-muted)]">
          <Mail size={18} />
          <Github size={18} />
          <Linkedin size={18} />
          <FileText size={18} />
        </div>
      </div>
    </section>
  );
}
