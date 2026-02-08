import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { ZoomIn, ZoomOut, Home, MousePointer, Hand, MapPin, Save, Download } from 'lucide-react';
import { MapData, LayerData, Annotation } from '@/lib/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
});

interface MapEditorProps {
  initialData?: MapData;
  onSave?: (data: MapData) => void;
  onExport?: (data: MapData) => void;
  readOnly?: boolean;
}

const DEFAULT_MAP_DATA: MapData = {
  zoom: 10,
  center: [40.7128, -74.0060], // NYC
  layers: [
    { id: 'streets', name: 'Street Map', type: 'tile', visible: true, opacity: 1 },
    { id: 'satellite', name: 'Satellite', type: 'tile', visible: false, opacity: 1 },
    { id: 'boundaries', name: 'Boundaries', type: 'vector', visible: false, opacity: 0.8 },
    { id: 'landuse', name: 'Land Use', type: 'vector', visible: false, opacity: 0.6 },
  ],
  annotations: [],
};

export function MapEditor({ initialData, onSave, onExport, readOnly = false }: MapEditorProps) {
  const [mapData, setMapData] = useState<MapData>(initialData || DEFAULT_MAP_DATA);
  const [selectedTool, setSelectedTool] = useState<string>('select');
  const [markers, setMarkers] = useState<Array<{ id: string; position: [number, number]; name: string }>>([]);
  const mapRef = useRef<any>(null);

  const tools = [
    { id: 'select', name: 'Select', icon: MousePointer },
    { id: 'pan', name: 'Pan', icon: Hand },
    { id: 'point', name: 'Point', icon: MapPin },
  ];

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
  };

  const handleLayerToggle = (layerId: string, visible: boolean) => {
    setMapData(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId ? { ...layer, visible } : layer
      ),
    }));
  };

  const handleLayerOpacity = (layerId: string, opacity: number) => {
    setMapData(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === layerId ? { ...layer, opacity: opacity / 100 } : layer
      ),
    }));
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleZoomToExtent = () => {
    if (mapRef.current) {
      mapRef.current.setView(DEFAULT_MAP_DATA.center, DEFAULT_MAP_DATA.zoom);
    }
  };

  const handleMapClick = (e: any) => {
    if (selectedTool === 'point') {
      const newMarker = {
        id: `marker-${Date.now()}`,
        position: [e.latlng.lat, e.latlng.lng] as [number, number],
        name: `Point ${markers.length + 1}`
      };
      setMarkers(prev => [...prev, newMarker]);
    }
  };

  const handleSave = () => {
    if (onSave) {
      const updatedMapData = {
        ...mapData,
        annotations: markers.map(marker => ({
          id: marker.id,
          type: 'point' as const,
          coordinates: marker.position,
          properties: {
            text: marker.name,
            color: '#3388ff'
          }
        }))
      };
      onSave(updatedMapData);
    }
  };

  const handleExport = () => {
    if (onExport) {
      const updatedMapData = {
        ...mapData,
        annotations: markers.map(marker => ({
          id: marker.id,
          type: 'point' as const,
          coordinates: marker.position,
          properties: {
            text: marker.name,
            color: '#3388ff'
          }
        }))
      };
      onExport(updatedMapData);
    }
  };

  const streetLayer = mapData.layers.find(l => l.id === 'streets');
  const satelliteLayer = mapData.layers.find(l => l.id === 'satellite');

  return (
    <div className="flex h-screen w-full">
      {/* Map Area */}
      <div className="flex-1 relative">
        <MapContainer
          ref={mapRef}
          center={mapData.center}
          zoom={mapData.zoom}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          whenReady={() => {
            // Handle map ready
          }}
        >
          {streetLayer?.visible && (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              opacity={streetLayer.opacity}
            />
          )}
          {satelliteLayer?.visible && (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              opacity={satelliteLayer.opacity}
            />
          )}
          
          {markers.map(marker => (
            <Marker key={marker.id} position={marker.position}>
              <Popup>{marker.name}</Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map Controls */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            className="bg-white hover:bg-gray-50"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            className="bg-white hover:bg-gray-50"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomToExtent}
            className="bg-white hover:bg-gray-50"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>

        {/* Tools */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex gap-1 bg-white rounded-lg p-1 shadow-md">
            {tools.map(tool => (
              <Button
                key={tool.id}
                variant={selectedTool === tool.id ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolSelect(tool.id)}
                disabled={readOnly}
              >
                <tool.icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {!readOnly && (
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button onClick={handleExport} variant="outline" className="bg-white">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        )}
      </div>

      {/* Layers Panel */}
      <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
        <Card className="border-0 rounded-none">
          <CardHeader>
            <CardTitle>Map Layers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mapData.layers.map(layer => (
              <div key={layer.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`layer-${layer.id}`} className="text-sm font-medium">
                    {layer.name}
                  </Label>
                  <Checkbox
                    id={`layer-${layer.id}`}
                    checked={layer.visible}
                    onCheckedChange={(checked) => 
                      handleLayerToggle(layer.id, checked as boolean)
                    }
                  />
                </div>
                {layer.visible && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">
                      Opacity: {Math.round(layer.opacity * 100)}%
                    </Label>
                    <Slider
                      value={[layer.opacity * 100]}
                      onValueChange={([value]) => 
                        handleLayerOpacity(layer.id, value)
                      }
                      max={100}
                      step={10}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {markers.length > 0 && (
          <Card className="border-0 rounded-none border-t">
            <CardHeader>
              <CardTitle>Annotations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {markers.map(marker => (
                <div key={marker.id} className="p-2 bg-gray-50 rounded text-sm">
                  <div className="font-medium">{marker.name}</div>
                  <div className="text-gray-500 text-xs">
                    {marker.position[0].toFixed(4)}, {marker.position[1].toFixed(4)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}