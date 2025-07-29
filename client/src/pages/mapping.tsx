import { useState, useRef } from 'react';

// National Geographic MapMaker integration
const NATGEO_MAPMAKER_URL = 'https://www.arcgis.com/apps/instant/atlas/index.html?appid=0cd1cdee853c413a84bfe4b9a6931f0d';

export default function MappingPage() {
  const [isMapLoading, setIsMapLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = () => {
    setIsMapLoading(false);
  };

  return (
    <div className="h-full relative">
      {isMapLoading && (
        <div className="absolute inset-0 bg-white z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading MapMaker</h3>
            <p className="text-sm text-gray-600">Initializing National Geographic's professional mapping tools...</p>
          </div>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        src={NATGEO_MAPMAKER_URL}
        className="w-full h-full border-0"
        title="National Geographic MapMaker"
        onLoad={handleIframeLoad}
        allowFullScreen
      />
    </div>
  );
}