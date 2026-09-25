import Link from "next/link";
import { ArrowLeft, Layers, ListOrdered } from "lucide-react";
import { AuthorityShell } from "@/components/authority/AuthorityShell";
import { GISMap } from "@/components/authority/GISMap";
import { Button } from "@/components/ui/Button";

export default function AuthorityMapPage() {
  return (
    <AuthorityShell>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-6 border-b border-[#2C2A25]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F4B52C]/10 border border-[#F4B52C]/30 text-[#F4B52C] font-mono text-[10.5px] uppercase tracking-wider font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F4B52C] animate-pulse" />
              GIS Asset Intelligence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F3F0E8]">
            Municipal Geospatial Asset Map
          </h1>
          <p className="text-[14px] text-[#8D918F] mt-1">
            Geographic distribution of reported civic defects, severity density clusters, and municipal dispatch points.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button href="/authority/priority" variant="secondary" size="md" className="gap-2">
            <ListOrdered size={16} />
            <span>Priority Queue</span>
          </Button>
        </div>
      </div>

      {/* Full Size GIS Map Interface */}
      <GISMap height={640} />
    </AuthorityShell>
  );
}
