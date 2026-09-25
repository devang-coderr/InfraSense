import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReportForm } from "@/components/citizen/ReportForm";

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-[#0D0F10] text-[#F3F0E8] pt-24 sm:pt-28 pb-24 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto mb-8">
        <div className="mb-4">
          <Link
            href="/citizen"
            className="focus-ring inline-flex items-center gap-1.5 text-[12.5px] font-mono text-[#8D918F] hover:text-[#F4B52C] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F4B52C]/10 border border-[#F4B52C]/30 text-[#F4B52C] font-mono text-[10.5px] uppercase tracking-wider font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#F4B52C]" />
            Citizen Reporting Flow
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F3F0E8] mb-2">
          Report an Infrastructure Issue
        </h1>
        <p className="text-[14px] text-[#8D918F] leading-relaxed">
          Provide photo evidence and location details to initiate automated AI classification and dispatch municipal engineering teams.
        </p>
      </div>

      <ReportForm />
    </div>
  );
}
