import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/landing/Footer";
import { Mail, Github, Linkedin, FileText } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="pt-16">
      <div className="container-px pt-20 pb-24 max-w-xl mx-auto">
        <div className="eyebrow mb-3 text-center">Contact</div>
        <h1 className="display-xl text-[clamp(26px,4vw,40px)] text-center mb-4">
          Let&apos;s make infrastructure smarter.
        </h1>
        <p className="text-[var(--text-secondary)] text-center text-[14.5px] mb-10">
          Questions about the platform, the SIH build, or partnering with your
          municipality — reach out.
        </p>

        <form id="contact-form" className="card-surface p-6 space-y-4">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-1.5 block">
              Name
            </label>
            <input
              className="focus-ring w-full rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] px-3 py-2.5 text-[13.5px]"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-1.5 block">
              Email
            </label>
            <input
              type="email"
              className="focus-ring w-full rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] px-3 py-2.5 text-[13.5px]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wide text-[var(--text-muted)] mb-1.5 block">
              Message
            </label>
            <textarea
              rows={4}
              className="focus-ring w-full rounded-lg bg-[var(--bg-alt)] border border-[var(--border)] px-3 py-2.5 text-[13.5px] resize-none"
              placeholder="How can we help?"
            />
          </div>
          <Button type="button" className="w-full justify-center">
            Send message
          </Button>
        </form>

        <div className="flex justify-center gap-8 text-[var(--text-muted)] mt-10">
          <Mail size={18} />
          <Github size={18} />
          <Linkedin size={18} />
          <FileText size={18} />
        </div>
      </div>
      <Footer />
    </div>
  );
}
