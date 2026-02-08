import { QuickSubmit } from "@/components/QuickSubmit";

export default function DataCommons() {
  return (
    <div className="flex flex-col h-screen">
      {/* Embedded Data Commons */}
      <div className="flex-1 relative">
        <iframe
          src="https://datacommons.org/tools/visualization#visType=map"
          className="w-full h-full border-0"
          title="Google Data Commons"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
        />
        
        {/* Quick Submit Component */}
        <QuickSubmit />
        </div>
    </div>
  );
}