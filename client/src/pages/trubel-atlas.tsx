import { QuickSubmit } from '@/components/QuickSubmit';

export default function TrubelAtlas() {
  return (
    <div className="flex flex-col h-screen">
      {/* Embedded Trubel Atlas */}
      <div className="flex-1 relative">
        <iframe
          src="https://trubel.maps.arcgis.com/apps/instant/atlas/index.html?appid=988d3a4d750c4d79bdb0bbcb1f4b0a3f"
          className="w-full h-full border-0"
          title="Trubel Atlas"
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-downloads"
        />
        
        {/* Quick Submit Component */}
        <QuickSubmit />
        </div>
    </div>
  );
}



