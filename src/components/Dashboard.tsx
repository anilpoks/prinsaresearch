/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from "react";
import { PatientProfile, AnalyticsData } from "../types";
import { checkPatientEligibility, convertRegistryToCSV } from "../utils";
import { 
  Users, 
  Activity, 
  ShieldAlert, 
  Download, 
  Upload, 
  TrendingUp, 
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  Stethoscope,
  ChevronRight
} from "lucide-react";

interface DashboardProps {
  patients: PatientProfile[];
  analytics: AnalyticsData;
  onNavigateToCRF: () => void;
  onNavigateToAnalysis: () => void;
  onImportJSON: (imported: PatientProfile[]) => void;
}

export default function Dashboard({ 
  patients, 
  analytics, 
  onNavigateToCRF, 
  onNavigateToAnalysis,
  onImportJSON 
}: DashboardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const eligibleCount = patients.filter(p => checkPatientEligibility(p).isEligible).length;
  const excludedCount = patients.length - eligibleCount;

  // Handle Export to CSV
  const handleExportCSV = () => {
    try {
      const csvContent = convertRegistryToCSV(patients);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `CLD_Portal_Vein_Registry_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert("Failed to export: " + (e as Error).message);
    }
  };

  // Handle Export to JSON
  const handleExportJSON = () => {
    try {
      const jsonContent = JSON.stringify(patients, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `CLD_Portal_Vein_Registry_${new Date().toISOString().substring(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert("Failed to export JSON: " + (e as Error).message);
    }
  };

  // Handle Import from JSON
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          onImportJSON(data);
          alert(`Successfully imported ${data.length} patient records!`);
        } else {
          alert("Invalid file format. Expected a JSON array of patient profiles.");
        }
      } catch (err) {
        alert("Error parsing file: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8" id="dashboard-tab">
      {/* Research Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-slate-800">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-6">
          <Stethoscope size={280} className="text-white" />
        </div>
        <div className="max-w-3xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/25 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold border border-blue-400/20 uppercase tracking-widest">
            KMC IRB Approved Protocol
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-sans tracking-tight leading-tight">
            Study of Portal Vein Diameter & its Association with Oesophageal Varices in Chronic Liver Disease Patients
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-light">
            This digital Case Report Form (CRF) and Diagnostic Registry facilitates live enrollment, automated calculation of disease severity scores (Child-Pugh, MELD-Na), and instant clinical research statistical validation (independent t-test and ROC Curves).
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              id="hero-enroll-btn"
              onClick={onNavigateToCRF}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-all text-sm flex items-center gap-2 shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
            >
              Enroll New Patient
              <ChevronRight size={16} />
            </button>
            <button
              id="hero-analyze-btn"
              onClick={onNavigateToAnalysis}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-xl font-medium transition-all text-sm flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              View Research Analysis
              <TrendingUp size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Enrolled */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/60 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 font-sans uppercase tracking-wider">Total Enrolled</p>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{analytics.totalPatients}</h3>
            <p className="text-[10px] text-slate-500 font-mono">Registry Records</p>
          </div>
        </div>

        {/* Varices Present */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-slate-200 transition-all">
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl">
            <Activity size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 font-sans uppercase tracking-wider">Varices Present</p>
            <h3 className="text-2xl font-bold text-rose-600 tracking-tight">{analytics.patientsWithVarices}</h3>
            <p className="text-[10px] text-rose-500 font-medium">
              {analytics.totalPatients > 0 
                ? `${Math.round((analytics.patientsWithVarices / analytics.totalPatients) * 100)}% Prevalence`
                : "0% Prevalence"}
            </p>
          </div>
        </div>

        {/* Varices Absent */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-slate-200 transition-all">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 font-sans uppercase tracking-wider">Varices Absent</p>
            <h3 className="text-2xl font-bold text-emerald-600 tracking-tight">{analytics.patientsWithoutVarices}</h3>
            <p className="text-[10px] text-emerald-500 font-medium">
              {analytics.totalPatients > 0 
                ? `${Math.round((analytics.patientsWithoutVarices / analytics.totalPatients) * 100)}% of cohort`
                : "0% of cohort"}
            </p>
          </div>
        </div>

        {/* Portal Vein Mean */}
        <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm flex items-center gap-4 hover:border-slate-200 transition-all">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl">
            <TrendingUp size={22} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 font-sans uppercase tracking-wider">Mean Portal Vein</p>
            <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
              {analytics.meanPortalVeinDiameter > 0 ? `${analytics.meanPortalVeinDiameter} mm` : "N/A"}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">Spleen Size: {analytics.meanSpleenSize > 0 ? `${analytics.meanSpleenSize} cm` : "N/A"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Child-Pugh Score Distribution Card */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight mb-1">Child-Pugh Classification Distribution</h3>
            <p className="text-xs text-slate-500 mb-6">Patient classification breakdown for Chronic Liver Disease (CLD) severity</p>
            
            <div className="space-y-5">
              {/* Class A */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-emerald-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    Child A (Mild compensated, score 5-6)
                  </span>
                  <span className="text-slate-600">
                    {analytics.childPughDistribution.classA} patients (
                    {analytics.totalPatients > 0 
                      ? Math.round((analytics.childPughDistribution.classA / analytics.totalPatients) * 100) 
                      : 0}%)
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-550" 
                    style={{ width: `${analytics.totalPatients > 0 ? (analytics.childPughDistribution.classA / analytics.totalPatients) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Class B */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-amber-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    Child B (Moderate decompensated, score 7-9)
                  </span>
                  <span className="text-slate-600">
                    {analytics.childPughDistribution.classB} patients (
                    {analytics.totalPatients > 0 
                      ? Math.round((analytics.childPughDistribution.classB / analytics.totalPatients) * 100) 
                      : 0}%)
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full transition-all duration-550" 
                    style={{ width: `${analytics.totalPatients > 0 ? (analytics.childPughDistribution.classB / analytics.totalPatients) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Class C */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-rose-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                    Child C (Severe decompensated, score 10-15)
                  </span>
                  <span className="text-slate-600">
                    {analytics.childPughDistribution.classC} patients (
                    {analytics.totalPatients > 0 
                      ? Math.round((analytics.childPughDistribution.classC / analytics.totalPatients) * 100) 
                      : 0}%)
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-rose-500 rounded-full transition-all duration-550" 
                    style={{ width: `${analytics.totalPatients > 0 ? (analytics.childPughDistribution.classC / analytics.totalPatients) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 rounded-xl gap-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">
                MELD Info
              </span>
              <p className="text-xs text-slate-600">
                Child Class helps classify early vs later stage cirrhosis in combination with MELD-Na scoring.
              </p>
            </div>
            <button
              onClick={onNavigateToAnalysis} 
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 whitespace-nowrap"
            >
              Examine severity t-tests &rarr;
            </button>
          </div>
        </div>

        {/* Database Exporter & Importer Panel */}
        <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 tracking-tight mb-1">Registry Actions</h3>
            <p className="text-xs text-slate-500 mb-6 font-light">Export statistical datasets for analysis inside SPSS, Excel, or backup the database.</p>

            <div className="space-y-3">
              {/* SPSS/Excel Export */}
              <button
                id="export-csv-btn"
                onClick={handleExportCSV}
                className="w-full p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-left flex items-center gap-3 text-blue-900 group hover:bg-blue-100 hover:border-blue-200 transition-all cursor-pointer"
              >
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-sans">Export SPSS (CSV format)</h4>
                  <p className="text-[10px] text-blue-600/80">CSV with structured, numerical header values ready for direct import</p>
                </div>
              </button>

              {/* Export Backup JSON */}
              <button
                id="export-json-btn"
                onClick={handleExportJSON}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-left flex items-center gap-3 text-slate-800 group hover:bg-slate-100 hover:border-slate-200 transition-all cursor-pointer"
              >
                <div className="p-2 bg-slate-600 text-white rounded-lg group-hover:bg-slate-700 transition-all">
                  <Download size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-sans">Backup Registry JSON</h4>
                  <p className="text-[10px] text-slate-500">Backup complete patient structure for sharing or offline preservation</p>
                </div>
              </button>

              {/* Import JSON */}
              <button
                id="import-json-btn"
                onClick={handleImportClick}
                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-left flex items-center gap-3 text-slate-800 group hover:bg-slate-100 hover:border-slate-200 transition-all cursor-pointer"
              >
                <div className="p-2 bg-slate-200 text-slate-600 rounded-lg group-hover:text-slate-800 transition-all">
                  <Upload size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-sans">Import Records JSON</h4>
                  <p className="text-[10px] text-slate-500">Restore or import clinical dataset files (.json)</p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5 mt-6">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Eligibility Check</h4>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-lg font-bold text-emerald-700">{eligibleCount}</p>
                <p className="text-[10px] text-emerald-600 font-sans uppercase font-medium">Eligible Cohort</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-lg font-bold text-amber-700">{excludedCount}</p>
                <p className="text-[10px] text-amber-600 font-sans uppercase font-medium">Excluded Cohort</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center leading-relaxed font-light">
              Descriptive and ROC analyzer automatically isolates patients matching full exclusion criteria to preserve trial validity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
