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

  const deleteDinamicLine = () => {
    const dynamicLineId = "dynamic-line";
    if (map.current.getLayer(dynamicLineId)) {
      map.current.removeLayer(dynamicLineId);
      map.current.removeSource(dynamicLineId);
    }
  };

  const reunitePolygon = (updatedA) => {
    console.log("reunite the polygon");

    const lastPolygonIndex = updatedA.length - 2;
    const lastPolygon = updatedA[lastPolygonIndex];

    const updatedMarkers = lastPolygon.markers;
    const lines = [...lastPolygon.lines];

    if (updatedMarkers.length >= 3) {
      // Check if there are enough markers to create a polygon
      const polygonCoordinates = updatedMarkers.map((marker) => [
        marker.lng,
        marker.lat,
      ]);

      // Add the last line
      const lastMarker = updatedMarkers[updatedMarkers.length - 1];
      const firstMarker = updatedMarkers[0];
      const lastLineId = generateUniqueID();
      const lastLine = {
        id: lastLineId,
        type: "LineString",
        coordinates: [
          [lastMarker.lng, lastMarker.lat],
          [firstMarker.lng, firstMarker.lat],
        ],
      };

      lines.push(lastLine);

      const lastLineLayer = {
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
      map.current.addLayer(lastLineLayer);

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
      lastPolygon.polygonId = polygonId;
    }

    updatedA[lastPolygonIndex] = {
      ...lastPolygon,
      markers: updatedMarkers,
      lines,
    };

    deleteDinamicLine();
  };

  const makeNewPolygon = (lng, lat, updatedA) => {
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

    deleteDinamicLine();

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
  };

  const draggableMarker = (lng, lat, newMarker) => {
    const newMarkerInstance = new mapboxgl.Marker({ draggable: true })
      .setLngLat([lng, lat])
      .addTo(map.current);
    newMarker.instance = newMarkerInstance;

    newMarkerInstance.on("dragend", () => {
      const markerLngLat = newMarkerInstance.getLngLat();

      setA((prevA) => {
        const updatedPolygons = prevA.map((polygon) => {
          const updatedMarkers = polygon.markers.map((marker) => {
            if (marker.id === newMarker.id) {
              return {
                ...marker,
                lng: markerLngLat.lng,
                lat: markerLngLat.lat,
              };
            }
            return marker;
          });

          const updatedLines = polygon.lines.map((line) => {
            const lineCoordinates = line.coordinates.map((coordinate) => {
              // Find the index of the marker associated with this coordinate in the line
              const markerIndex = polygon.markers.findIndex(
                (marker) =>
                  marker.lng === coordinate[0] && marker.lat === coordinate[1]
              );

              if (markerIndex !== -1) {
                return [
                  polygon.markers[markerIndex].instance.getLngLat().lng,
                  polygon.markers[markerIndex].instance.getLngLat().lat,
                ];
              }

              return coordinate;
            });

            // Update the source data for each line layer
            map.current.getSource(`line-${line.id}`).setData({
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: lineCoordinates,
              },
            });

            return { ...line, coordinates: lineCoordinates };
          });

          const polygonCoordinates = updatedMarkers.map((marker) => [
            marker.lng,
            marker.lat,
          ]);

          if (polygon.polygonId) {
            map.current.getSource(polygon.polygonId).setData({
              type: "Feature",
              properties: {},
              geometry: {
                type: "Polygon",
                coordinates: [polygonCoordinates],
              },
            });
          }

          return {
            ...polygon,
            markers: updatedMarkers,
            lines: updatedLines,
          };
        });

        return updatedPolygons;
      });
    });
  };

  const makeChangesForPolygon = (
    lng,
    lat,
    updatedA,
    lastPolygonIndex,
    newMarker
  ) => {
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
  };

  const markerInWhichPolygon = (lng, lat, updatedA, newMarker) => {
    if (
      updatedA.length > 1 &&
      updatedA[updatedA.length - 1].markers.length === 0 &&
      (updatedA[updatedA.length - 2].markers.length === 1 ||
        !(
          updatedA[updatedA.length - 2].lines[0].coordinates[0][0] ===
          updatedA[updatedA.length - 2].lines[
            updatedA[updatedA.length - 2].lines.length - 1
          ].coordinates[1][0]
        ))
    ) {
      const lastPolygonIndex = updatedA.length - 2;
      makeChangesForPolygon(lng, lat, updatedA, lastPolygonIndex, newMarker);
    } else {
      const lastPolygonIndex = updatedA.length - 1;
      makeChangesForPolygon(lng, lat, updatedA, lastPolygonIndex, newMarker);
    }
  };

  const markersAndLines = (newMarker, lng, lat) => {
    setA((prevA) => {
      let updatedA = [...prevA];

      const isNearFirstMarker =
        updatedA.length > 1 &&
        updatedA[updatedA.length - 1].markers.length === 0 &&
        Math.abs(updatedA[updatedA.length - 2].markers[0].lng - lng) < 0.03 &&
        Math.abs(updatedA[updatedA.length - 2].markers[0].lat - lat) < 0.03;

      if (isNearFirstMarker) {
        reunitePolygon(updatedA);
      } else if (
        updatedA.length === 0 ||
        (updatedA[updatedA.length - 1].markers.length > 2 &&
          Math.abs(updatedA[updatedA.length - 1].markers[0].lng - lng) < 0.03 &&
          Math.abs(updatedA[updatedA.length - 1].markers[0].lat - lat) < 0.03)
      ) {
        console.log("new polygon");

        makeNewPolygon(lng, lat, updatedA);

        return updatedA;
      } else {
        draggableMarker(lng, lat, newMarker);
        // sa stie in ce polygon sa puna urmatorul marker
        markerInWhichPolygon(lng, lat, updatedA, newMarker);
      }
      return updatedA;
    });
  };

  const updateDynamicLine = (newMarker, lng, lat) => {
    const dynamicLineId = "dynamic-line";
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

  const makeDelete = (lastPolygon, updatedA) => {
    if (lastPolygon.lines.length > 0) {
      // Check if there are more than 2 lines
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

      deleteDinamicLine();

      updateDynamicLine(
        lastMarkerOfPolygon,
        lastMarkerOfPolygon.lng,
        lastMarkerOfPolygon.lat
      );

      map.current.removeLayer(lastPolygon.polygonId);
    } else {
      console.log("delete polygon");
      updatedA.splice(updatedA.length - 1, 1);

      if (lastPolygon.markers.length === 1) {
        const lastMarker = lastPolygon.markers.pop();
        lastMarker.instance.remove();
      }

      deleteDinamicLine();
    }
  };

  const deleteLastLine = () => {
    setA((prevA) => {
      const updatedA = [...prevA];
      if (updatedA.length > 0) {
        const ultimul = updatedA[updatedA.length - 1];

        if (ultimul.markers.length === 0) {
          const lastPolygon = updatedA[updatedA.length - 2];

          makeDelete(lastPolygon, updatedA);
        } else {
          const lastPolygon = updatedA[updatedA.length - 1];

          makeDelete(lastPolygon, updatedA);
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
