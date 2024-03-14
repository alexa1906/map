import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";

mapboxgl.accessToken =
  "pk.eyJ1IjoibWFwbGFidGVjaCIsImEiOiJjajR0ejBnZ3QwYW03MzNvZXN3eWd1dmk0In0.DWJScSaVkpOqEobBYJZ0-Q";

export default function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [a, setA] = useState([
    {
      polygon: "",
      markers: [],
      lines: [],
    },
  ]);

  let counter = 1;

  useEffect(() => {
    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-71.8, 10.4],
        zoom: 9,
      });

      map.current.on("click", onMapClick);
    }
  });

  const generateUniqueID = () => {
    return counter++;
  };
  const markersAndLines = (newMarker, lng, lat) => {
    setA((prevA) => {
      let updatedA = [...prevA];

      // const lastObjectHasNoMarkers =
      //   updatedA.length > 0 &&
      //   updatedA[updatedA.length - 1].markers.length === 0;

      if (
        updatedA.length === 0 ||
        (updatedA[updatedA.length - 1].markers.length > 2 &&
          Math.abs(updatedA[updatedA.length - 1].markers[0].lng - lng) < 0.03 &&
          Math.abs(updatedA[updatedA.length - 1].markers[0].lat - lat) < 0.03)
      ) {
        console.log("new polygon");

        const lastLineId = generateUniqueID();
        const lastLine = {
          id: lastLineId,
          type: "LineString",
          coordinates: [
            [
              updatedA[updatedA.length - 1].markers[
                updatedA[updatedA.length - 1].markers.length - 1
              ].lng,
              updatedA[updatedA.length - 1].markers[
                updatedA[updatedA.length - 1].markers.length - 1
              ].lat,
            ],
            [
              updatedA[updatedA.length - 1].markers[0].lng,
              updatedA[updatedA.length - 1].markers[0].lat,
            ],
          ],
        };

        const lineLayer = {
          id: `line-${lastLineId}`,
          type: "line",
          source: {
            type: "geojson",
            data: lastLine,
          },
          paint: {
            "line-color": "#000",
            "line-width": 2,
          },
        };

        map.current.addLayer(lineLayer);
        // Push last line
        updatedA[updatedA.length - 1].lines.push(lastLine);

        const dynamicLineId = "dynamic-line";
        if (map.current.getLayer(dynamicLineId)) {
          map.current.removeLayer(dynamicLineId);
          map.current.removeSource(dynamicLineId);
        }

        updatedA.push({
          polygon: `polygon-${generateUniqueID()}`,
          markers: [],
          lines: [],
        });

        if (updatedA.length > 1) {
          const lastPolygon = updatedA[updatedA.length - 2];
          const polygonCoordinates = lastPolygon.markers.map((marker) => [
            marker.lng,
            marker.lat,
          ]);
          polygonCoordinates.push([lng, lat]);

          const polygonGeoJSON = {
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [polygonCoordinates],
            },
          };

          const polygonId = `polygon-${generateUniqueID()}`;
          const polygon = {
            id: polygonId,
            type: "fill",
            source: {
              type: "geojson",
              data: polygonGeoJSON,
            },
            paint: {
              "fill-color": "#088",
              "fill-opacity": 0.4,
            },
          };

          map.current.addLayer(polygon);
          lastPolygon.polygonId = polygonId; // Store the polygon ID in state
        }
        return updatedA;
      } else {
        const newMarkerInstance = new mapboxgl.Marker({ draggable: true })
          .setLngLat([lng, lat])
          .addTo(map.current);
        newMarker.instance = newMarkerInstance; // Storing the marker instancer

        newMarkerInstance.on("dragend", () => {
          const markerLngLat = newMarkerInstance.getLngLat();

          setA((prevA) => {
            const updatedPolygons = prevA.map((polygon) => {
              const updatedMarkers = polygon.markers.map((marker) => {
                if (marker.id === newMarker.id) {
                  // Update the coordinates of the dragged marker
                  return {
                    ...marker,
                    lng: markerLngLat.lng,
                    lat: markerLngLat.lat,
                  };
                }
                return marker;
              });

              // Update the lines associated with the polygon
              const updatedLines = polygon.lines.map((line) => {
                const lineCoordinates = line.coordinates.map((coordinate) => {
                  if (
                    coordinate[0] === newMarker.lng &&
                    coordinate[1] === newMarker.lat
                  ) {
                    return [markerLngLat.lng, markerLngLat.lat];
                  }
                  return coordinate;
                });

                return { ...line, coordinates: lineCoordinates };
              });

              return {
                ...polygon,
                markers: updatedMarkers,
                lines: updatedLines,
              };
            });

            // Update the state with the updated polygons
            return updatedPolygons;
          });
        });

        // Update the last polygon's markers and lines
        const lastPolygonIndex = updatedA.length - 1;
        const lastPolygon = updatedA[lastPolygonIndex];

        const updatedMarkers = [...lastPolygon.markers, newMarker];

        const lines = [...lastPolygon.lines];

        if (updatedMarkers.length > 1) {
          const previousMarker = updatedMarkers[updatedMarkers.length - 2];
          const newLineId = generateUniqueID();

          const newLine = {
            id: newLineId,
            type: "LineString",
            coordinates: [
              [previousMarker.lng, previousMarker.lat],
              [lng, lat],
            ],
          };

          lines.push(newLine);

          const lineLayer = {
            id: `line-${newLineId}`,
            type: "line",
            source: {
              type: "geojson",
              data: newLine,
            },
            paint: {
              "line-color": "#000",
              "line-width": 2,
            },
          };

          map.current.addLayer(lineLayer);
        }

        updatedA[lastPolygonIndex] = {
          ...lastPolygon,
          markers: updatedMarkers,
          lines,
        };
      }
      return updatedA;
    });
  };

  const updateDynamicLine = (newMarker, lng, lat) => {
    const dynamicLineId = "dynamic-line";

    // Remove previous dynamic line, if any
    if (map.current.getLayer(dynamicLineId)) {
      map.current.removeLayer(dynamicLineId);
      map.current.removeSource(dynamicLineId);
    }

    map.current.addLayer({
      id: dynamicLineId,
      type: "line",
      source: {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [lng, lat],
          },
        },
      },
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#000",
        "line-width": 2,
      },
    });

    const onMouseMove = (e) => {
      const { lng, lat } = e.lngLat;

      if (map.current.getSource(dynamicLineId)) {
        map.current.getSource(dynamicLineId).setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              [newMarker.lng, newMarker.lat],
              [lng, lat],
            ],
          },
        });
      }
    };

    map.current.on("mousemove", onMouseMove);
  };

  const deleteLastLine = () => {
    setA((prevA) => {
      const updatedA = [...prevA];
      if (updatedA.length > 0) {
        const lastPolygon = updatedA[updatedA.length - 2];

        if (lastPolygon.lines.length > 0) {
          const lastLineId = lastPolygon.lines[lastPolygon.lines.length - 1].id;

          map.current.removeLayer(`line-${lastLineId}`);
          map.current.removeSource(`line-${lastLineId}`);
          lastPolygon.lines.pop();

          if (lastPolygon.markers.length - 1 > lastPolygon.lines.length) {
            const lastMarker = lastPolygon.markers.pop();
            lastMarker.instance.remove();
          }

          const lastMarkerOfPolygon =
            lastPolygon.markers[lastPolygon.markers.length - 1];

          const dynamicLineId = "dynamic-line";
          if (map.current.getSource(dynamicLineId)) {
            map.current.removeLayer(dynamicLineId);
            map.current.removeSource(dynamicLineId);
          }

          updateDynamicLine(
            lastMarkerOfPolygon,
            lastMarkerOfPolygon.lng,
            lastMarkerOfPolygon.lat
          );

          // Remove the polygon layer and its source
          map.current.removeLayer(lastPolygon.polygonId);
          // map.current.removeSource(lastPolygon.polygonId);
        }
      }
      return updatedA;
    });
  };

  const onMapClick = (e) => {
    const { lng, lat } = e.lngLat;
    const newMarker = { id: generateUniqueID(), lng, lat };

    markersAndLines(newMarker, lng, lat);
    updateDynamicLine(newMarker, lng, lat);
  };

  console.log(a);

  return (
    <div>
      <div ref={mapContainer} style={{ width: "100%", height: "800px" }} />
      <button onClick={deleteLastLine}>Delete</button>
    </div>
  );
}
