import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from "react-leaflet";

function FixMapSize() {
    const map = useMap();

    useEffect(() => {
        const i = setTimeout(() => {
            map.invalidateSize();
        }, 200);

        return () => clearTimeout(i);
    }, [map]);

    return null;
}

function Map() {
    const center = [58.1467, 7.9956];
    const { BaseLayer } = LayersControl;

    return (
        <div style={{ height: "100%", width: "100%" }}>
            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
                <FixMapSize />

                <LayersControl position="topright">
                    <BaseLayer checked name="Road map">
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="&copy; OpenStreetMap contributors"
                        />
                    </BaseLayer>

                    <BaseLayer name="Satellite">
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution="Tiles &copy; Esri"
                        />
                    </BaseLayer>

                    <BaseLayer name="Terrain">
                        <TileLayer
                            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                            attribution="Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap"
                        />
                    </BaseLayer>
                </LayersControl>

                <Marker position={center}>
                    <Popup>Test</Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}

export default Map;
