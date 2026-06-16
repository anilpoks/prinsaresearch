/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Info, HelpCircle, FileText, Settings, ShieldAlert, Check } from "lucide-react";

interface ScoreDetailsProps {
  bilirubin: number | null;
  albumin: number | null;
  inr: number | null;
  sodium: number | null;
  creatinine: number | null;
  ascitesGrade: "None" | "Mild" | "Moderate" | "Severe";
  hasConfusion: boolean; // Corresponds to Encephalopathy grade
}

export default function ScoreDetails({
  bilirubin,
  albumin,
  inr,
  sodium,
  creatinine,
  ascitesGrade,
  hasConfusion,
}: ScoreDetailsProps) {
  // --- Child-Pugh Score Calculation details ---
  const encephalopathyGrade = (hasConfusion ? "Grade I-II" : "None") as "None" | "Grade I-II" | "Grade III-IV";

  // 1. Bilirubin points rules
  let bilPoints = 1;
  let bilRule = "Bilirubin < 2.0 mg/dl  (+1 pt)";
  if (bilirubin !== null) {
    if (bilirubin > 3.0) {
      bilPoints = 3;
      bilRule = "Bilirubin > 3.0 mg/dl  (+3 pts)";
    } else if (bilirubin >= 2.0) {
      bilPoints = 2;
      bilRule = "Bilirubin 2.0 - 3.0 mg/dl  (+2 pts)";
    }
  }

  // 2. Albumin points rules
  let albPoints = 1;
  let albRule = "Albumin > 3.5 g/dl  (+1 pt)";
  if (albumin !== null) {
    if (albumin < 2.8) {
      albPoints = 3;
      albRule = "Albumin < 2.8 g/dl  (+3 pts)";
    } else if (albumin <= 3.5) {
      albPoints = 2;
      albRule = "Albumin 2.8 - 3.5 g/dl  (+2 pts)";
    }
  }

  // 3. INR points rules
  let inrPoints = 1;
  let inrRule = "INR < 1.7  (+1 pt)";
  if (inr !== null) {
    if (inr > 2.3) {
      inrPoints = 3;
      inrRule = "INR > 2.3  (+3 pts)";
    } else if (inr >= 1.7) {
      inrPoints = 2;
      inrRule = "INR 1.7 - 2.3  (+2 pts)";
    }
  }

  // 4. Ascites points rules
  let ascPoints = 1;
  let ascRule = "No Ascites  (+1 pt)";
  if (ascitesGrade === "Mild") {
    ascPoints = 2;
    ascRule = "Mild Ascites (diuretic responsive)  (+2 pts)";
  } else if (ascitesGrade === "Moderate" || ascitesGrade === "Severe") {
    ascPoints = 3;
    ascRule = "Moderate/Severe Ascites (diuretic refractory)  (+3 pts)";
  }

  // 5. Encephalopathy points rules
  let encPoints = 1;
  let encRule = "No Encephalopathy  (+1 pt)";
  if (encephalopathyGrade === "Grade I-II") {
    encPoints = 2;
    encRule = "Grade I-II Encephalopathy  (+2 pts)";
  } else if (encephalopathyGrade === "Grade III-IV") {
    encPoints = 3;
    encRule = "Grade III-IV Encephalopathy  (+3 pts)";
  }

  const cpTotal = bilPoints + albPoints + inrPoints + ascPoints + encPoints;
  let cpClass: "Class A" | "Class B" | "Class C" = "Class A";
  let cpSurvival = "100% (1-year), 85% (2-year)";
  if (cpTotal >= 10) {
    cpClass = "Class C";
    cpSurvival = "45% (1-year), 35% (2-year)";
  } else if (cpTotal >= 7) {
    cpClass = "Class B";
    cpSurvival = "81% (1-year), 57% (2-year)";
  }

  const isCPComplete = bilirubin !== null && albumin !== null && inr !== null;

  // --- MELD / MELD-Na Calculation details ---
  const isMELDComplete = bilirubin !== null && creatinine !== null && inr !== null;

  // Capping details
  const rawBil = bilirubin !== null ? bilirubin : 0;
  const rawCr = creatinine !== null ? creatinine : 0;
  const rawINR = inr !== null ? inr : 0;
  const rawNa = sodium !== null ? sodium : 0;

  const capBil = Math.max(1.0, rawBil);
  const capCr = Math.min(4.0, Math.max(1.0, rawCr));
  const capINR = Math.max(1.0, rawINR);
  const capNa = sodium !== null ? Math.min(137, Math.max(125, rawNa)) : 137;

  // Log Terms
  const logBilTerm = 0.378 * Math.log(capBil);
  const logINRTerm = 1.12 * Math.log(capINR);
  const logCrTerm = 0.957 * Math.log(capCr);
  const constantTerm = 0.643;

  const meldUnosRaw = logBilTerm + logINRTerm + logCrTerm + constantTerm;
  let meldCalculated = Math.round(meldUnosRaw * 10);
  let isMeldCappedMin = false;
  let isMeldCappedMax = false;
  if (meldCalculated < 6) {
    meldCalculated = 6;
    isMeldCappedMin = true;
  }
  if (meldCalculated > 40) {
    meldCalculated = 40;
    isMeldCappedMax = true;
  }

  // MELD-Na adjustment
  let finalMeldNa = meldCalculated;
  let naAdjustmentExplanation = "";
  let appliesNaAdjustment = false;

  if (sodium !== null && isMELDComplete) {
    if (meldCalculated > 11) {
      appliesNaAdjustment = true;
      // Standard UNOS/OPTN MELD-Na equation: MELD-Na = MELD - Na - [0.008 * (137 - Na) * (37 - MELD)] + 137
      const calculatedMeldNa = meldCalculated + (137 - capNa) - 0.008 * (137 - capNa) * (37 - meldCalculated);
      finalMeldNa = Math.round(calculatedMeldNa);
      if (finalMeldNa < meldCalculated) finalMeldNa = meldCalculated; // standard cap / floor constraint
      if (finalMeldNa < 6) finalMeldNa = 6;
      if (finalMeldNa > 40) finalMeldNa = 40;
    } else {
      naAdjustmentExplanation = "Sodium correction is not applied because MELD score is ≤ 11.";
    }
  } else {
    naAdjustmentExplanation = "Sodium value is missing; MELD-Na is identical to dry MELD.";
  }

  return (
    <div className="bg-slate-900 text-slate-100 p-5 rounded-xl border border-slate-850 space-y-6 font-sans">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Settings size={18} className="text-yellow-400" />
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
            Automated Severity Calculations Audit
          </h4>
          <p className="text-[10px] text-slate-400">
            Interactive, standard clinical formulas verified item-by-item
          </p>
        </div>
      </div>

      {/* 1. CHILD-PUGH AUDIT */}
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-slate-850/60 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[11px] font-bold text-blue-350">1. Child-Pugh Clinical Classification</span>
          <span className="text-[10px] font-mono font-medium text-slate-400">Range: [5 - 15 Points]</span>
        </div>

        {!isCPComplete ? (
          <div className="p-3 bg-amber-950/20 text-amber-300 border border-amber-900/30 rounded-lg text-[10px] italic">
            ⚠ Missing required laboratory values: Bilirubin, Albumin, or INR. Live scoring requires all three fields to display exact points.
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table components */}
            <div className="bg-slate-950/40 divide-y divide-slate-800 rounded-lg text-[10px] border border-slate-800/80 overflow-hidden">
              <div className="grid grid-cols-12 gap-1 px-3 py-2 font-bold text-slate-450 bg-slate-950/80">
                <div className="col-span-4">Component Variable</div>
                <div className="col-span-3 text-right">Raw Value</div>
                <div className="col-span-3 text-right">Threshold Criterion</div>
                <div className="col-span-2 text-right text-blue-350">Points</div>
              </div>

              {/* Bilirubin */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-slate-850/25">
                <div className="col-span-4 font-semibold text-slate-300">Total Bilirubin</div>
                <div className="col-span-3 text-right font-mono text-slate-200">{bilirubin !== null ? `${bilirubin} mg/dl` : "Missing"}</div>
                <div className="col-span-3 text-right text-slate-400 leading-none">{bilRule.split("  ")[0]}</div>
                <div className="col-span-2 text-right font-bold font-mono text-blue-400">+{bilPoints}</div>
              </div>

              {/* Albumin */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-slate-850/25">
                <div className="col-span-4 font-semibold text-slate-300">Serum Albumin</div>
                <div className="col-span-3 text-right font-mono text-slate-200">{albumin !== null ? `${albumin} g/dl` : "Missing"}</div>
                <div className="col-span-3 text-right text-slate-400 leading-none">{albRule.split("  ")[0]}</div>
                <div className="col-span-2 text-right font-bold font-mono text-blue-400">+{albPoints}</div>
              </div>

              {/* INR */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-slate-850/25">
                <div className="col-span-4 font-semibold text-slate-300">INR</div>
                <div className="col-span-3 text-right font-mono text-slate-200">{inr !== null ? `${inr}` : "Missing"}</div>
                <div className="col-span-3 text-right text-slate-400 leading-none">{inrRule.split("  ")[0]}</div>
                <div className="col-span-2 text-right font-bold font-mono text-blue-400">+{inrPoints}</div>
              </div>

              {/* Ascites */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-slate-850/25">
                <div className="col-span-4 font-semibold text-slate-300">Ascites Grade</div>
                <div className="col-span-3 text-right text-slate-200 capitalize">{ascitesGrade}</div>
                <div className="col-span-3 text-right text-slate-400 leading-none">{ascRule.split("  ")[0]}</div>
                <div className="col-span-2 text-right font-bold font-mono text-blue-400">+{ascPoints}</div>
              </div>

              {/* Encephalopathy */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-slate-850/25">
                <div className="col-span-4 font-semibold text-slate-300">Encephalopathy</div>
                <div className="col-span-3 text-right text-slate-200">{hasConfusion ? "Present (Grade I-II)" : "Absent"}</div>
                <div className="col-span-3 text-right text-slate-400 leading-none">{encRule.split("  ")[0]}</div>
                <div className="col-span-2 text-right font-bold font-mono text-blue-400">+{encPoints}</div>
              </div>

              {/* Sum Score Row */}
              <div className="grid grid-cols-12 gap-1 px-3 py-2.5 items-center font-bold bg-slate-900/50">
                <div className="col-span-7 text-slate-200 uppercase tracking-wider text-[10px]">Total Child-Pugh Score</div>
                <div className="col-span-3 text-right text-slate-400 font-normal">Sum of components</div>
                <div className="col-span-2 text-right text-amber-400 font-mono text-xs">{cpTotal} Points</div>
              </div>
            </div>

            {/* Derived child class info */}
            <div className="bg-slate-850/50 p-3 rounded-lg text-[10px] border border-slate-800 space-y-1">
              <div className="flex justify-between font-bold text-slate-300">
                <span>Result Class: <span className="text-amber-400 uppercase">{cpClass}</span> ({cpTotal} pts)</span>
                <span className="text-slate-450 font-normal">Survival reference: {cpSurvival}</span>
              </div>
              <p className="text-[9px] text-slate-500 leading-tight">
                Class A: 5-6 points (well-compensated). Class B: 7-9 points (compromised functional reserve). Class C: 10-15 points (decompensated, high-mortality severity).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. MELD / MELD-NA AUDIT */}
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-slate-850/60 p-2.5 rounded-lg border border-slate-800">
          <span className="text-[11px] font-bold text-blue-350">2. MELD-Na mathematical breakdown</span>
          <span className="text-[10px] font-mono font-medium text-slate-400">Range: [6 - 40 Score]</span>
        </div>

        {!isMELDComplete ? (
          <div className="p-3 bg-amber-950/20 text-amber-300 border border-amber-900/30 rounded-lg text-[10px] italic">
            ⚠ Missing required laboratory values: Bilirubin, Creatinine, or INR. MELD computation requires all three fields.
          </div>
        ) : (
          <div className="space-y-3">
            {/* The math model explanation card */}
            <div className="bg-slate-950/40 p-3.5 rounded-lg text-[10px] font-mono border border-slate-800 space-y-2">
              <span className="text-yellow-400/90 font-bold block">Standard Clinical Formula:</span>
              <div className="text-slate-300 text-[9px] bg-slate-900 p-2 rounded border border-slate-800/60 overflow-x-auto whitespace-nowrap">
                MELD = 3.78 × ln(bilirubin) + 11.2 × ln(INR) + 9.57 × ln(creatinine) + 6.43
              </div>

              {/* Step-by-Step logs */}
              <div className="space-y-1.5 pt-1">
                <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider">Step 1: Clinical Range Adjustment (Capping Rules)</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[9px]">
                  <li>
                    Bilirubin <span className="text-blue-300">{rawBil}</span> mg/dl capped in [1.0, ∞]:{" "}
                    <span className="text-emerald-400 font-bold">{capBil}</span>
                  </li>
                  <li>
                    Creatinine <span className="text-blue-300">{rawCr}</span> mg/dl capped in [1.0, 4.0]:{" "}
                    <span className="text-emerald-400 font-bold">{capCr}</span>{" "}
                    {rawCr > 4.0 && "(Capped at 4.0 max)"}
                    {rawCr < 1.0 && "(Capped at 1.0 min as per clinical standards)"}
                  </li>
                  <li>
                    INR <span className="text-blue-300">{rawINR}</span> capped in [1.0, ∞]:{" "}
                    <span className="text-emerald-400 font-bold">{capINR}</span>
                  </li>
                  {sodium !== null && (
                    <li>
                      Renal Sodium <span className="text-blue-300">{rawNa}</span> mmol/l capped in [125, 137]:{" "}
                      <span className="text-emerald-400 font-bold">{capNa}</span>
                    </li>
                  )}
                </ul>

                <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider pt-1.5">Step 2: Natural Logarithm (ln) Term Calculation</span>
                <div className="space-y-1 text-[9px] text-slate-300 bg-slate-900 border border-slate-800/50 p-2 rounded">
                  <div className="flex justify-between">
                    <span>3.78 * ln({capBil}):</span>
                    <span className="font-bold text-slate-300">{logBilTerm.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>11.2 * ln({capINR}):</span>
                    <span className="font-bold text-slate-300">{logINRTerm.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>9.57 * ln({capCr}):</span>
                    <span className="font-bold text-slate-300">{logCrTerm.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Baseline Constant:</span>
                    <span>+0.6430</span>
                  </div>
                  <div className="border-t border-slate-800 my-1"></div>
                  <div className="flex justify-between font-bold text-amber-400">
                    <span>Dry UNOS MELD (Unrounded Sum):</span>
                    <span>{meldUnosRaw.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[8px]">
                    <span>Multiplied by 10 & Rounded:</span>
                    <span>Math.round({(meldUnosRaw * 10).toFixed(2)}) = {meldCalculated}</span>
                  </div>
                </div>

                <span className="text-slate-400 font-bold block text-[9px] uppercase tracking-wider pt-1.5">Step 3: MELD-Na Sodium Correction</span>
                {appliesNaAdjustment ? (
                  <div className="space-y-1.5 text-[9px] text-slate-300 bg-slate-900 border border-slate-800/50 p-2 rounded">
                    <span className="text-[9px] text-yellow-400 font-bold block">Standard UNOS/OPTN MELD-Na Equation:</span>
                    <div className="text-[8px] text-slate-400 font-mono bg-slate-950 p-1.5 rounded overflow-x-auto whitespace-nowrap">
                      MELD-Na = MELD - Na - [0.008 × (137 - Na) × (37 - MELD)] + 137
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-slate-300 text-[8px]">
                      <li>Uncorrected dry MELD score = <span className="font-bold">{meldCalculated}</span></li>
                      <li>Capped Sodium term (137 - Na) = 137 - {capNa} = <span className="font-bold">{137 - capNa}</span></li>
                      <li>Adjustment Term (0.008 × {137 - capNa} × (37 - {meldCalculated})) = <span className="font-bold">{(0.008 * (137 - capNa) * (37 - meldCalculated)).toFixed(3)}</span></li>
                    </ul>
                    <div className="border-t border-slate-800 my-1"></div>
                    <div className="flex justify-between text-amber-400 font-bold">
                      <span>Final Computed MELD-Na =</span>
                      <span>{finalMeldNa} Score</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-2 bg-slate-900 border border-slate-800 rounded text-slate-400 text-[9px] leading-relaxed">
                    ℹ {naAdjustmentExplanation || `MELD-Na matches Dry MELD score (${meldCalculated}) because Sodium adjustment only applies to dry MELD score > 11.`}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
