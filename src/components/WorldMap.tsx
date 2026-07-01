import React, { useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Sphere,
  Graticule,
} from "react-simple-maps";
import { scaleLog } from "d3-scale";

// URL to world map topojson
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface WorldMapProps {
  data: { country: string; users: number }[];
}

export const WorldMap: React.FC<WorldMapProps> = ({ data }) => {
  const [tooltipContent, setTooltipContent] = useState("");

  // Create a map for quick lookup
  const userMap = useMemo(() => {
    if (!data) return {};
    return data.reduce((acc, curr) => {
      acc[curr.country] = curr.users;
      return acc;
    }, {} as Record<string, number>);
  }, [data]);

  // Find max users for scale
  const maxUsers = useMemo(() => {
    if (!data || data.length === 0) return 1;
    return Math.max(...data.map((d) => d.users), 1);
  }, [data]);

  // Use a log scale so that smaller numbers (like 700 vs 19,000) are still visible
  const colorScale = useMemo(() => {
    try {
      return scaleLog<string>()
        .domain([1, maxUsers]) // Log scale needs domain > 0
        .range(["#1a2234", "#FFFFFF"]);
    } catch (e) {
      console.error("D3 scale error:", e);
      return () => "#1a2234";
    }
  }, [maxUsers]);

  // GA4 country names to TopoJSON name mapping
  const countryMapping: Record<string, string> = {
    "United States": "United States of America",
    "United Kingdom": "United Kingdom",
    "United Arab Emirates": "United Arab Emirates",
  };

  if (!data) return null;

  return (
    <div className="relative w-full h-full min-h-[450px] flex flex-col items-center justify-center bg-black/20 rounded-2xl border border-white/5 p-4 group overflow-hidden">
      <div className="absolute top-4 right-4 z-20 pointer-events-none">
        {tooltipContent && (
          <div className="bg-[#111111] border border-white/10 p-2 rounded-lg shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-200">
            <p className="text-[10px] font-mono font-bold text-white uppercase tracking-widest">{tooltipContent}</p>
          </div>
        )}
      </div>

      <div className="w-full h-full flex items-center justify-center">
        <ComposableMap
          projectionConfig={{
            rotate: [-10, 0, 0],
            scale: 170, // Balanced scale for full-width view
          }}
          width={800}
          height={400} // Adjusted aspect ratio for full-width
          style={{ width: "100%", height: "auto", maxWidth: "100%" }}
        >
          <Sphere stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} id="sphere" fill="transparent" />
          <Graticule stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies ? geographies.map((geo) => {
                const countryName = geo.properties?.name || "Unknown";
                const altName = countryMapping[countryName] || countryName;
                const users = userMap[countryName] || userMap[altName] || 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    onMouseEnter={() => {
                      setTooltipContent(`${countryName}: ${users.toLocaleString()}`);
                    }}
                    onMouseLeave={() => {
                      setTooltipContent("");
                    }}
                    style={{
                      default: {
                        fill: users > 0 ? (colorScale as any)(Math.max(1, users)) : "#0b0f19",
                        stroke: "rgba(255,255,255,0.2)",
                        strokeWidth: 0.4,
                        outline: "none",
                        transition: "all 250ms",
                      },
                      hover: {
                        fill: "#FFFFFF",
                        stroke: "#FFFFFF",
                        strokeWidth: 1,
                        outline: "none",
                        cursor: "pointer",
                      },
                      pressed: {
                        fill: "#FFFFFF",
                        outline: "none",
                      },
                    }}
                  />
                );
              }) : null
            }
          </Geographies>
        </ComposableMap>
      </div>

      <div className="mt-2 mb-2 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#1a2234] border border-white/10" />
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tight">Lower Engagement</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-[#FFFFFF] shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-tight">Primary Nodes</span>
        </div>
      </div>
    </div>
  );
};
