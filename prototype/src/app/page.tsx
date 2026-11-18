import { Suspense } from "react";
import SplitSmartApp from "@/components/SplitSmartApp";

export default function Home() {
  return (
    <Suspense fallback={<p className="p-8 text-slate-500">Loading SplitSmart…</p>}>
      <SplitSmartApp />
    </Suspense>
  );
}
