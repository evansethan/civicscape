import { QuickSubmit } from "@/components/QuickSubmit";

export default function ArcGISHub() {
  return (
    <div className="flex flex-col h-screen">
      {/* Embedded ArcGIS Hub */}
      <div className="flex-1 relative">
        <iframe
          src="https://datahub-mappingjustice.hub.arcgis.com/"
          className="w-full h-full border-0"
          title="Mapping Justice Data Hub"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
        />
        
        {/* Quick Submit Component */}
        <QuickSubmit />
        </div>
    </div>
  );
}