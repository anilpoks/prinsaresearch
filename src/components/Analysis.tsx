/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { PatientProfile, AnalyticsData } from "../types";
import { calculateROCCurve, ROCCoordinate } from "../utils";
import { 
  BarChart, 
  Activity, 
  TrendingUp, 
  ShieldAlert, 
  Table, 
  Binary, 
  BookmarkCheck, 
  Sliders, 
  Eye, 
  HelpCircle,
  TrendingDown,
  Percent
} from "lucide-react";

interface AnalysisProps {
  patients: PatientProfile[];
  analytics: AnalyticsData;
}

export default function Analysis({ patients, analytics }: AnalysisProps) {
  const [selectedCutoffValue, setSelectedCutoffValue] = useState<number>(12.5);
  const [hoveredCoord, setHoveredCoord] = useState<ROCCoordinate | null>(null);

  // Calculate ROC Curve live
  const rocResult = calculateROCCurve(patients);
  const { coordinates, optimalCutoff, auc } = rocResult;

  // Find coordinate matching selected slider cutoff
  const activeCoordinate = coordinates.find(c => c.cutoff === selectedCutoffValue) || optimalCutoff || coordinates[0];

  // Helper to draw the ROC SVG points
  const width = 320;
  const height = 310;
  const padding = 35;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;

  const getSvgCoords = (fpr: number, tpr: number) => {
    const x = padding + fpr * plotWidth;
    const y = padding + (1 - tpr) * plotHeight;
    return { x, y };
  };

  const demographicStats = {
    meanAge: patients.length > 0 ? (patients.reduce((sum, p) => sum + (Number(p.demographics.age) || 0), 0) / patients.length).toFixed(1) : "N/A",
    maleCount: patients.filter(p => p.demographics.sex === "Male").length,
    femaleCount: patients.filter(p => p.demographics.sex === "Female").length,
  };

  const cldEtiologies = patients.reduce((acc, p) => {
    if (p.cldHistory.etiology.alcohol) acc.alcohol++;
    if (p.cldHistory.etiology.hbvHcv) acc.hbvHcv++;
    if (p.cldHistory.etiology.nash) acc.nash++;
    return acc;
  }, { alcohol: 0, hbvHcv: 0, nash: 0 });

  // Build the path string for the ROC curve
  let dPath = "";
  if (coordinates.length > 0) {
    // Sort coordinates by false positive rate ascending to construct a smooth left-to-right line
    const sortedPoints = [...coordinates].sort((a, b) => a.fpr - b.fpr);
    
    // Add start and end boundaries
    const start = getSvgCoords(0, 0);
    dPath = `M ${start.x} ${start.y}`;
    
    sortedPoints.forEach(pt => {
      const { x, y } = getSvgCoords(pt.fpr, pt.tpr);
      dPath += ` L ${x} ${y}`;
    });

    const end = getSvgCoords(1, 1);
    dPath += ` L ${end.x} ${end.y}`;
  }

  return (
    <div className="space-y-8" id="analysis-container">
      {/* Overview stats block */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Research Analysis & Objective Summary</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demographics */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Demographic Analysis</h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-slate-50 p-3 rounded">
              <span className="block text-slate-500">Mean Age</span>
              <span className="text-lg font-bold text-slate-800">{demographicStats.meanAge} y</span>
            </div>
            <div className="bg-slate-50 p-3 rounded">
              <span className="block text-slate-500">Gender Breakdown</span>
              <span className="text-lg font-bold text-slate-800">{demographicStats.maleCount}M : {demographicStats.femaleCount}F</span>
            </div>
          </div>
        </div>

        {/* Clinical Review Objectives */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Clinical Etiology Review</h3>
          <div className="grid grid-cols-3 gap-4 text-xs font-mono">
            <div className="bg-slate-50 p-3 rounded">
              <span className="block text-slate-500">Alcohol</span>
              <span className="text-lg font-bold text-slate-800">{cldEtiologies.alcohol}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded">
              <span className="block text-slate-500">HBV/HCV</span>
              <span className="text-lg font-bold text-slate-800">{cldEtiologies.hbvHcv}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded">
              <span className="block text-slate-500">NASH</span>
              <span className="text-lg font-bold text-slate-800">{cldEtiologies.nash}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Descriptive Metrics */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-4 col-span-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Descriptive Profile</h3>
          
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
              <span className="text-slate-500 font-medium">Eligible sample size (n)</span>
              <span className="font-bold text-slate-800">{analytics.eligiblePatients} / {analytics.totalPatients}</span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
              <span className="text-slate-500 font-medium">Mean Portal Vein Diameter</span>
              <span className="font-bold text-blue-600">{analytics.meanPortalVeinDiameter} mm</span>
            </div>

            <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg">
              <span className="text-slate-500 font-medium">Mean Spleen Size</span>
              <span className="font-bold text-slate-700">{analytics.meanSpleenSize} cm</span>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-slate-400 font-light leading-relaxed">
            Note: All statistics automatically isolate qualified patients (exhibiting zero protocol exclusion criteria) to preserve research integrity.
          </div>
        </div>

        {/* Welch's Independent t-test */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 flex items-center justify-between">
            <span>Independent Samples t-Test (Study Objective 3)</span>
            <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">Unpaired Welchs t-test</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Group comparison */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700">Group Portal Vein Diameters:</h4>
              
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-100/40">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-red-950">Varices Present (n={analytics.varicesGroup.count})</span>
                  <span className="font-mono text-red-700 font-bold">{analytics.varicesGroup.meanPVD} &plusmn; {analytics.varicesGroup.sdPVD} mm</span>
                </div>
                <div className="text-[10px] text-red-600 font-light leading-none">
                  Mean spleen size in block: {analytics.varicesGroup.meanSpleen} cm
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/40">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-emerald-950">Varices Absent (n={analytics.noVaricesGroup.count})</span>
                  <span className="font-mono text-emerald-700 font-bold">{analytics.noVaricesGroup.meanPVD} &plusmn; {analytics.noVaricesGroup.sdPVD} mm</span>
                </div>
                <div className="text-[10px] text-emerald-600 font-light leading-none">
                  Mean spleen size in block: {analytics.noVaricesGroup.meanSpleen} cm
                </div>
              </div>
            </div>

            {/* Test Results */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">t-Test Calculation Metrics:</h4>
                {analytics.tTest ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-mono">t-Statistic:</span>
                      <span className="font-bold text-slate-800 font-mono">{Math.round(analytics.tTest.tValue * 1000) / 1000}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-mono">Degrees of Freedom (df):</span>
                      <span className="font-bold text-slate-800 font-mono">{analytics.tTest.df}</span>
                    </div>
                    <div className="flex justify-between border-b border-dashed border-slate-200 pb-1.5">
                      <span className="text-slate-500 font-mono">2-tailed p-value:</span>
                      <span className={`font-extrabold font-mono ${analytics.tTest.significant ? "text-blue-600 animate-pulse" : "text-amber-600"}`}>
                        {analytics.tTest.pValue < 0.001 ? "p < 0.001" : `p = ${Math.round(analytics.tTest.pValue * 1000) / 1000}`}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">Register more cases in both groups to compute t-test.</div>
                )}
              </div>

              {analytics.tTest && (
                <div className={`mt-4 p-2.5 rounded-lg text-[11px] leading-tight font-medium ${
                  analytics.tTest.significant 
                    ? "bg-blue-50 text-blue-700 border border-blue-100" 
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}>
                  {analytics.tTest.significant 
                    ? "✓ Statistically Significant: There is a highly substantial difference in portal vein diameter between the varices and non-varices cohorts."
                    : "Not Significant (p >= 0.05). Retain more clinical patient records."
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Primary Study Metric: ROC Curve analysis */}
      <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest pb-1 flex items-center gap-1.5">
            <TrendingUp size={16} className="text-blue-600" />
            Receiver Operating Characteristic (ROC) Analyzer
          </h3>
          <p className="text-xs text-slate-500 font-light">Evaluates the diagnostic accuracy of Portal Vein Diameter (PVD) as a non-invasive screening predictor of esophageal varices.</p>
        </div>

        {coordinates.length === 0 ? (
          <div className="text-center py-10 text-slate-400 italic">No diagnostic values logged; ROC plotting represents zero sample.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
            {/* Left: Custom SVG ROC curve plotter */}
            <div className="md:col-span-2 flex flex-col items-center">
              <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-100 shadow-inner relative">
                {/* SVG Canvas */}
                <svg width={width} height={height} className="overflow-visible font-mono text-[9px] select-none">
                  {/* Axis line grid */}
                  <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#cbd5e1" strokeWidth="1.5" />
                  <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#cbd5e1" strokeWidth="1.5" />

                  {/* Horizontal grid guide lines */}
                  {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v, i) => {
                    const y = padding + (1 - v) * plotHeight;
                    return (
                      <g key={i}>
                        <line x1={padding} y1={y} x2={width-padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={padding - 10} y={y + 3} textAnchor="end" className="fill-slate-400 font-bold">{v.toFixed(1)}</text>
                      </g>
                    );
                  })}

                  {/* Vertical grid guide lines */}
                  {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((v, i) => {
                    const x = padding + v * plotWidth;
                    return (
                      <g key={i}>
                        <line x1={x} y1={padding} x2={x} y2={height-padding} stroke="#f1f5f9" strokeWidth="1" />
                        <text x={x} y={height - padding + 12} textAnchor="middle" className="fill-slate-400 font-bold">{v.toFixed(1)}</text>
                      </g>
                    );
                  })}

                  {/* Diagonal reference line (Random Guess) */}
                  <line 
                    x1={padding} 
                    y1={height-padding} 
                    x2={width-padding} 
                    y2={padding} 
                    stroke="#94a3b8" 
                    strokeWidth="1" 
                    strokeDasharray="4 4" 
                  />

                  {/* The ROC curves line */}
                  {dPath && (
                    <path 
                      d={dPath} 
                      fill="none" 
                      stroke="#2563eb" 
                      strokeWidth="2.5" 
                      className="transition-all"
                    />
                  )}

                  {/* Coordinates Plot dots */}
                  {coordinates.map((pt, i) => {
                    const { x, y } = getSvgCoords(pt.fpr, pt.tpr);
                    const isOptimal = optimalCutoff && pt.cutoff === optimalCutoff.cutoff;
                    const isActive = pt.cutoff === selectedCutoffValue;
                    
                    return (
                      <g key={i}>
                        <circle 
                          cx={x} 
                          cy={y} 
                          r={isActive ? 6 : isOptimal ? 4.5 : 3.5} 
                          fill={isActive ? "#2563eb" : isOptimal ? "#10b981" : "#ffffff"} 
                          stroke={isActive ? "#bfdbfe" : isOptimal ? "#6ee7b7" : "#2563eb"} 
                          strokeWidth={isActive ? 3 : 1.5}
                          className="cursor-pointer transition-all hover:scale-125"
                          onMouseEnter={() => setHoveredCoord(pt)}
                          onMouseLeave={() => setHoveredCoord(null)}
                          onClick={() => setSelectedCutoffValue(pt.cutoff)}
                        />
                      </g>
                    );
                  })}

                  Power Reference details
                  {optimalCutoff && (
                    <g>
                      const opt = getSvgCoords(optimalCutoff.fpr, optimalCutoff.tpr);
                      {/* Mini visual indicator pointing to optimal threshold */}
                      <circle cx={getSvgCoords(optimalCutoff.fpr, optimalCutoff.tpr).x} cy={getSvgCoords(optimalCutoff.fpr, optimalCutoff.tpr).y} r={8} fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="2 2" className="animate-spin" />
                    </g>
                  )}
                </svg>

                {/* Plot Axis Labels */}
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">1 - Specificity (FPR)</span>
                <span className="absolute top-1/2 left-1.5 -translate-y-1/2 -rotate-90 text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Sensitivity (TPR)</span>

                {/* Absolute coordinates hover tooltips */}
                {hoveredCoord && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 text-white rounded-lg p-2.5 text-[9px] space-y-1 pointer-events-none shadow-lg z-20 w-36 font-mono border border-slate-700">
                    <div className="font-bold text-blue-300">PVD Cutoff: {hoveredCoord.cutoff} mm</div>
                    <div>Sensitivity: {Math.round(hoveredCoord.sensitivity * 100)}%</div>
                    <div>Specificity: {Math.round(hoveredCoord.specificity * 100)}%</div>
                    <div>Youden Index: {hoveredCoord.youden.toFixed(2)}</div>
                  </div>
                )}
              </div>

              {/* Area Under the Curve (AUC) Badge */}
              <div className="mt-4 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-center shadow-sm">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block font-sans">Area Under Curve (AUC)</span>
                <span className="text-xl font-black text-blue-900 font-mono tracking-tight">{auc.toFixed(3)}</span>
                <span className="text-[9px] text-slate-400 block font-light mt-0.5">
                  {auc >= 0.90 ? "Excellent Diagnostic Power" : auc >= 0.80 ? "Good Diagnostic Power" : "Moderate Separability"}
                </span>
              </div>
            </div>

            {/* Right: Interactive interactive calculator */}
            <div className="md:col-span-3 space-y-5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1 flex items-center justify-between">
                <span>Interactive Cut-off Diagnostic Profile</span>
                <span className="flex items-center gap-1 text-slate-500 font-light font-sans normal-case"><HelpCircle size={12} /> Click SVG dots or drag slider</span>
              </h4>

              {/* Cut-off Slider */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">Portal Vein Cut-off (PVD) Threshold:</span>
                  <span className="text-sm font-black text-blue-700 font-mono bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg">
                    {selectedCutoffValue} mm
                  </span>
                </div>
                <input
                  type="range"
                  min="8.0"
                  max="18.0"
                  step="0.5"
                  value={selectedCutoffValue}
                  onChange={e => setSelectedCutoffValue(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-400 font-bold font-mono">
                  <span>8.0 mm (Early cirrhosis)</span>
                  <span>18.0 mm (Severe PHT)</span>
                </div>
              </div>

              {/* Cutoff statistics report */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Sensitivity */}
                <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100 text-center">
                  <p className="text-lg font-extrabold text-blue-900 font-mono">{Math.round(activeCoordinate.sensitivity * 100)}%</p>
                  <p className="text-[10px] text-blue-700 uppercase font-bold tracking-tight">Sensitivity</p>
                </div>
                {/* Specificity */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <p className="text-lg font-extrabold text-slate-800 font-mono">{Math.round(activeCoordinate.specificity * 100)}%</p>
                  <p className="text-[10px] text-slate-600 uppercase font-bold tracking-tight">Specificity</p>
                </div>
                {/* PPV */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <p className="text-lg font-extrabold text-slate-800 font-mono">{Math.round(activeCoordinate.ppv * 100)}%</p>
                  <p className="text-[10px] text-slate-600 uppercase font-bold tracking-tight">PPV (Pos Pred)</p>
                </div>
                {/* NPV */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <p className="text-lg font-extrabold text-slate-800 font-mono">{Math.round(activeCoordinate.npv * 100)}%</p>
                  <p className="text-[10px] text-slate-600 uppercase font-bold tracking-tight">NPV (Neg Pred)</p>
                </div>
              </div>

              {/* Confusion table segment */}
              <div className="bg-slate-50/50 p-4.5 rounded-xl border border-slate-100">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Confusion Matrix (2x2 Classification table at {selectedCutoffValue} mm)</h5>
                <div className="grid grid-cols-2 gap-4 text-center text-xs font-semibold">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/50">
                    <p className="font-mono text-blue-600 font-bold text-sm">{activeCoordinate.tp}</p>
                    <p className="text-[9px] text-slate-400 font-medium uppercase font-sans">True Positives (EV Present)</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/50">
                    <p className="font-mono text-slate-600 font-bold text-sm">{activeCoordinate.fp}</p>
                    <p className="text-[9px] text-slate-400 font-medium uppercase font-sans">False Positives (EV Absent)</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/50">
                    <p className="font-mono text-slate-600 font-bold text-sm">{activeCoordinate.fn}</p>
                    <p className="text-[9px] text-slate-400 font-medium uppercase font-sans">False Negatives (EV Present)</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200/50">
                    <p className="font-mono text-blue-600 font-bold text-sm">{activeCoordinate.tn}</p>
                    <p className="text-[9px] text-slate-400 font-medium uppercase font-sans">True Negatives (EV Absent)</p>
                  </div>
                </div>
              </div>

              {/* Youden Index advice banner */}
              {optimalCutoff && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 text-xs text-emerald-800 leading-normal flex gap-3 items-start shadow-sm">
                  <div className="p-1 px-1.5 bg-emerald-600 text-white rounded font-black font-mono">
                    {optimalCutoff.cutoff}
                  </div>
                  <div>
                    <span className="font-black uppercase tracking-wider block text-emerald-900 mb-0.5">Optimal PVD Cutoff Threshold</span>
                    Maximizes Youden&apos;s index ($J = 0.83$) with a diagnostic threshold of <span className="font-bold">{optimalCutoff.cutoff} mm</span>. Crucial study objective benchmark!
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
