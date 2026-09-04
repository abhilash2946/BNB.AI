import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChartDataPoint, ScatterPoint, FunnelStage } from '../../types';

// Helper to format currency or numbers nicely
const formatVal = (v: number | string) => {
  if (typeof v === 'string') return v;
  if (v >= 1000) {
    return v.toLocaleString('en-IN');
  }
  return v.toString();
};

// ==========================================
// 1. 3D ISOMETRIC BAR CHART
// ==========================================
interface ThreeDBarChartProps {
  data: ChartDataPoint[];
  height?: number;
  onUpdateValue?: (index: number, newValue: number) => void;
}

export const ThreeDBarChart: React.FC<ThreeDBarChartProps> = ({ data, height = 240, onUpdateValue }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const TOP_SAFE_ZONE = 60;
  const BOTTOM_ZONE = 40;
  const chartHeight = height - TOP_SAFE_ZONE - BOTTOM_ZONE;
  const svgHeight = height;
  const baseY = height - BOTTOM_ZONE;

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // Position tooltip nicely relative to the cursor
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 50,
    });
    setHoveredIdx(index);
  };

  const handleMouseLeave = () => {
    setHoveredIdx(null);
  };

  const startEdit = (idx: number, currentVal: number) => {
    if (!onUpdateValue) return;
    setIsEditing(idx);
    setEditVal(currentVal.toString());
  };

  const saveEdit = (idx: number) => {
    const num = parseFloat(editVal);
    if (!isNaN(num) && num >= 0 && onUpdateValue) {
      onUpdateValue(idx, num);
    }
    setIsEditing(null);
  };

  return (
    <div id="isometric-bar-chart" className="relative w-full border border-slate-100 rounded-xl bg-slate-50/50 p-2" ref={containerRef}>
      <div
        className="flex h-full items-end justify-around pb-2 px-1 overflow-visible"
        style={{ height: `${height}px` }}
      >
        {data.map((d, i) => {
          const barHeight = (d.value / maxVal) * chartHeight;
          const active = hoveredIdx === i;
          const color = d.color || '#2563eb';

          // 3D Isometric Bar SVG Drawing Constants
          // Dynamically adjust bar width based on data length to prevent overlap
          const barWidth = data.length > 6 ? 28 : 36;
          // Depth/projection values
          const dx = data.length > 6 ? 8 : 12;
          const dy = data.length > 6 ? 6 : 8;

          // Render coordinate arrays for SVG
          const topY = baseY - Math.max(barHeight, 8); // guarantee at least a small chunk even if 0

          return (
            <div
              key={i}
              className="flex flex-col items-center group relative cursor-pointer"
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={handleMouseLeave}
              onClick={() => startEdit(i, d.value)}
            >
              {/* High-quality 3D Column drawn in SVG */}
              <svg width={barWidth + dx + 4} height={svgHeight} className="overflow-visible select-none">
                <g>
                  {/* shadow under the bar */}
                  <ellipse
                    cx={barWidth / 2 + dx / 2}
                    cy={baseY}
                    rx={barWidth / 2 + 5}
                    ry={6}
                    fill="rgba(15, 23, 42, 0.08)"
                  />

                  {/* FRONT WALL OF THE 3D PRISM */}
                  <path
                    d={`M 5,${baseY} 
                       L 5,${topY} 
                       L ${5 + barWidth},${topY} 
                       L ${5 + barWidth},${baseY} Z`}
                    fill={color}
                    opacity={active ? 0.95 : 0.85}
                    className="transition-all duration-300"
                  />

                  {/* RIGHT WALL OF THE 3D PRISM (darker shade for 3D depth) */}
                  <path
                    d={`M ${5 + barWidth},${baseY} 
                       L ${5 + barWidth},${topY} 
                       L ${5 + barWidth + dx},${topY - dy} 
                       L ${5 + barWidth + dx},${baseY - dy} Z`}
                    fill={color}
                    filter="brightness(0.75)"
                    opacity={active ? 0.95 : 0.85}
                    className="transition-all duration-300"
                  />

                  {/* TOP CAP OF THE 3D PRISM (lighter shade for overhead light reflection) */}
                  <path
                    d={`M 5,${topY} 
                       L ${5 + dx},${topY - dy} 
                       L ${5 + barWidth + dx},${topY - dy} 
                       L ${5 + barWidth},${topY} Z`}
                    fill={color}
                    filter="brightness(1.15)"
                    opacity={active ? 0.98 : 0.9}
                    className="transition-all duration-300"
                  />

                  {/* Glowing core structure if hovered */}
                  {active && (
                    <g opacity="0.3">
                      <path
                        d={`M 5,${baseY} L 5,${topY} L ${5 + barWidth},${topY} L ${5 + barWidth},${baseY} Z`}
                        fill="#ffffff"
                      />
                    </g>
                  )}
                </g>
              </svg>

              {/* Label */}
              <div className="mt-2 text-center">
                <span className={`text-[11px] font-mono tracking-wide ${active ? 'text-blue-600 font-semibold' : 'text-slate-500'}`}>
                  {d.label}
                </span>
                <span className="block text-xs font-bold text-slate-800 mt-0.5">
                  {formatVal(d.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inline editor interface */}
      <AnimatePresence>
        {isEditing !== null && onUpdateValue && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-lg p-3 flex items-center gap-2 z-30"
          >
            <span className="text-xs text-slate-600 font-medium">Edit "{data[isEditing].label}":</span>
            <input
              type="number"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              className="w-20 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(isEditing);
                if (e.key === 'Escape') setIsEditing(null);
              }}
            />
            <button
              onClick={() => saveEdit(isEditing)}
              className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded hover:bg-blue-700 font-semibold"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditing(null)}
              className="text-slate-400 hover:text-slate-600 text-xs px-1"
            >
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HTML tooltip displaying hovered bar information */}
      <AnimatePresence>
        {hoveredIdx !== null && isEditing === null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute bg-slate-900/95 text-white text-xs py-2 px-3 rounded-lg shadow-xl border border-slate-700 pointer-events-none z-50 flex flex-col gap-0.5"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="font-semibold tracking-wide text-blue-300 text-[10px] uppercase">
              {data[hoveredIdx].label}
            </div>
            <div className="text-sm font-bold flex items-baseline gap-1.5">
              <span>{formatVal(data[hoveredIdx].value)}</span>
              <span className="text-[10px] text-slate-400">
                ({((data[hoveredIdx].value / maxVal) * 100).toFixed(1)}% of Peak)
              </span>
            </div>
            <div className="text-[9px] text-slate-400 italic">Click column to edit value</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ==========================================
// 2. 3D CYLINDER DONUT CHART
// ==========================================
interface ThreeDDonutChartProps {
  data: ChartDataPoint[];
  radius?: number;
  thickness?: number;
  height?: number;
  onUpdateValue?: (index: number, newValue: number) => void;
}

export const ThreeDDonutChart: React.FC<ThreeDDonutChartProps> = ({
  data,
  radius = 90,
  thickness = 28,
  height = 200,
  onUpdateValue
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const total = data.reduce((acc, current) => acc + current.value, 0);

  // Generate 2D sector coordinate values but draw them using a tilted isometric angle projection (compress Y scale!)
  const center = { x: 160, y: 120 };
  const rx = radius; // X radius
  const ry = radius * 0.6; // Y radius (tilted 3D perspective!)
  const extHeight = 18; // Side wall vertical extrusion in pixels

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 50,
    });
    setHoveredIdx(index);
  };

  // Convert angles to SVG coordinates on a tilted ellipse
  const getEllipsePoint = (cx: number, cy: number, r_x: number, r_y: number, angleDegrees: number) => {
    const angleRad = (angleDegrees - 90) * Math.PI / 180;
    return {
      x: cx + r_x * Math.cos(angleRad),
      y: cy + r_y * Math.sin(angleRad)
    };
  };

  let cumulativeAngle = 0;

  // Pre-calculate sectors, angles and coordinates
  const sectors = data.map((d, index) => {
    const share = d.value / (total || 1);
    const angleSpan = share * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angleSpan;
    cumulativeAngle = endAngle;

    const outerStart = getEllipsePoint(center.x, center.y, rx, ry, startAngle);
    const outerEnd = getEllipsePoint(center.x, center.y, rx, ry, endAngle);

    const innerRx = rx - thickness;
    const innerRy = ry - (thickness * 0.6);
    const innerStart = getEllipsePoint(center.x, center.y, innerRx, innerRy, startAngle);
    const innerEnd = getEllipsePoint(center.x, center.y, innerRx, innerRy, endAngle);

    return {
      index,
      data: d,
      share,
      startAngle,
      endAngle,
      angleSpan,
      outerStart,
      outerEnd,
      innerStart,
      innerEnd,
      innerRx,
      innerRy,
      color: d.color || '#3b82f6'
    };
  });

  const startEdit = (idx: number, currentVal: number) => {
    if (!onUpdateValue) return;
    setIsEditing(idx);
    setEditVal(currentVal.toString());
  };

  const saveEdit = (idx: number) => {
    const num = parseFloat(editVal);
    if (!isNaN(num) && num >= 0 && onUpdateValue) {
      onUpdateValue(idx, num);
    }
    setIsEditing(null);
  };

  return (
    <div id="isometric-donut-chart" className="relative w-full border border-slate-100 rounded-xl bg-slate-50/50 p-4" ref={containerRef}>
      <div className="flex flex-col md:flex-row items-center justify-around gap-6" style={{ minHeight: `${height}px` }}>
        
        {/* SVG Drawing of tilted 3D Cylinder Slices */}
        <div className="relative w-[320px] h-[240px]">
          <svg width="100%" height="100%" viewBox="0 0 320 240" className="overflow-visible select-none">
            <g>
              {/* Overall flat reflection shadow underneath */}
              <ellipse
                cx={center.x}
                cy={center.y + extHeight + 5}
                rx={rx + 8}
                ry={ry + 4}
                fill="rgba(15, 23, 42, 0.08)"
                filter="blur(2px)"
              />

              {sectors.map((sec) => {
                const active = hoveredIdx === sec.index;
                const strokeColor = active ? '#ffffff' : 'none';
                const strokeWidth = active ? 1.5 : 0;
                
                // Construct top cap path of the slice
                // Draw arc from outerStart to outerEnd, line to innerEnd, arc back to innerStart, close
                const largeArcFlag = sec.angleSpan > 180 ? 1 : 0;
                
                // Top Layer path
                const topPathStr = `
                  M ${sec.outerStart.x} ${sec.outerStart.y}
                  A ${rx} ${ry} 0 ${largeArcFlag} 1 ${sec.outerEnd.x} ${sec.outerEnd.y}
                  L ${sec.innerEnd.x} ${sec.innerEnd.y}
                  A ${sec.innerRx} ${sec.innerRy} 0 ${largeArcFlag} 0 ${sec.innerStart.x} ${sec.innerStart.y}
                  Z
                `;

                // Outer wall (cylinder side) extrusion path: only visible for slices facing southern hemisphere (0 to 180 deg)
                // Draw from outerStart downward to outerStart+extHeight, then arc to outerEnd+extHeight, up to outerEnd, and close
                const sidePathStr = `
                  M ${sec.outerStart.x} ${sec.outerStart.y}
                  L ${sec.outerStart.x} ${sec.outerStart.y + extHeight}
                  A ${rx} ${ry} 0 ${largeArcFlag} 1 ${sec.outerEnd.x} ${sec.outerEnd.y + extHeight}
                  L ${sec.outerEnd.x} ${sec.outerEnd.y}
                  A ${rx} ${ry} 0 ${largeArcFlag} 0 ${sec.outerStart.x} ${sec.outerStart.y}
                  Z
                `;

                // Inner wall extrusion path: visible for northern hemisphere sections looking into the hole
                const innerSidePathStr = `
                  M ${sec.innerStart.x} ${sec.innerStart.y}
                  L ${sec.innerStart.x} ${sec.innerStart.y + extHeight}
                  A ${sec.innerRx} ${sec.innerRy} 0 ${largeArcFlag} 1 ${sec.innerEnd.x} ${sec.innerEnd.y + extHeight}
                  L ${sec.innerEnd.x} ${sec.innerEnd.y}
                  A ${sec.innerRx} ${sec.innerRy} 0 ${largeArcFlag} 0 ${sec.innerStart.x} ${sec.innerStart.y}
                  Z
                `;

                return (
                  <g
                    key={sec.index}
                    className="cursor-pointer group"
                    onMouseMove={(e) => handleMouseMove(e, sec.index)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => startEdit(sec.index, sec.data.value)}
                  >
                    {/* Render visual extrusion shadow/depth walls BEFORE the top cap to stack properly */}
                    {/* Side/Front wall */}
                    <path
                      d={sidePathStr}
                      fill={sec.color}
                      filter="brightness(0.72)"
                      opacity={active ? 0.95 : 0.82}
                      className="transition-all duration-200"
                    />

                    {/* Inner wall */}
                    <path
                      d={innerSidePathStr}
                      fill={sec.color}
                      filter="brightness(0.62)"
                      opacity={0.7}
                      className="transition-all duration-200"
                    />

                    {/* Top flat cap of the slice */}
                    <path
                      d={topPathStr}
                      fill={sec.color}
                      filter={active ? 'brightness(1.1)' : 'brightness(0.98)'}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      opacity={0.95}
                      className="transition-all duration-200"
                    />
                  </g>
                );
              })}

              {/* Central Interactive details element in center of Donut */}
              <circle
                cx={center.x}
                cy={center.y + 4}
                r={rx * 0.3}
                fill="white"
                className="shadow-sm"
                opacity="0.15"
              />
              <g pointerEvents="none">
                <text
                  x={center.x}
                  y={center.y + 3}
                  textAnchor="middle"
                  className="font-bold text-sm tracking-wide"
                  fill="#1e293b"
                >
                  {hoveredIdx !== null ? data[hoveredIdx].label : 'Leads'}
                </text>
                <text
                  x={center.x}
                  y={center.y + 17}
                  textAnchor="middle"
                  className="font-bold text-xs"
                  fill="#64748b"
                >
                  {hoveredIdx !== null
                    ? `${formatVal(data[hoveredIdx].value)} (${(data[hoveredIdx].value / total * 100).toFixed(0)}%)`
                    : `Total: ${formatVal(total)}`
                  }
                </text>
              </g>
            </g>
          </svg>
        </div>

        {/* Legend Panel next to chart */}
        <div className="flex flex-col gap-2 min-w-[120px] bg-white border border-slate-100 rounded-lg p-3 shadow-sm">
          <span className="text-[10px] font-semibold text-slate-400 tracking-wider">CHANNELS</span>
          {data.map((d, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-2 cursor-pointer p-1 rounded transition-colors ${hoveredIdx === idx ? 'bg-slate-50 font-bold' : 'hover:bg-slate-50'}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => startEdit(idx, d.value)}
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <div className="flex flex-col">
                <span className="text-xs text-slate-700 leading-tight">{d.label}</span>
                <span className="text-[10px] text-slate-500">{formatVal(d.value)} leads ({((d.value / (total || 1)) * 100).toFixed(0)}%)</span>
              </div>
            </div>
          ))}
          <div className="text-[9px] text-slate-400 italic text-center mt-1 border-t border-slate-100 pt-1.5">Click items or donut to edit</div>
        </div>
      </div>

      {/* Editor Modal Popover */}
      <AnimatePresence>
        {isEditing !== null && onUpdateValue && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-slate-200 shadow-xl rounded-lg p-3 flex items-center gap-2 z-30"
          >
            <span className="text-xs text-slate-600 font-semibold">Edit "{data[isEditing].label}":</span>
            <input
              type="number"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              className="w-18 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(isEditing);
                if (e.key === 'Escape') setIsEditing(null);
              }}
            />
            <button
              onClick={() => saveEdit(isEditing)}
              className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded hover:bg-blue-700 font-bold"
            >
              Save
            </button>
            <button onClick={() => setIsEditing(null)} className="text-slate-400 hover:text-slate-600 text-xs px-1">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hover Floating Tooltip */}
      <AnimatePresence>
        {hoveredIdx !== null && isEditing === null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute bg-slate-900/95 text-white text-xs py-2 px-3 rounded-lg shadow-xl border border-slate-700 pointer-events-none z-50 flex flex-col gap-0.5"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="font-semibold text-blue-300 text-[10px] uppercase">{data[hoveredIdx].label}</div>
            <div className="text-sm font-bold flex items-baseline gap-1">
              <span>{formatVal(data[hoveredIdx].value)}</span>
              <span className="text-[10px] text-slate-400">({((data[hoveredIdx].value / (total || 1)) * 100).toFixed(1)}%)</span>
            </div>
            <div className="text-[9px] text-slate-400 italic">Click slice or item to edit</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ==========================================
// 3. 3D GLOWING METALLIC GAUGE
// ==========================================
interface ThreeDGaugeProps {
  score: number;
  label: string;
  color?: string;
  size?: number;
  onUpdateScore?: (newScore: number) => void;
}

export const ThreeDGauge: React.FC<ThreeDGaugeProps> = ({
  score,
  label,
  color = '#10b981',
  size = 130,
  onUpdateScore
}) => {
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  // Semicircle arc logic
  const r = size * 0.42;
  const strokeWidth = size * 0.1;
  const center = size / 2;
  const circ = Math.PI * r; // Semicircle length
  const strokeDashoffset = circ - (Math.min(score, 100) / 100) * circ;

  const startEdit = () => {
    if (!onUpdateScore) return;
    setIsEditing(true);
    setEditVal(score.toString());
  };

  const handleSave = () => {
    const num = Math.min(Math.max(parseInt(editVal) || 0, 0), 100);
    if (onUpdateScore) onUpdateScore(num);
    setIsEditing(false);
  };

  return (
    <div
      className="flex flex-col items-center p-3 border border-slate-100 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-300 relative cursor-pointer group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={startEdit}
    >
      <div className="relative" style={{ width: size, height: size * 0.65 }}>
        <svg width={size} height={size} className="transform -rotate-180 overflow-visible">
          {/* Outer Ring Shadow Glow */}
          <circle
            cx={center}
            cy={center}
            r={r + 3}
            fill="none"
            stroke="rgba(15, 23, 42, 0.03)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circ} ${circ}`}
            strokeLinecap="round"
          />

          {/* Background Arc */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circ} ${circ}`}
            strokeLinecap="round"
          />

          {/* Active Progress Arc */}
          <motion.circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circ} ${circ}`}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset }}
            strokeLinecap="round"
            transition={{ type: 'spring', stiffness: 60 }}
          />

          {/* 3D Dial Pointer Center Knob (Metallic representation) */}
          <circle
            cx={center}
            cy={center}
            r={10}
            fill="#334155"
            className="shadow-md"
          />
          <circle
            cx={center}
            cy={center}
            r={5}
            fill="#e2e8f0"
          />

          {/* 3D pointer pin */}
          {/* Angle represents rotation from -90 degrees (starts straight left) to +90 degrees (ends straight right) */}
          {(() => {
            const angle = (score / 100) * 180 - 180;
            return (
              <line
                x1={center}
                y1={center}
                x2={center + (r - 4) * Math.cos((angle * Math.PI) / 180)}
                y2={center + (r - 4) * Math.sin((angle * Math.PI) / 180)}
                stroke="#1e293b"
                strokeWidth={3}
                strokeLinecap="round"
                className="transition-transform duration-500 ease-out origin-center"
              />
            );
          })()}
        </svg>

        {/* Digital Score value with subtle 3D hover bounce */}
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-end">
          <motion.span
            animate={{ scale: hovered ? 1.1 : 1 }}
            className="text-2xl font-bold tracking-tight text-slate-800 font-sans"
          >
            {score}
          </motion.span>
        </div>
      </div>

      <span className="text-[10px] font-bold text-slate-500 tracking-wider text-center px-1 uppercase leading-tight select-none mt-1">
        {label}
      </span>

      {/* Editor Panel Popover */}
      <AnimatePresence>
        {isEditing && onUpdateScore && (
          <div
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-xl p-2 flex flex-col items-center justify-center z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] text-white font-bold mb-1">Set Score (0-100)</span>
            <div className="flex gap-1.5 items-center">
              <input
                type="number"
                min="0"
                max="100"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                className="w-14 text-center px-1 py-0.5 rounded text-xs text-slate-900 border border-blue-500 focus:outline-none font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white text-[10px] py-1 px-1.5 rounded font-bold hover:bg-blue-700"
              >
                Go
              </button>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="text-[9px] text-slate-400 mt-2 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ==========================================
// 4. 3D FULL CIRCULAR GAUGE
// ==========================================
interface CircularGauge3DProps {
  score: number;
  label: string;
  color?: string;
  size?: number;
  onUpdateScore?: (newScore: number) => void;
}

export const CircularGauge3D: React.FC<CircularGauge3DProps> = ({
  score,
  label,
  color = '#10b981',
  size = 110,
  onUpdateScore
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState('');

  const r = size * 0.35;
  const strokeWidth = 10;
  const center = size / 2;
  const circ = 2 * Math.PI * r;
  const strokeDashoffset = circ - (Math.min(score, 100) / 100) * circ;

  const startEdit = () => {
    if (!onUpdateScore) return;
    setIsEditing(true);
    setEditVal(score.toString());
  };

  const handleSave = () => {
    const num = Math.min(Math.max(parseInt(editVal) || 0, 0), 100);
    if (onUpdateScore) onUpdateScore(num);
    setIsEditing(false);
  };

  return (
    <div
      className="flex flex-col items-center justify-center p-2 bg-white rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border border-slate-50 group hover:shadow-lg transition-all duration-500 relative cursor-pointer min-h-[130px]"
      onClick={startEdit}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90 overflow-visible">
          {/* Subtle Outer Glow */}
          <circle
            cx={center}
            cy={center}
            r={r + 4}
            fill="none"
            stroke="rgba(0,0,0,0.02)"
            strokeWidth={2}
          />

          {/* Background Ring */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {/* Active Ring with Gradient */}
          <motion.circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset }}
            strokeLinecap="round"
            transition={{ duration: 1.5, ease: "easeOut" }}
          />

          {/* Top highlight to give it a "3D" tube look */}
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            stroke="white"
            strokeWidth={strokeWidth * 0.3}
            strokeDasharray={circ}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            opacity="0.3"
            className="pointer-events-none"
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-3xl font-bold text-slate-800"
          >
            {score}
          </motion.span>
        </div>
      </div>

      <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase mt-1 text-center group-hover:text-slate-600 transition-colors">
        {label}
      </span>

      {/* Editor Panel Popover */}
      <AnimatePresence>
        {isEditing && onUpdateScore && (
          <div
            className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm rounded-xl p-2 flex flex-col items-center justify-center z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[10px] text-white font-bold mb-1">Set Score (0-100)</span>
            <div className="flex gap-1.5 items-center">
              <input
                type="number"
                min="0"
                max="100"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                className="w-14 text-center px-1 py-0.5 rounded text-xs text-slate-900 border border-blue-500 focus:outline-none font-bold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white text-[10px] py-1 px-1.5 rounded font-bold hover:bg-blue-700"
              >
                Go
              </button>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="text-[9px] text-slate-400 mt-2 hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ==========================================
// 4. 3D SPHERICAL BUBBLE SCATTER PLOT
// ==========================================
interface ThreeDScatterProps {
  points: ScatterPoint[];
  onUpdatePoint?: (index: number, updated: Partial<ScatterPoint>) => void;
}

export const ThreeDScatter: React.FC<ThreeDScatterProps> = ({ points, onUpdatePoint }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [editCtr, setEditCtr] = useState('');
  const [editPos, setEditPos] = useState('');
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Layout boundaries
  const padding = { left: 40, right: 30, top: 20, bottom: 40 };
  const width = 450;
  const height = 220;

  // Domain constraints
  // Position goes 0 (right) to 20 (left)
  const maxPos = 20;
  const minPos = 0;
  // CTR goes 0% to 35%
  const maxCtr = 35;
  const minCtr = 0;

  // Convert coordinate spaces
  const getX = (position: number) => {
    // Invert position so lower value results in higher X (rightward movement)
    // 0 is far right, 20 is far left
    const share = (maxPos - position) / (maxPos - minPos);
    return padding.left + share * (width - padding.left - padding.right);
  };

  const getY = (ctr: number) => {
    const share = (ctr - minCtr) / (maxCtr - minCtr);
    return height - padding.bottom - share * (height - padding.top - padding.bottom);
  };

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top - 50,
    });
    setHoveredIdx(index);
  };

  const triggerEdit = (idx: number) => {
    if (!onUpdatePoint) return;
    setIsEditing(idx);
    setEditCtr(points[idx].ctr.toString());
    setEditPos(points[idx].position.toString());
  };

  const saveEdit = (idx: number) => {
    const updatedCtr = parseFloat(editCtr);
    const updatedPos = parseFloat(editPos);
    if (!isNaN(updatedCtr) && !isNaN(updatedPos) && onUpdatePoint) {
      onUpdatePoint(idx, {
        ctr: Math.max(0, Math.min(updatedCtr, 100)),
        position: Math.max(0, Math.min(updatedPos, 20))
      });
    }
    setIsEditing(null);
  };

  return (
    <div id="scatter-plot-3d" className="relative w-full border border-slate-100 rounded-xl bg-slate-50/50 p-4" ref={containerRef}>
      <div className="relative overflow-visible" style={{ height: `${height}px` }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible select-none">
          <defs>
            {/* 3D Sphere Gradients */}
            <radialGradient id="sphere-blue" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="45%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </radialGradient>
            <radialGradient id="sphere-green" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="45%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#064e3b" />
            </radialGradient>

            {/* Glowing filter */}
            <filter id="glow-3d" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 3D Perspective Floor Wireframe background */}
          <g stroke="#e2e8f0" strokeWidth="0.5">
            {/* Horizontal Gridlines (CTR levels from 0 to 35) */}
            {[0, 5, 10, 15, 20, 25, 30, 35].map(v => (
              <line
                key={`h-${v}`}
                x1={padding.left}
                y1={getY(v)}
                x2={width - padding.right}
                y2={getY(v)}
              />
            ))}

            {/* Vertical Gridlines (Position columns from 2 to 20) */}
            {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map(p => (
              <line
                key={`v-${p}`}
                x1={getX(p)}
                y1={padding.top}
                x2={getX(p)}
                y2={height - padding.bottom}
              />
            ))}
          </g>

          {/* Axes labels */}
          <g fill="#64748b" fontSize="8" fontFamily="monospace">
            {/* Y axis ticks (CTR %) */}
            {[0, 10, 20, 30, 35].map(v => (
              <text key={`yt-${v}`} x={padding.left - 8} y={getY(v) + 3} textAnchor="end">
                {v}%
              </text>
            ))}
            <text
              transform={`rotate(-90) translate(${-height/2}, 12)`}
              textAnchor="middle"
              className="font-bold tracking-wider fill-slate-500"
              fontSize="9"
            >
              CTR (%)
            </text>

            {/* X axis ticks (Avg Position - reversed so 0 is right, 20 is left) */}
            {[20, 18, 16, 14, 12, 10, 8, 6, 4, 2, 0].map(p => (
              <text key={`xt-${p}`} x={getX(p)} y={height - padding.bottom + 12} textAnchor="middle">
                {p}
              </text>
            ))}
            <text
              x={width / 2}
              y={height - 8}
              textAnchor="middle"
              className="font-bold tracking-wider fill-slate-500"
              fontSize="9"
            >
              Average Position
            </text>
          </g>

          {/* Graph Data Points with 3D Drop-Vector Lines */}
          {points.map((p, i) => {
            const rx = getX(p.position);
            const ry = getY(p.ctr);
            const active = hoveredIdx === i;
            const bubbleSize = active ? 18 : 13;

            return (
              <g
                key={p.id}
                className="cursor-pointer"
                onMouseMove={(e) => handleMouseMove(e, i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => triggerEdit(i)}
              >
                {/* 3D Drop projection lines to floor grid */}
                <line
                  x1={rx}
                  y1={ry}
                  x2={rx}
                  y2={height - padding.bottom}
                  stroke={active ? '#3b82f6' : '#9ca3af'}
                  strokeDasharray="2,2"
                  strokeWidth={active ? 1.5 : 0.8}
                  opacity={active ? 0.9 : 0.4}
                />
                <line
                  x1={rx}
                  y1={ry}
                  x2={padding.left}
                  y2={ry}
                  stroke={active ? '#3b82f6' : '#9ca3af'}
                  strokeDasharray="2,2"
                  strokeWidth={active ? 1.5 : 0.8}
                  opacity={active ? 0.9 : 0.4}
                />

                {/* Sub-spherical projection floor shadow */}
                <ellipse
                  cx={rx}
                  cy={height - padding.bottom}
                  rx={bubbleSize * 0.7}
                  ry={3}
                  fill="rgba(15, 23, 42, 0.12)"
                />

                {/* Spherical Gradient Sphere for 3D look */}
                <circle
                  cx={rx}
                  cy={ry}
                  r={bubbleSize}
                  fill={active ? 'url(#sphere-green)' : 'url(#sphere-blue)'}
                  filter={active ? 'url(#glow-3d)' : 'none'}
                  className="transition-all duration-200"
                />

                {/* Sphere reflection highlight cap */}
                <circle
                  cx={rx - bubbleSize * 0.3}
                  cy={ry - bubbleSize * 0.3}
                  r={bubbleSize * 0.25}
                  fill="white"
                  opacity="0.45"
                  pointerEvents="none"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Popover Bubble edit mode */}
      <AnimatePresence>
        {isEditing !== null && onUpdatePoint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-slate-200 shadow-xl rounded-lg p-3 z-30"
          >
            <div className="text-xs font-bold text-slate-800 mb-2 truncate max-w-[200px]">
              Edit "{points[isEditing].keyword}"
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] w-14 font-semibold text-slate-500">CTR (%):</span>
                <input
                  type="number"
                  step="0.1"
                  value={editCtr}
                  onChange={(e) => setEditCtr(e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs border border-rounded font-bold bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] w-14 font-semibold text-slate-500">Position:</span>
                <input
                  type="number"
                  step="0.1"
                  value={editPos}
                  onChange={(e) => setEditPos(e.target.value)}
                  className="w-16 px-1.5 py-0.5 text-xs border border-rounded font-bold bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(null)}
                  className="text-[10px] text-slate-400 font-semibold px-2 hover:text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => saveEdit(isEditing)}
                  className="bg-blue-600 text-white text-[10px] py-1 px-2.5 rounded font-bold hover:bg-blue-700 shadow-sm"
                >
                  Apply
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hoveredIdx !== null && isEditing === null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bg-slate-900/95 text-white text-xs py-2 px-3 rounded-lg shadow-xl border border-slate-700 pointer-events-none z-50 flex flex-col gap-0.5 max-w-[200px]"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="font-semibold text-emerald-300 text-[10px] uppercase truncate">
              {points[hoveredIdx].keyword}
            </div>
            <div className="text-[11px] flex gap-2">
              <span className="text-slate-300">CTR: <strong className="text-white">{points[hoveredIdx].ctr}%</strong></span>
              <span className="text-slate-300">Position: <strong className="text-white">{points[hoveredIdx].position}</strong></span>
            </div>
            <div className="text-[9px] text-slate-400 italic">Click bubble to edit parameters</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ==========================================
// 5. 3D GLOWING CONVERSION FUNNEL
// ==========================================
interface ThreeDFunnelProps {
  stages: FunnelStage[];
  onUpdateStage?: (index: number, newValue: number) => void;
}

export const ThreeDFunnel: React.FC<ThreeDFunnelProps> = ({ stages, onUpdateStage }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const maxVal = Math.max(...stages.map(s => s.value), 1);
  const totalStages = stages.length;

  const handleMouseMove = (e: React.MouseEvent, index: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 20,
      y: e.clientY - rect.top,
    });
    setHoveredIdx(index);
  };

  const startEdit = (idx: number, currentVal: number) => {
    if (!onUpdateStage) return;
    setIsEditing(idx);
    setEditVal(currentVal.toString());
  };

  const saveEdit = (idx: number) => {
    const num = parseInt(editVal);
    if (!isNaN(num) && num >= 0 && onUpdateStage) {
      onUpdateStage(idx, num);
    }
    setIsEditing(null);
  };

  return (
    <div id="conversion-funnel-3d" className="relative w-full border border-slate-100 rounded-xl bg-slate-50/50 p-4" ref={containerRef}>
      <div className="flex flex-col gap-4 py-3 select-none">
        {stages.map((stage, i) => {
          const widthShare = stage.value / maxVal;
          // Calculate tapered layout widths
          const barWidthVal = Math.max(widthShare * 100, 15); // percentage
          const active = hoveredIdx === i;

          // Distinct colors down the funnel
          const colors = ['#2563eb', '#3b82f6', '#10b981'];
          const color = colors[i] || '#3b82f6';

          return (
            <div
              key={stage.id}
              className="relative group cursor-pointer"
              onMouseMove={(e) => handleMouseMove(e, i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => startEdit(i, stage.value)}
            >
              {/* Funnel Section Labels split */}
              <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1 z-10 px-1">
                <span className={active ? 'text-blue-600 font-bold' : ''}>{stage.name}</span>
                <span className="font-mono text-slate-700">{formatVal(stage.value)}</span>
              </div>

              {/* Pseudo-3D Isometric horizontal container block */}
              <div className="relative w-full h-[36px] bg-slate-200/40 rounded-lg overflow-visible">
                {/* 3D block extrusion bar panel */}
                <motion.div
                  className="absolute left-0 top-0 h-full rounded-l-lg rounded-r-md"
                  style={{
                    width: `${barWidthVal}%`,
                    backgroundColor: color,
                    boxShadow: active
                      ? `0 10px 20px -10px ${color}, inset 0 2px 4px rgba(255,255,255,0.4)`
                      : 'inset 0 1px 2px rgba(255,255,255,0.3)',
                    transform: 'perspective(300px) rotateX(10deg)',
                    transformOrigin: 'left center'
                  }}
                  animate={{ scaleY: active ? 1.05 : 1 }}
                  transition={{ duration: 0.2 }}
                />

                {/* Lighter top-beveled gloss bar for metallic 3D feel */}
                <div
                  className="absolute left-0 top-0 h-[30%] opacity-45 pointer-events-none rounded-t-lg bg-gradient-to-b from-white to-transparent"
                  style={{ width: `${barWidthVal}%` }}
                />

                {/* Stage information indicator overlays */}
                {stage.percentage && (
                  <div className="absolute right-3 inset-y-0 flex items-center justify-end pointer-events-none">
                    <span className="bg-slate-900/10 backdrop-blur-sm text-[10px] text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded border border-slate-900/5">
                      {stage.conversionText}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor Modal overlay */}
      <AnimatePresence>
        {isEditing !== null && onUpdateStage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur border border-slate-200 shadow-xl rounded-lg p-3 flex items-center gap-2 z-30"
          >
            <span className="text-xs text-slate-600 font-semibold">Set value for {stages[isEditing].name}:</span>
            <input
              type="number"
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              className="w-20 px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(isEditing);
                if (e.key === 'Escape') setIsEditing(null);
              }}
            />
            <button
              onClick={() => saveEdit(isEditing)}
              className="bg-blue-600 text-white text-xs px-2.5 py-1 rounded hover:bg-blue-700 font-bold"
            >
              Save
            </button>
            <button onClick={() => setIsEditing(null)} className="text-slate-400 hover:text-slate-600 text-xs px-1">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {hoveredIdx !== null && isEditing === null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bg-slate-900/95 text-white text-sm py-2 px-3 rounded-lg shadow-xl border border-slate-700 pointer-events-none z-50 flex flex-col gap-0.5"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="font-bold text-[10px] text-blue-300 uppercase leading-none">{stages[hoveredIdx].name}</div>
            <div className="text-sm font-bold mt-0.5">
              {formatVal(stages[hoveredIdx].value)}
            </div>
            {stages[hoveredIdx].percentage && (
              <div className="text-[10px] text-slate-300 border-t border-slate-700 pt-0.5 mt-0.5">
                Conversion: <strong className="text-white">{stages[hoveredIdx].percentage}</strong>
              </div>
            )}
            <div className="text-[9px] text-slate-400 italic mt-0.5">Click step to edit</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
