/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { PatientProfile } from "../types";
import { checkPatientEligibility } from "../utils";
import { formatComboDate } from "../utils/nepaliCalendar";
import ScoreDetails from "./ScoreDetails";
import { 
  Plus, 
  Search, 
  Database, 
  Edit, 
  Trash2, 
  Filter, 
  Eye, 
  Sparkles,
  ShieldAlert,
  GraduationCap,
  Printer,
  FileDown
} from "lucide-react";
import { downloadPdf } from "../utils";

interface CohortListProps {
  patients: PatientProfile[];
  onAddPatient: () => void;
  onEditPatient: (patient: PatientProfile) => void;
  onDeletePatient: (id: string) => void;
  onSeedMockData: () => void;
  userRole?: "admin" | "manager" | null;
}

export default function CohortList({ 
  patients, 
  onAddPatient, 
  onEditPatient, 
  onDeletePatient,
  onSeedMockData,
  userRole
}: CohortListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "Eligible" | "Excluded" | "HasVarices">("All");
  const [selectedDetailPatient, setSelectedDetailPatient] = useState<PatientProfile | null>(null);

  // Filtering options
  const filteredPatients = patients.filter(p => {
    const isEligible = checkPatientEligibility(p).isEligible;
    const hasVarices = p.endoscopy.esophagealVarices === "Present";

    const matchesFilter = 
      activeFilter === "All" ||
      (activeFilter === "Eligible" && isEligible) ||
      (activeFilter === "Excluded" && !isEligible) ||
      (activeFilter === "HasVarices" && hasVarices);

    const text = `${p.demographics.codeNo} ${p.demographics.name || ""}`.toLowerCase();
    const matchesSearch = text.includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6" id="cohort-list-container">
      {/* List Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Active Participant Cohort</h2>
          <p className="text-xs text-slate-500 font-light mt-0.5">Maintain, review, and modify enrolled patient Case Report Forms (CRFs) in real-time.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {patients.length === 0 && (
            <button
              id="seed-mock-btn"
              onClick={onSeedMockData}
              className="px-4.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/50 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-600 animate-pulse" />
              Seed Reference Trial Data (N=75)
            </button>
          )}
          <button
            id="register-btn"
            onClick={onAddPatient}
            className="px-4.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow shadow-blue-600/10 cursor-pointer"
          >
            <Plus size={14} />
            Add New Patient
          </button>
        </div>
      </div>

      {patients.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center py-16 px-4 space-y-4 max-w-2xl mx-auto">
          <div className="p-4 bg-slate-100 text-slate-400 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
            <Database size={26} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 font-sans uppercase tracking-wide">Registry is Empty</h3>
            <p className="text-xs text-slate-500 font-light mt-1 max-w-md mx-auto">
              There are currently no research participants registered. To evaluate statistical analysis and ROC curve modeling features, generate high-fidelity trial data by clicking the button below.
            </p>
          </div>
          <button
            onClick={onSeedMockData}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 shadow-md"
          >
            <Sparkles size={14} />
            Generate Reference Cohort Data (N=75)
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search, filters */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch justify-between bg-white rounded-xl p-3 border border-slate-100 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by CodeNo or Name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Filter segments */}
            <div className="flex overflow-x-auto gap-1 border border-slate-200/50 p-1 bg-slate-50 rounded-xl text-xs font-semibold whitespace-nowrap">
              {[
                { filter: "All", label: "All Cases" },
                { filter: "Eligible", label: "Eligible Only" },
                { filter: "Excluded", label: "Excluded Cases" },
                { filter: "HasVarices", label: "Varices Present" }
              ].map(opt => (
                <button
                  key={opt.filter}
                  onClick={() => setActiveFilter(opt.filter as any)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] transition-all cursor-pointer ${
                    activeFilter === opt.filter
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* List display */}
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-4 font-sans">Study ID / Demographics</th>
                    <th className="py-3.5 px-4">CLD Status</th>
                    <th className="py-3.5 px-4">Portal Vein (mm)</th>
                    <th className="py-3.5 px-4">Spleen Size (cm)</th>
                    <th className="py-3.5 px-4">Esophageal Varices</th>
                    <th className="py-3.5 px-4">Scores</th>
                    <th className="py-3.5 px-4">Screening</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPatients.map(p => {
                    const elig = checkPatientEligibility(p);
                    const isV = p.endoscopy.esophagealVarices === "Present";

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* ID */}
                        <td className="py-4 px-4 font-sans">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-800">{p.demographics.codeNo}</span>
                            {p.isDraft && (
                              <span className="px-1.5 py-0.5 bg-amber-150 text-amber-800 text-[8px] font-black uppercase tracking-wider rounded border border-amber-200">
                                Draft
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {p.demographics.age ? `${p.demographics.age} y/o` : "Age N/A"} {p.demographics.sex || "Sex N/A"} &middot; Hosp: {p.demographics.hospitalNumber || "N/A"}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <span className="font-semibold text-blue-600/80 uppercase">Date:</span> {formatComboDate(p.demographics.date)}
                          </div>
                        </td>

                        {/* CLD Status */}
                        <td className="py-4 px-4 text-slate-600 font-medium">
                          {p.cldHistory.durationValue} {p.cldHistory.durationUnit}
                        </td>

                        {/* PVD */}
                        <td className="py-4 px-4">
                          <span className={`font-mono font-bold px-2.5 py-1 rounded-lg text-xs ${
                            Number(p.ultrasound.portalVeinDiameter) > 13 
                              ? "bg-rose-50 text-rose-700 border border-rose-100" 
                              : "bg-slate-50 text-slate-700 border border-slate-100"
                          }`}>
                            {p.ultrasound.portalVeinDiameter} mm
                          </span>
                        </td>

                        {/* Spleen */}
                        <td className="py-4 px-4 text-slate-500 font-mono">
                          {p.ultrasound.splenicSize ? `${p.ultrasound.splenicSize} cm` : "N/A"}
                        </td>

                        {/* Varices */}
                        <td className="py-4 px-4">
                          {isV ? (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-red-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              {p.endoscopy.varicesGrade || "Present"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-semibold border border-emerald-100">
                              No Varices
                            </span>
                          )}
                        </td>

                        {/* Scores */}
                        <td className="py-4 px-4">
                          <div className="text-[10px] text-slate-600 font-medium">
                            Child: <span className="font-bold">{p.scores.childPughClass || "N/A"}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            MELD-Na: <span className="font-bold font-mono">{p.scores.meldNaScore ? p.scores.meldNaScore : "N/A"}</span>
                          </div>
                        </td>

                        {/* Screening Eligibility badge */}
                        <td className="py-4 px-4">
                          {elig.isEligible ? (
                            <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-100/50">
                              ELIGIBLE
                            </span>
                          ) : (
                            <span 
                              title={elig.reasons.join(", ")}
                              className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-100/50 inline-flex items-center gap-1 cursor-help"
                            >
                              <ShieldAlert size={10} />
                              EXCLUDED
                            </span>
                          )}
                        </td>

                        {/* Options */}
                        <td className="py-4 px-4 text-right whitespace-nowrap font-sans">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => setSelectedDetailPatient(p)}
                              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-105 transition-all cursor-pointer"
                              title="Audit calculations and view comprehensive CRF clinical details"
                            >
                              <Eye size={14} />
                            </button>
                            {userRole === "admin" ? (
                              <>
                                <button
                                  onClick={() => onEditPatient(p)}
                                  className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all cursor-pointer"
                                  title="Edit clinical record"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => onDeletePatient(p.id)}
                                  className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all cursor-pointer"
                                  title="Delete patient profile from registry"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="p-1.5 bg-slate-50 text-slate-300 rounded-lg cursor-not-allowed"
                                  title="Only Admin can modify clinical patient records"
                                  disabled
                                >
                                  <Edit size={14} className="opacity-40" />
                                </button>
                                <button
                                  className="p-1.5 bg-slate-50 text-slate-300 rounded-lg cursor-not-allowed"
                                  title="Only Admin can permanently delete records from cohort registry"
                                  disabled
                                >
                                  <Trash2 size={14} className="opacity-40" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredPatients.length === 0 && (
              <div className="text-center py-10 px-4 text-slate-400 italic font-light">
                No matching clinical cases found in active filtered segment.
              </div>
            )}
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 italic">
            <span>Showing {filteredPatients.length} of {patients.length} total enrolled cases</span>
            <span className="flex items-center gap-1 select-none">
              <GraduationCap size={12} />
              N=75 is the formal calculated sample size to fulfill trial objectives
            </span>
          </div>
        </div>
      )}

      {selectedDetailPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-y-auto border border-slate-100 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10 shrink-0">
              <div>
                <span className="font-bold text-slate-800 text-sm">
                  Clinical Case File: {selectedDetailPatient.demographics.codeNo} 
                  {selectedDetailPatient.isDraft && (
                    <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded border border-amber-200">
                      Draft
                    </span>
                  )}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Age: {selectedDetailPatient.demographics.age || "N/A"} y/o &middot; Sex: {selectedDetailPatient.demographics.sex || "N/A"} &middot; Hospital Number: {selectedDetailPatient.demographics.hospitalNumber || "N/A"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print min-h-[44px] px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer z-50 pointer-events-auto"
                >
                  <Printer size={12} />
                  Print Case
                </button>
                <button
                  type="button"
                  onClick={() => downloadPdf("patient-audit-container", `PatientAudit-${selectedDetailPatient.demographics.codeNo}`)}
                  className="no-print min-h-[44px] px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer z-50 pointer-events-auto"
                >
                  <FileDown size={12} />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDetailPatient(null)}
                  className="min-h-[44px] px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer z-50 pointer-events-auto"
                >
                  Close Audit Page
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div id="patient-audit-container" className="p-6 space-y-6 overflow-y-auto">
              
              {/* Demographics & Clinical Profile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Section A: Demographics */}
                <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 space-y-2.5">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-250 pb-1">1. Demographics</h4>
                  <ul className="space-y-1 text-[11px] text-slate-600">
                    <li><strong className="text-slate-800 font-semibold font-sans">Age/Sex/Religion:</strong> {selectedDetailPatient.demographics.age ? `${selectedDetailPatient.demographics.age} y/o` : "N/A"} {selectedDetailPatient.demographics.sex || "N/A"} ({selectedDetailPatient.demographics.religion || "N/A"})</li>
                    <li><strong className="text-slate-800 font-semibold font-sans">Occupation:</strong> {selectedDetailPatient.demographics.occupation || "N/A"}</li>
                    <li><strong className="text-slate-800 font-semibold font-sans">Nepal District:</strong> {selectedDetailPatient.demographics.address || "N/A"}</li>
                    <li><strong className="text-slate-800 font-semibold font-sans">Contact No:</strong> {selectedDetailPatient.demographics.contactNumber || "N/A"}</li>
                    <li><strong className="text-slate-800 font-semibold font-sans">Assigned Date:</strong> {formatComboDate(selectedDetailPatient.demographics.date)}</li>
                  </ul>
                </div>

                {/* Section B: Clinical history */}
                <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 space-y-2.5">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-250 pb-1">2. History & Etiology</h4>
                  <ul className="space-y-1 text-[11px] text-slate-600 font-sans">
                    <li>
                      <strong className="text-slate-800 font-semibold font-sans">Etiology of CLD:</strong>{" "}
                      {(() => {
                        const et = selectedDetailPatient.cldHistory.etiology;
                        if (!et) return "N/A";
                        if (typeof et === "string") return et;
                        const parts = [];
                        if (et.alcohol) parts.push("Alcohol");
                        if (et.hbvHcv) parts.push("Viral (HBV/HCV)");
                        if (et.nash) parts.push("NASH/NAFLD");
                        if (et.autoimmune) parts.push("Autoimmune");
                        if (et.others) parts.push(et.othersText || "Other");
                        return parts.length > 0 ? parts.join(", ") : "None";
                      })()}
                    </li>
                    <li>
                      <strong className="text-slate-800 font-semibold font-sans">CLD Duration:</strong>{" "}
                      {selectedDetailPatient.cldHistory.durationValue ? `${selectedDetailPatient.cldHistory.durationValue} ${selectedDetailPatient.cldHistory.durationUnit}` : "N/A"}
                    </li>
                    <li>
                      <strong className="text-slate-800 font-semibold font-sans">Alcohol Consumer:</strong>{" "}
                      {selectedDetailPatient.cldHistory.personalHistory?.isAlcoholConsumer || "No"} 
                      {selectedDetailPatient.cldHistory.personalHistory?.isAlcoholConsumer === "Yes" && 
                        selectedDetailPatient.cldHistory.personalHistory?.alcoholGramsPerDay && 
                        ` (${selectedDetailPatient.cldHistory.personalHistory.alcoholGramsPerDay} g/day)`
                      }
                    </li>
                    <li>
                      <strong className="text-slate-800 font-semibold font-sans">Comorbidities:</strong>{" "}
                      {(() => {
                        const cb = selectedDetailPatient.cldHistory.comorbidities;
                        if (!cb) return "None";
                        const list = [];
                        if (cb.diabetes) list.push("Diabetes");
                        if (cb.hypertension) list.push("HTN");
                        if (cb.ckd) list.push("CKD");
                        if (cb.cad) list.push("CAD");
                        if (cb.copd) list.push("COPD");
                        if (cb.thyroid) list.push("Thyroid");
                        if (cb.others) list.push(cb.othersText || "Other");
                        return list.length > 0 ? list.join(", ") : "None";
                      })()}
                    </li>
                  </ul>
                </div>

                {/* Section C: Presenting complaints */}
                <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-100 space-y-2.5">
                  <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-250 pb-1">3. Complaints & Exam</h4>
                  <ul className="space-y-1 text-[11px] text-slate-600 font-sans">
                    <li><strong className="text-slate-800 font-semibold font-sans">Complaints:</strong> {[
                      selectedDetailPatient.complaints.abdominalDistension ? "Distension" : null,
                      selectedDetailPatient.complaints.jaundice ? "Jaundice" : null,
                      selectedDetailPatient.complaints.hematemesisMelena ? "Hematemesis/Melena" : null,
                      selectedDetailPatient.complaints.confusion ? "HE/Confusion" : null,
                    ].filter(Boolean).join(", ") || "None"}</li>
                    <li><strong className="text-slate-800 font-semibold font-sans">Ascites Grade:</strong> {selectedDetailPatient.examination.abdomen.ascitesGrade}</li>
                    <li><strong className="text-slate-800 font-semibold font-sans">Splenomegaly:</strong> {selectedDetailPatient.examination.abdomen.splenomegaly ? "Present" : "Absent"}</li>
                  </ul>
                </div>
              </div>

              {/* Lab panel details */}
              <div className="bg-slate-50/30 p-4 rounded-xl border border-slate-150 grid grid-cols-1 md:grid-cols-3 gap-6 text-[11px]">
                <div>
                  <h5 className="font-bold text-slate-700 uppercase border-b border-slate-200 pb-1 mb-2">Hematology Findings</h5>
                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between"><span>Hemoglobin:</span> <strong className="font-mono text-slate-800">{selectedDetailPatient.investigations.hematology.hb || "N/A"} g/dl</strong></div>
                    <div className="flex justify-between"><span>Total Count (TC):</span> <strong className="font-mono text-slate-800">{selectedDetailPatient.investigations.hematology.tc || "N/A"} /mm³</strong></div>
                    <div className="flex justify-between"><span>Platelets:</span> <strong className="font-mono text-slate-800">{selectedDetailPatient.investigations.hematology.platelet || "N/A"} /mm³</strong></div>
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-slate-700 uppercase border-b border-slate-200 pb-1 mb-2">Biochemistry & Renal</h5>
                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between"><span>Serum Urea:</span> <strong className="font-mono text-slate-800">{selectedDetailPatient.investigations.renal.urea || "N/A"} mg/dl</strong></div>
                    <div className="flex justify-between"><span>Serum Creatinine:</span> <strong className="font-mono text-slate-800">{selectedDetailPatient.investigations.renal.creatinine || "N/A"} mg/dl</strong></div>
                    <div className="flex justify-between"><span>Sodium (Na+):</span> <strong className="font-mono text-slate-800">{selectedDetailPatient.investigations.renal.sodium || "N/A"} mmol/l</strong></div>
                    <div className="flex justify-between"><span>Potassium (K+):</span> <strong className="font-mono text-slate-800">{selectedDetailPatient.investigations.renal.potassium || "N/A"} mmol/l</strong></div>
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-slate-700 uppercase border-b border-slate-200 pb-1 mb-2">LFT & Viral Status</h5>
                  <div className="space-y-1 text-slate-600">
                    <div className="flex justify-between"><span>Total Bilirubin:</span> <strong className="font-mono text-slate-800">{selectedDetailPatient.investigations.lft.totalBilirubin || "N/A"} mg/dl</strong></div>
                    <div className="flex justify-between"><span>Serum Albumin:</span> <strong className="font-mono text-slate-800">{selectedDetailPatient.investigations.lft.albumin || "N/A"} g/dl</strong></div>
                    <div className="flex justify-between"><span>INR:</span> <strong className="font-mono text-slate-800">{selectedDetailPatient.investigations.lft.inr || "N/A"}</strong></div>
                    <div className="flex justify-between"><span>Stool OBT Status:</span> <strong className="font-mono text-slate-800">{selectedDetailPatient.investigations.stoolOBT || "Not Recorded"}</strong></div>
                  </div>
                </div>
              </div>

              {/* Calculation audit details component */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <ScoreDetails
                  bilirubin={typeof selectedDetailPatient.investigations.lft.totalBilirubin === "number" ? selectedDetailPatient.investigations.lft.totalBilirubin : null}
                  albumin={typeof selectedDetailPatient.investigations.lft.albumin === "number" ? selectedDetailPatient.investigations.lft.albumin : null}
                  inr={typeof selectedDetailPatient.investigations.lft.inr === "number" ? selectedDetailPatient.investigations.lft.inr : null}
                  creatinine={typeof selectedDetailPatient.investigations.renal.creatinine === "number" ? selectedDetailPatient.investigations.renal.creatinine : null}
                  sodium={typeof selectedDetailPatient.investigations.renal.sodium === "number" ? selectedDetailPatient.investigations.renal.sodium : null}
                  ascitesGrade={selectedDetailPatient.examination.abdomen.ascitesGrade}
                  hasConfusion={!!selectedDetailPatient.complaints.confusion}
                />
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
