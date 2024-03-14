import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl"; // Import mapbox-gl without the loader syntax

mapboxgl.accessToken =
  "pk.eyJ1IjoibWFwbGFidGVjaCIsImEiOiJjajR0ejBnZ3QwYW03MzNvZXN3eWd1dmk0In0.DWJScSaVkpOqEobBYJZ0-Q";

export default function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [markers, setMarkers] = useState([]);
  const markerRefs = useRef([]);
  const [polygons, setPolygons] = useState([]);
  const [currentId, setCurrentId] = useState(0);
  const [sources, setSources] = useState([]);

  const test = () => {
    const id = polygons.length;

    map.current.addSource(`lines-${id}`, {
      type: "geojson",
      data: {
        type: "Feature",
        features: [],
      },
    });

    map.current.addLayer({
      id: `lines-${id}`,
      type: "line",
      source: `lines-${id}`,
      paint: {
        "line-color": "red",
        "line-width": 2,
      },
    });

    setSources((prev) => [...prev, `lines-${id}`]);
    return `lines-${id}`;
  };

  useEffect(() => {
    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-71.8, 10.4],
        zoom: 9,
      });
    }

    const handleClick = (e) => {
      const { lng, lat } = e.lngLat;
      const newMarker = { id: currentId, lng, lat };
      setCurrentId((prevId) => prevId + 1);
      const newMarkers = [...markers, newMarker];

      if (newMarkers.length === 1) {
        test();
      }

      if (newMarkers.length > 1) {
        const coordinates = newMarkers.map((marker) => [
          marker.lng,
          marker.lat,
        ]);
        const lineFeature = {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: coordinates,
          },
        };
        map.current.getSource(`lines-${polygons.length}`).setData(lineFeature);
      }

      if (
        newMarkers.length > 2 &&
        Math.abs(newMarkers[0].lng - lng) < 0.03 &&
        Math.abs(newMarkers[0].lat - lat) < 0.03
      ) {
        const coordinates = newMarkers.map((marker) => [
          marker.lng,
          marker.lat,
        ]);
        coordinates.push(coordinates[0]);
        const polygonFeature = {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [coordinates],
          },
        };
        map.current
          .getSource(`lines-${polygons.length}`)
          .setData(polygonFeature);

        map.current.addLayer({
          id: `fill-${polygons.length}`,
          type: "fill",
          source: `lines-${polygons.length}`,
          layout: {},
          paint: {
            "fill-color": "#FF0000",
            "fill-opacity": 0.5,
          },
        });

        setPolygons((prevPolygons) => [
          ...prevPolygons,
          { coordinates: markers },
        ]);

        setMarkers([]);

        return;
      } else {
        const marker = new mapboxgl.Marker({ draggable: true })
          .setLngLat([lng, lat])
          .addTo(map.current);

        markerRefs.current.push(marker);

        marker.on("dragend", () => {
          const markerLngLat = marker.getLngLat();

          setPolygons((prevPolygons) => {
            const updatedPolygons = prevPolygons.map((polygon) => {
              // Check if the dragged marker is part of this polygon
              const markerIndex = polygon.coordinates.findIndex(
                (coord) => coord.id === newMarker.id
              );

              if (markerIndex !== -1) {
                // If the marker is found, update its coordinates
                const updatedCoordinates = [...polygon.coordinates];
                updatedCoordinates[markerIndex] = {
                  id: newMarker.id,
                  lng: markerLngLat.lng,
                  lat: markerLngLat.lat,
                };

                // Update the polygon's coordinates
                return { ...polygon, coordinates: updatedCoordinates };
              }

              return polygon;
            });

            updatedPolygons.forEach((polygon, index) => {
              const coordinates = polygon.coordinates.map((coord) => [
                coord.lng,
                coord.lat,
              ]);

              coordinates.push(coordinates[0]);
              const polygonFeature = {
                type: "Feature",
                geometry: {
                  type: "Polygon",
                  coordinates: [coordinates],
                },
              };
              map.current.getSource(`lines-${index}`).setData(polygonFeature);
            });

            return updatedPolygons;
          });
        });

        // marker.on("dragend", () => {
        //   const markerLngLat = marker.getLngLat();

        //   if (markers.length > 0) {
        //     setMarkers((prevMarkers) => {
        //       const updatedMarkers = prevMarkers.map((m) =>
        //         m.id === newMarker.id
        //           ? { ...m, lng: markerLngLat.lng, lat: markerLngLat.lat }
        //           : m
        //       );

        //       const coordinates = updatedMarkers.map((marker) => [
        //         marker.lng,
        //         marker.lat,
        //       ]);
        //       const lineFeature = {
        //         type: "Feature",
        //         geometry: {
        //           type: "LineString",
        //           coordinates: coordinates,
        //         },
        //       };

        //       // Update the lines for the appropriate polygon
        //       map.current
        //         .getSource(`lines-${polygons.length}`)
        //         .setData(lineFeature);

        //       return updatedMarkers;
        //     });
        //   } else {
        //     setPolygons((prevPolygons) => {
        //       const updatedPolygons = prevPolygons.map((polygon) => {
        //         // Check if the dragged marker is part of this polygon
        //         const markerIndex = polygon.coordinates.findIndex(
        //           (coord) => coord.id === newMarker.id
        //         );

        //         if (markerIndex !== -1) {
        //           // If the marker is found, update its coordinates
        //           const updatedCoordinates = [...polygon.coordinates];
        //           updatedCoordinates[markerIndex] = {
        //             id: newMarker.id,
        //             lng: markerLngLat.lng,
        //             lat: markerLngLat.lat,
        //           };

        //           // Update the polygon's coordinates
        //           return { ...polygon, coordinates: updatedCoordinates };
        //         }

        //         return polygon;
        //       });

        //       updatedPolygons.forEach((polygon, index) => {
        //         const coordinates = polygon.coordinates.map((coord) => [
        //           coord.lng,
        //           coord.lat,
        //         ]);

        //         coordinates.push(coordinates[0]);
        //         const polygonFeature = {
        //           type: "Feature",
        //           geometry: {
        //             type: "Polygon",
        //             coordinates: [coordinates],
        //           },
        //         };
        //         map.current.getSource(`lines-${index}`).setData(polygonFeature);
        //       });

        //       return updatedPolygons;
        //     });
        //   }
        // });
      }
      setMarkers(newMarkers);
    };

    map.current.on("click", handleClick);

    return () => {
      map.current.off("click", handleClick);
    };
  }, [markers, currentId]);

  const handleDeleteLastMarker = () => {
    if (markers.length > 0) {
      setMarkers((prevMarkers) => {
        const updatedMarkers = [...prevMarkers];

        if (updatedMarkers.length > 1) {
          updatedMarkers.pop();

          const markerToRemove = markerRefs.current.pop();
          if (markerToRemove) {
            markerToRemove.remove();
          }

          const coordinates = updatedMarkers.map((marker) => [
            marker.lng,
            marker.lat,
          ]);
          const lineFeature = {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: coordinates,
            },
          };
          map.current
            .getSource(`lines-${polygons.length}`)
            .setData(lineFeature);
        } else {
          alert("Finsh the polygon");
        }

        return updatedMarkers;
      });
    } else {
      setPolygons((prevPolygons) => {
        const updatedPolygons = [...prevPolygons];
        const lastPolygon = updatedPolygons[updatedPolygons.length - 1];
        if (lastPolygon.coordinates.length > 3) {
          lastPolygon.coordinates.pop();
          markerRefs.current.pop().remove();

          const coordinates = lastPolygon.coordinates.map((coord) => [
            coord.lng,
            coord.lat,
          ]);
          coordinates.push(coordinates[0]);

          const polygonFeature = {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [coordinates],
            },
          };
          map.current
            .getSource(`lines-${updatedPolygons.length - 1}`)
            .setData(polygonFeature);
        } else {
          alert("You need minimum 3 markers for a polygon");
        }
        return updatedPolygons;
      });
    }
  };

  // console.log(polygons);
  console.log(markers);

  return (
    <div>
      <div ref={mapContainer} style={{ width: "100%", height: "800px" }} />
      <button onClick={handleDeleteLastMarker}>Delete Last Marker</button>
    </div>
  );
}

