import React from "react";
import { createRoot } from "react-dom/client";
import "mapbox-gl/dist/mapbox-gl.css";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")).render(<App />);
