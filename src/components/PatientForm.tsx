/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { PatientProfile, DemographicData, CLDHistoryData, PresentingComplaints, ClinicalExamData, InvestigationsData, UltrasoundData, EndoscopyData } from "../types";
import { calculateChildPughScore, calculateMeldNa, checkPatientEligibility } from "../utils";
import { 
  convertADToBS, 
  convertBSToAD, 
  NEPALI_MONTHS, 
  getDaysInBSMonth 
} from "../utils/nepaliCalendar";
import { NEPAL_DISTRICTS } from "../utils/nepalDistricts";
import ScoreDetails from "./ScoreDetails";
import { 
  Save, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ClipboardList, 
  History, 
  UserPlus, 
  Binary, 
  ShieldAlert, 
  Calculator,
  User,
  HeartPulse,
  Award,
  Stethoscope,
  Eye,
  Printer,
  FileDown
} from "lucide-react";
import { downloadPdf } from "../utils";

interface PatientFormProps {
  initialPatient?: PatientProfile | null;
  onSave: (patient: PatientProfile) => void;
  onCancel: () => void;
  allExistingPatients: PatientProfile[];
}

export default function PatientForm({ 
  initialPatient, 
  onSave, 
  onCancel,
  allExistingPatients 
}: PatientFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const [detectedDraft, setDetectedDraft] = useState<any>(null);
  const [showScoreAudit, setShowScoreAudit] = useState(false);

  // Helper to generate a new autoincremented Study ID (Code No) like KMC-PVD-001
  const generateNewCodeNo = (): string => {
    const existingIds = allExistingPatients
      .map(p => p.demographics.codeNo)
      .filter(id => id.startsWith("KMC-PVD-"));
    if (existingIds.length === 0) return "KMC-PVD-001";
    
    const numericParts = existingIds.map(id => {
      const parts = id.split("-");
      const numStr = parts[parts.length - 1];
      const parsed = parseInt(numStr, 10);
      return isNaN(parsed) ? 0 : parsed;
    });
    
    const maxNumber = Math.max(...numericParts, 0);
    return `KMC-PVD-${String(maxNumber + 1).padStart(3, "0")}`;
  };

  // State slices
  const [demographics, setDemographics] = useState<DemographicData>({
    codeNo: initialPatient?.demographics.codeNo || generateNewCodeNo(),
    date: initialPatient?.demographics.date || new Date().toISOString().substring(0, 10),
    hospitalNumber: initialPatient?.demographics.hospitalNumber || "",
    name: initialPatient?.demographics.name || "",
    age: initialPatient?.demographics.age || "",
    sex: initialPatient?.demographics.sex || "",
    religion: initialPatient?.demographics.religion || "",
    address: initialPatient?.demographics.address || "",
    occupation: initialPatient?.demographics.occupation || "",
  });

  // Derive BS Date components from demographics.date for dual-calendar reactivity
  const derivedBSStr = convertADToBS(demographics.date);
  let currentBSYear = 2083; // default fallback (which is 2026 AD)
  let currentBSMonthIndex = 2; // Ashadh (index 2)
  let currentBSDay = 15;

  if (derivedBSStr) {
    const [y, m, d] = derivedBSStr.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      currentBSYear = y;
      currentBSMonthIndex = m - 1; // 0-indexed
      currentBSDay = d;
    }
  }

  const bsMaxDays = getDaysInBSMonth(currentBSYear, currentBSMonthIndex);

  const [cldHistory, setCldHistory] = useState<CLDHistoryData>({
    durationValue: initialPatient?.cldHistory.durationValue || "",
    durationUnit: initialPatient?.cldHistory.durationUnit || "Months",
    etiology: {
      alcohol: initialPatient?.cldHistory.etiology.alcohol || false,
      hbvHcv: initialPatient?.cldHistory.etiology.hbvHcv || false,
      nash: initialPatient?.cldHistory.etiology.nash || false,
      autoimmune: initialPatient?.cldHistory.etiology.autoimmune || false,
      others: initialPatient?.cldHistory.etiology.others || false,
      othersText: initialPatient?.cldHistory.etiology.othersText || "",
    },
    drugHistory: {
      diuretics: initialPatient?.cldHistory.drugHistory.diuretics || false,
      nsaids: initialPatient?.cldHistory.drugHistory.nsaids || false,
      betaBlockers: initialPatient?.cldHistory.drugHistory.betaBlockers || false,
      nitrates: initialPatient?.cldHistory.drugHistory.nitrates || false,
      others: initialPatient?.cldHistory.drugHistory.others || false,
      othersText: initialPatient?.cldHistory.drugHistory.othersText || "",
    },
    comorbidities: {
      diabetes: initialPatient?.cldHistory.comorbidities.diabetes || false,
      hypertension: initialPatient?.cldHistory.comorbidities.hypertension || false,
      ckd: initialPatient?.cldHistory.comorbidities.ckd || false,
      cad: initialPatient?.cldHistory.comorbidities.cad || false,
      copd: initialPatient?.cldHistory.comorbidities.copd || false,
      thyroid: initialPatient?.cldHistory.comorbidities.thyroid || false,
      others: initialPatient?.cldHistory.comorbidities.others || false,
      othersText: initialPatient?.cldHistory.comorbidities.othersText || "",
    },
    personalHistory: {
      isAlcoholConsumer: initialPatient?.cldHistory.personalHistory.isAlcoholConsumer || "",
      alcoholGramsPerDay: initialPatient?.cldHistory.personalHistory.alcoholGramsPerDay || "",
      ivDrugAbuse: initialPatient?.cldHistory.personalHistory.ivDrugAbuse || "",
      sexualPromiscuity: initialPatient?.cldHistory.personalHistory.sexualPromiscuity || "",
      familyHistoryCLD: initialPatient?.cldHistory.personalHistory.familyHistoryCLD || "",
    },
  });

  const [complaints, setComplaints] = useState<PresentingComplaints>({
    jaundice: initialPatient?.complaints.jaundice || false,
    ascites: initialPatient?.complaints.ascites || false,
    abdominalPain: initialPatient?.complaints.abdominalPain || false,
    difficultyBreathing: initialPatient?.complaints.difficultyBreathing || false,
    hematemesis: initialPatient?.complaints.hematemesis || false,
    melena: initialPatient?.complaints.melena || false,
    lossOfConsciousness: initialPatient?.complaints.lossOfConsciousness || false,
    confusion: initialPatient?.complaints.confusion || false,
    oliguria: initialPatient?.complaints.oliguria || false,
    others: initialPatient?.complaints.others || false,
    othersText: initialPatient?.complaints.othersText || "",
  });

  const [examination, setExamination] = useState<ClinicalExamData>({
    general: {
      height: initialPatient?.examination.general.height || "",
      weight: initialPatient?.examination.general.weight || "",
      bmi: initialPatient?.examination.general.bmi || "",
      pallor: initialPatient?.examination.general.pallor || false,
      icterus: initialPatient?.examination.general.icterus || false,
      clubbing: initialPatient?.examination.general.clubbing || false,
      pedalEdema: initialPatient?.examination.general.pedalEdema || false,
      conscious: initialPatient?.examination.general.conscious ?? true,
      oriented: initialPatient?.examination.general.oriented ?? true,
      gcs: initialPatient?.examination.general.gcs || 15,
      flappingTremor: initialPatient?.examination.general.flappingTremor || false,
    },
    stigmata: {
      whiteNails: initialPatient?.examination.stigmata.whiteNails || false,
      palmarErythema: initialPatient?.examination.stigmata.palmarErythema || false,
      duputyrenContracture: initialPatient?.examination.stigmata.duputyrenContracture || false,
      hairLoss: initialPatient?.examination.stigmata.hairLoss || false,
      parotidEnlargement: initialPatient?.examination.stigmata.parotidEnlargement || false,
      spiderNevi: initialPatient?.examination.stigmata.spiderNevi || false,
      gynaecomastia: initialPatient?.examination.stigmata.gynaecomastia || false,
      testicularAtrophy: initialPatient?.examination.stigmata.testicularAtrophy || false,
    },
    vitals: {
      bpSystolic: initialPatient?.examination.vitals.bpSystolic || "",
      bpDiastolic: initialPatient?.examination.vitals.bpDiastolic || "",
      pulse: initialPatient?.examination.vitals.pulse || "",
      rr: initialPatient?.examination.vitals.rr || "",
      spo2: initialPatient?.examination.vitals.spo2 || "",
      temperature: initialPatient?.examination.vitals.temperature || "",
    },
    abdomen: {
      ascitesGrade: initialPatient?.examination.abdomen.ascitesGrade || "None",
      liverPalpable: initialPatient?.examination.abdomen.liverPalpable || false,
      liverSize: initialPatient?.examination.abdomen.liverSize || "",
      splenomegaly: initialPatient?.examination.abdomen.splenomegaly || false,
      dilatedVeins: initialPatient?.examination.abdomen.dilatedVeins || false,
      perRectalExamInfo: initialPatient?.examination.abdomen.perRectalExamInfo || "",
    },
  });

  const [investigations, setInvestigations] = useState<InvestigationsData>({
    hematology: {
      hb: initialPatient?.investigations.hematology.hb || "",
      tc: initialPatient?.investigations.hematology.tc || "",
      dcNeutrophils: initialPatient?.investigations.hematology.dcNeutrophils || "",
      dcLymphocytes: initialPatient?.investigations.hematology.dcLymphocytes || "",
      platelet: initialPatient?.investigations.hematology.platelet || "",
      rbcCount: initialPatient?.investigations.hematology.rbcCount || "",
    },
    renal: {
      urea: initialPatient?.investigations.renal.urea || "",
      creatinine: initialPatient?.investigations.renal.creatinine || "",
      sodium: initialPatient?.investigations.renal.sodium || "",
      potassium: initialPatient?.investigations.renal.potassium || "",
      rbs: initialPatient?.investigations.renal.rbs || "",
    },
    lft: {
      totalBilirubin: initialPatient?.investigations.lft.totalBilirubin || "",
      directBilirubin: initialPatient?.investigations.lft.directBilirubin || "",
      sgotAST: initialPatient?.investigations.lft.sgotAST || "",
      sgptALT: initialPatient?.investigations.lft.sgptALT || "",
      alp: initialPatient?.investigations.lft.alp || "",
      ggt: initialPatient?.investigations.lft.ggt || "",
      albumin: initialPatient?.investigations.lft.albumin || "",
      totalProtein: initialPatient?.investigations.lft.totalProtein || "",
      ptSeconds: initialPatient?.investigations.lft.ptSeconds || "",
      inr: initialPatient?.investigations.lft.inr || "",
    },
    viralMarkers: {
      hbsAg: initialPatient?.investigations.viralMarkers.hbsAg || "",
      antiHCV: initialPatient?.investigations.viralMarkers.antiHCV || "",
      hiv12: initialPatient?.investigations.viralMarkers.hiv12 || "",
    },
    stoolOBT: initialPatient?.investigations.stoolOBT || "",
  });

  const [ultrasound, setUltrasound] = useState<UltrasoundData>({
    liverSize: initialPatient?.ultrasound.liverSize || "",
    echotextureOfLiver: initialPatient?.ultrasound.echotextureOfLiver || "",
    echotextureOtherText: initialPatient?.ultrasound.echotextureOtherText || "",
    portalVeinDiameter: initialPatient?.ultrasound.portalVeinDiameter || "",
    splenicSize: initialPatient?.ultrasound.splenicSize || "",
    ascites: initialPatient?.ultrasound.ascites || "None",
    portalVeinFlowDirection: initialPatient?.ultrasound.portalVeinFlowDirection || "",
  });

  const [endoscopy, setEndoscopy] = useState<EndoscopyData>({
    esophagealVarices: initialPatient?.endoscopy.esophagealVarices || "",
    varicesGrade: initialPatient?.endoscopy.varicesGrade || "",
    gastricVarices: initialPatient?.endoscopy.gastricVarices || false,
    portalHypertensiveGastropathy: initialPatient?.endoscopy.portalHypertensiveGastropathy || false,
    additionalFindings: initialPatient?.endoscopy.additionalFindings || "",
  });

  // Calculate real-time BMI and update
  useEffect(() => {
    const h = Number(examination.general.height);
    const w = Number(examination.general.weight);
    if (h > 0 && w > 0) {
      const heightInMeters = h / 100;
      const calculatedBmi = Math.round((w / (heightInMeters * heightInMeters)) * 10) / 10;
      if (examination.general.bmi !== calculatedBmi) {
        setExamination(prev => ({
          ...prev,
          general: { ...prev.general, bmi: calculatedBmi }
        }));
      }
    }
  }, [examination.general.height, examination.general.weight]);

  // Load autosaved working draft if it is a new participant enrollment
  useEffect(() => {
    if (!initialPatient) {
      const stored = localStorage.getItem("cld_registry_form_working_draft");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.demographics) {
            setDetectedDraft(parsed);
          }
        } catch (e) {
          console.error("Failed to parse working draft", e);
        }
      }
    }
  }, [initialPatient]);

  const stateRef = useRef({
    demographics,
    cldHistory,
    complaints,
    examination,
    investigations,
    ultrasound,
    endoscopy
  });

  useEffect(() => {
    stateRef.current = {
      demographics,
      cldHistory,
      complaints,
      examination,
      investigations,
      ultrasound,
      endoscopy
    };
  }, [demographics, cldHistory, complaints, examination, investigations, ultrasound, endoscopy]);

  // Periodic Auto-Save Form Draft to localStorage every 30 seconds
  useEffect(() => {
    if (initialPatient) return;

    const intervalId = setInterval(() => {
      localStorage.setItem("cld_registry_form_working_draft", JSON.stringify(stateRef.current));
    }, 30000);

    return () => clearInterval(intervalId);
  }, [initialPatient]);

  // Compute live scores
  const getComputedScores = () => {
    const bilirubin = typeof investigations.lft.totalBilirubin === "number" ? investigations.lft.totalBilirubin : null;
    const albumin = typeof investigations.lft.albumin === "number" ? investigations.lft.albumin : null;
    const inr = typeof investigations.lft.inr === "number" ? investigations.lft.inr : null;
    const sodium = typeof investigations.renal.sodium === "number" ? investigations.renal.sodium : null;
    const creatinine = typeof investigations.renal.creatinine === "number" ? investigations.renal.creatinine : null;

    const ascGrade = examination.abdomen.ascitesGrade;
    const encephalopathyGrade = complaints.confusion ? "Grade I-II" : "None";

    const cp = calculateChildPughScore(bilirubin, albumin, inr, ascGrade, encephalopathyGrade);
    const meld = calculateMeldNa(bilirubin, creatinine, inr, sodium);

    return {
      childPughPoints: (bilirubin !== null && albumin !== null && inr !== null) ? cp.score : null,
      childPughClass: (bilirubin !== null && albumin !== null && inr !== null) ? cp.class : null,
      meldNaScore: (bilirubin !== null && creatinine !== null && inr !== null) ? meld.meldNa : null,
      calculatedAt: new Date().toISOString().substring(0, 10),
      cpBreakdown: cp.breakdown,
      meldExplanation: meld.explanation
    };
  };

  const computedScores = getComputedScores();

  // Unified eligibility result based on transient draft values
  const draftPatientForEligibility = {
    demographics,
    cldHistory,
    complaints,
    examination,
    investigations,
    ultrasound,
    endoscopy,
    scores: {
      childPughPoints: computedScores.childPughPoints,
      childPughClass: computedScores.childPughClass,
      meldNaScore: computedScores.meldNaScore,
      calculatedAt: computedScores.calculatedAt,
    }
  };
  const eligibility = checkPatientEligibility(draftPatientForEligibility);

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validation
    if (!demographics.hospitalNumber) {
      alert("Please specify a Hospital Number.");
      setCurrentStep(1);
      return;
    }
    if (demographics.age === "" || Number(demographics.age) <= 0) {
      alert("Please specify a valid Age.");
      setCurrentStep(1);
      return;
    }
    if (!demographics.sex) {
      alert("Please specify Patient Sex.");
      setCurrentStep(1);
      return;
    }
    if (ultrasound.portalVeinDiameter === "" || Number(ultrasound.portalVeinDiameter) <= 0) {
      alert("Please enter a Portal Vein Diameter (mm).");
      setCurrentStep(5); // Move to Ultrasound step
      return;
    }

    const compiledProfile: PatientProfile = {
      id: initialPatient?.id || `pat-${Math.random().toString(36).substr(2, 9)}`,
      isDraft: false,
      demographics,
      cldHistory,
      complaints,
      examination,
      investigations,
      ultrasound,
      endoscopy,
      scores: {
        childPughPoints: computedScores.childPughPoints,
        childPughClass: computedScores.childPughClass,
        meldNaScore: computedScores.meldNaScore,
        calculatedAt: computedScores.calculatedAt,
      },
      createdAt: initialPatient?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Remove client side temp draft cache
    localStorage.removeItem("cld_registry_form_working_draft");
    onSave(compiledProfile);
  };

  const handleSaveDraft = () => {
    const hospNum = demographics.hospitalNumber.trim() || `Draft-${demographics.codeNo}`;

    const compiledProfile: PatientProfile = {
      id: initialPatient?.id || `pat-${Math.random().toString(36).substr(2, 9)}`,
      isDraft: true,
      demographics: {
        ...demographics,
        hospitalNumber: hospNum,
      },
      cldHistory,
      complaints,
      examination,
      investigations,
      ultrasound,
      endoscopy,
      scores: {
        childPughPoints: computedScores.childPughPoints,
        childPughClass: computedScores.childPughClass,
        meldNaScore: computedScores.meldNaScore,
        calculatedAt: computedScores.calculatedAt,
      },
      createdAt: initialPatient?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Remove client side temp draft cache
    localStorage.removeItem("cld_registry_form_working_draft");
    onSave(compiledProfile);
  };

  return (
    <div id="patient-form-container" className="bg-white rounded-xl border border-slate-100 shadow-md p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-5 mb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 mb-1">
            <ClipboardList size={20} />
            <span className="text-xs font-bold font-mono tracking-wider uppercase">Institutional CR Registry Form</span>
          </div>
          <h2 className="text-xl font-bold font-sans text-slate-800 tracking-tight">
            {initialPatient ? "Modify Case Report Form (CRF)" : "Enroll New Research Participant"}
          </h2>
          <p className="text-xs text-slate-500 font-light mt-0.5">Please fill out clinical records corresponding with investigator clinical evaluations.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print min-h-[44px] md:min-h-0 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer z-50 pointer-events-auto"
          >
            <Printer size={12} />
            Print Blank
          </button>
          <button
            type="button"
            onClick={() => downloadPdf("patient-form-container", "CaseReportForm")}
            className="no-print min-h-[44px] md:min-h-0 px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer z-50 pointer-events-auto"
          >
            <FileDown size={12} />
            Download PDF
          </button>
          {eligibility.isEligible ? (
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full text-emerald-700 text-xs font-bold border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Cohort Eligible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full text-amber-700 text-xs font-bold border border-amber-100">
              <ShieldAlert size={12} />
              Excluded Case
            </span>
          )}
          <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 font-mono">
            {demographics.codeNo}
          </span>
        </div>
      </div>

      {detectedDraft && !hasRestoredDraft && (
        <div id="working-draft-banner" className="mb-6 bg-slate-50 border border-slate-200 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans">
          <div>
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs">
              <History size={14} className="text-blue-500" />
              Unsaved Form Progress Detected
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              We recovered an autosaved entry for Hospital: <strong className="font-semibold">{detectedDraft.demographics?.hospitalNumber || "N/A"}</strong> (Age: {detectedDraft.demographics?.age || "N/A"}). Would you like to restore where you left off?
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (detectedDraft.demographics) {
                  setDemographics({...detectedDraft.demographics, codeNo: demographics.codeNo});
                }
                if (detectedDraft.cldHistory) setCldHistory(detectedDraft.cldHistory);
                if (detectedDraft.complaints) setComplaints(detectedDraft.complaints);
                if (detectedDraft.examination) setExamination(detectedDraft.examination);
                if (detectedDraft.investigations) setInvestigations(detectedDraft.investigations);
                if (detectedDraft.ultrasound) setUltrasound(detectedDraft.ultrasound);
                if (detectedDraft.endoscopy) setEndoscopy(detectedDraft.endoscopy);
                
                setHasRestoredDraft(true);
                setDetectedDraft(null);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg cursor-pointer shadow-sm transition-all"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem("cld_registry_form_working_draft");
                setDetectedDraft(null);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-500 hover:text-slate-700 font-bold text-[10px] rounded-lg cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* CRF Horizontal Steps Indicator */}
      <div className="relative mb-8 pt-2">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 rounded pointer-events-none z-0"></div>
        <div className="relative z-10 flex justify-between">
          {[
            { num: 1, label: "Demographics" },
            { num: 2, label: "CLD History" },
            { num: 3, label: "Clinical Exam" },
            { num: 4, label: "Laboratory" },
            { num: 5, label: "Ultrasound" },
            { num: 6, label: "Endoscopy & Scores" }
          ].map((step) => (
            <button
              key={step.num}
              type="button"
              onClick={() => setCurrentStep(step.num)}
              className="flex flex-col items-center group cursor-pointer"
            >
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-mono text-xs font-bold transition-all ${
                currentStep === step.num
                  ? "bg-blue-600 text-white border-blue-600 scale-110 shadow-md shadow-blue-600/10"
                  : currentStep > step.num
                  ? "bg-blue-50 text-blue-600 border-blue-200"
                  : "bg-white text-slate-400 border-slate-200"
              }`}>
                {step.num}
              </div>
              <span className={`text-[10px] mt-1.5 font-bold tracking-tight hidden md:inline-block transition-colors uppercase ${
                currentStep === step.num ? "text-blue-600" : "text-slate-400"
              }`}>
                {step.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* STEP 1: Basic Demographics */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <User size={16} className="text-slate-500" />
              1. Participant Demographics
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Code Number (Study ID)</label>
                <input
                  type="text"
                  value={demographics.codeNo}
                  disabled // Autogenerated to enforce trial rigor
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hospital ID Number</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HOSP-92042"
                  value={demographics.hospitalNumber}
                  onChange={e => setDemographics({...demographics, hospitalNumber: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Enrollment Date</label>
                    <p className="text-[10px] text-slate-500 font-light">Input in Bikram Sambat (BS) or Gregorian (AD) calendar system. Both synchronize instantly in real-time.</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* BS inputs */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2">
                    <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase block">Bikram Sambat (BS) Calendar</span>
                    <div className="flex gap-2">
                      {/* Year select */}
                      <div className="flex-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Year</label>
                        <select
                          value={currentBSYear}
                          onChange={e => {
                            const newYear = Number(e.target.value);
                            const maxD = getDaysInBSMonth(newYear, currentBSMonthIndex);
                            const adjustedD = Math.min(currentBSDay, maxD);
                            const bsStr = `${newYear}-${String(currentBSMonthIndex + 1).padStart(2, "0")}-${String(adjustedD).padStart(2, "0")}`;
                            const compAD = convertBSToAD(bsStr);
                            if (compAD) setDemographics({ ...demographics, date: compAD });
                          }}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                        >
                          {Array.from({ length: 96 }, (_, i) => 2000 + i).map(year => (
                            <option key={year} value={year}>{year} BS</option>
                          ))}
                        </select>
                      </div>

                      {/* Month select */}
                      <div className="flex-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Month</label>
                        <select
                          value={currentBSMonthIndex}
                          onChange={e => {
                            const newMonthIdx = Number(e.target.value);
                            const maxD = getDaysInBSMonth(currentBSYear, newMonthIdx);
                            const adjustedD = Math.min(currentBSDay, maxD);
                            const bsStr = `${currentBSYear}-${String(newMonthIdx + 1).padStart(2, "0")}-${String(adjustedD).padStart(2, "0")}`;
                            const compAD = convertBSToAD(bsStr);
                            if (compAD) setDemographics({ ...demographics, date: compAD });
                          }}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                        >
                          {NEPALI_MONTHS.map((name, idx) => (
                            <option key={idx} value={idx}>{idx + 1} - {name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Day select */}
                      <div className="flex-1">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Day</label>
                        <select
                          value={currentBSDay}
                          onChange={e => {
                            const newDay = Number(e.target.value);
                            const bsStr = `${currentBSYear}-${String(currentBSMonthIndex + 1).padStart(2, "0")}-${String(newDay).padStart(2, "0")}`;
                            const compAD = convertBSToAD(bsStr);
                            if (compAD) setDemographics({ ...demographics, date: compAD });
                          }}
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                        >
                          {Array.from({ length: bsMaxDays }, (_, i) => 1 + i).map(day => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* AD Input */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200/80 shadow-xs space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase block">Gregorian (AD) Calendar</span>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mt-2 mb-1">Standard Date Selector</label>
                    </div>
                    <input
                      type="date"
                      required
                      value={demographics.date}
                      onChange={e => setDemographics({...demographics, date: e.target.value})}
                      className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Patient Name (Anonymized options)</label>
                <input
                  type="text"
                  placeholder="e.g. Ram Bahadur (Optional)"
                  value={demographics.name}
                  onChange={e => setDemographics({...demographics, name: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Age *(Years)</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Age in yrs"
                  value={demographics.age}
                  onChange={e => setDemographics({
                    ...demographics, 
                    age: e.target.value !== "" ? parseInt(e.target.value, 10) : ""
                  })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                {demographics.age !== "" && demographics.age < 18 && (
                  <p className="text-[10px] text-amber-600 font-medium mt-1">Note: Age &lt; 18 violates standard protocol inclusion.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sex *</label>
                <select
                  required
                  value={demographics.sex}
                  onChange={e => setDemographics({...demographics, sex: e.target.value as DemographicData["sex"]})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:border-indigo-500"
                >
                  <option value="">-- Choose Sex --</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Religion</label>
                <select
                  value={demographics.religion}
                  onChange={e => setDemographics({...demographics, religion: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:border-indigo-500"
                >
                  <option value="">-- Choose Religion --</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Buddhist">Buddhist</option>
                  <option value="Christian">Christian</option>
                  <option value="Islam">Islam</option>
                  <option value="Kirat">Kirat</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Participant Address (District)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Type to search Nepalese districts (e.g. Kathmandu, Kaski)..."
                    value={demographics.address}
                    onChange={e => {
                      setDemographics({...demographics, address: e.target.value});
                      setIsAddressDropdownOpen(true);
                    }}
                    onFocus={() => setIsAddressDropdownOpen(true)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                  {demographics.address && (
                    <button
                      type="button"
                      onClick={() => {
                        setDemographics({...demographics, address: ""});
                        setIsAddressDropdownOpen(true);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1.5 py-0.5 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {isAddressDropdownOpen && (
                  <>
                    <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 shadow-lg rounded-lg divide-y divide-slate-50">
                      {NEPAL_DISTRICTS.filter(d =>
                        !demographics.address || d.toLowerCase().includes(demographics.address.toLowerCase())
                      ).length > 0 ? (
                        NEPAL_DISTRICTS.filter(d =>
                          !demographics.address || d.toLowerCase().includes(demographics.address.toLowerCase())
                        ).map(district => (
                          <button
                            key={district}
                            type="button"
                            className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 hover:bg-blue-50/70 hover:text-blue-650 font-medium transition-colors cursor-pointer"
                            onClick={() => {
                              setDemographics({...demographics, address: district});
                              setIsAddressDropdownOpen(false);
                            }}
                          >
                            {district}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2.5 text-xs text-slate-400 italic">
                          No matching districts. Hit Enter or press Tab to keep your custom address.
                        </div>
                      )}
                    </div>
                    {/* Backdrop to dismiss on click outside */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsAddressDropdownOpen(false)}
                    />
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Occupation</label>
                <input
                  type="text"
                  placeholder="e.g. Agriculture, Teacher"
                  value={demographics.occupation}
                  onChange={e => setDemographics({...demographics, occupation: e.target.value})}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CLD History */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <History size={16} className="text-slate-500" />
              2. Chronic Liver Disease & Personal Background
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Duration & Etiology */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Duration of liver disease</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Value"
                      value={cldHistory.durationValue}
                      onChange={e => setCldHistory({
                        ...cldHistory, 
                        durationValue: e.target.value !== "" ? parseInt(e.target.value, 10) : ""
                      })}
                      className="w-2/3 text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                    />
                    <select
                      value={cldHistory.durationUnit}
                      onChange={e => setCldHistory({...cldHistory, durationUnit: e.target.value as "Months" | "Years"})}
                      className="w-1/3 text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="Months">Months</option>
                      <option value="Years">Years</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Etiology of CLD (Check all that apply)</label>
                  <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={cldHistory.etiology.alcohol}
                        onChange={e => setCldHistory({
                          ...cldHistory, 
                          etiology: { ...cldHistory.etiology, alcohol: e.target.checked }
                        })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      Alcohol
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={cldHistory.etiology.hbvHcv}
                        onChange={e => setCldHistory({
                          ...cldHistory, 
                          etiology: { ...cldHistory.etiology, hbvHcv: e.target.checked }
                        })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      Viral (HBV/HCV)
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={cldHistory.etiology.nash}
                        onChange={e => setCldHistory({
                          ...cldHistory, 
                          etiology: { ...cldHistory.etiology, nash: e.target.checked }
                        })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      NASH
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={cldHistory.etiology.autoimmune}
                        onChange={e => setCldHistory({
                          ...cldHistory, 
                          etiology: { ...cldHistory.etiology, autoimmune: e.target.checked }
                        })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      Autoimmune
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 col-span-2 mt-1">
                      <input
                        type="checkbox"
                        checked={cldHistory.etiology.others}
                        onChange={e => setCldHistory({
                          ...cldHistory, 
                          etiology: { ...cldHistory.etiology, others: e.target.checked }
                        })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      Others (specify below)
                    </label>
                  </div>
                  {cldHistory.etiology.others && (
                    <input
                      type="text"
                      placeholder="Specify other etiology"
                      value={cldHistory.etiology.othersText}
                      onChange={e => setCldHistory({
                        ...cldHistory, 
                        etiology: { ...cldHistory.etiology, othersText: e.target.value }
                      })}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg mt-2 focus:border-indigo-500"
                    />
                  )}
                </div>
              </div>

              {/* Personal History */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">Personal habits</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alcohol consumer</label>
                    <select
                      value={cldHistory.personalHistory.isAlcoholConsumer}
                      onChange={e => setCldHistory({
                        ...cldHistory,
                        personalHistory: { ...cldHistory.personalHistory, isAlcoholConsumer: e.target.value as "Yes" | "No" | "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-500"
                    >
                      <option value="">-- Choose --</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  {cldHistory.personalHistory.isAlcoholConsumer === "Yes" && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Alcohol (grams/day)</label>
                      <input
                        type="number"
                        placeholder="g / day"
                        value={cldHistory.personalHistory.alcoholGramsPerDay}
                        onChange={e => setCldHistory({
                          ...cldHistory,
                          personalHistory: { 
                            ...cldHistory.personalHistory, 
                            alcoholGramsPerDay: e.target.value !== "" ? parseInt(e.target.value, 10) : "" 
                          }
                        })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">IV Drug Abuse</label>
                    <select
                      value={cldHistory.personalHistory.ivDrugAbuse}
                      onChange={e => setCldHistory({
                        ...cldHistory,
                        personalHistory: { ...cldHistory.personalHistory, ivDrugAbuse: e.target.value as "Yes" | "No" | "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">-- Choose --</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sexual Promiscuity</label>
                    <select
                      value={cldHistory.personalHistory.sexualPromiscuity}
                      onChange={e => setCldHistory({
                        ...cldHistory,
                        personalHistory: { ...cldHistory.personalHistory, sexualPromiscuity: e.target.value as "Yes" | "No" | "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">-- Choose --</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Family History of CLD</label>
                    <select
                      value={cldHistory.personalHistory.familyHistoryCLD}
                      onChange={e => setCldHistory({
                        ...cldHistory,
                        personalHistory: { ...cldHistory.personalHistory, familyHistoryCLD: e.target.value as "Yes" | "No" | "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">-- Choose --</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Drug History & Comorbidities Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Drug History (*Exclusion criteria screening)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={cldHistory.drugHistory.diuretics}
                      onChange={e => setCldHistory({
                        ...cldHistory, 
                        drugHistory: { ...cldHistory.drugHistory, diuretics: e.target.checked }
                      })}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    Diuretics
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={cldHistory.drugHistory.nsaids}
                      onChange={e => setCldHistory({
                        ...cldHistory, 
                        drugHistory: { ...cldHistory.drugHistory, nsaids: e.target.checked }
                      })}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    NSAIDs
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-amber-50/40 p-1.5 rounded text-xs font-bold text-amber-800 border border-amber-100">
                    <input
                      type="checkbox"
                      checked={cldHistory.drugHistory.betaBlockers}
                      onChange={e => setCldHistory({
                        ...cldHistory, 
                        drugHistory: { ...cldHistory.drugHistory, betaBlockers: e.target.checked }
                      })}
                      className="rounded border-slate-300 text-amber-700 h-4 w-4"
                    />
                    Beta-Blockers *
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer bg-amber-50/40 p-1.5 rounded text-xs font-bold text-amber-800 border border-amber-100">
                    <input
                      type="checkbox"
                      checked={cldHistory.drugHistory.nitrates}
                      onChange={e => setCldHistory({
                        ...cldHistory, 
                        drugHistory: { ...cldHistory.drugHistory, nitrates: e.target.checked }
                      })}
                      className="rounded border-slate-300 text-amber-700 h-4 w-4"
                    />
                    Nitrates *
                  </label>
                </div>
                {(cldHistory.drugHistory.betaBlockers || cldHistory.drugHistory.nitrates) && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">⚠️ Note: Beta-blockers or nitrates usage will automatically exclude patient under study criteria.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Comorbidities</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  {Object.entries({
                    diabetes: "Diabetes (DM)",
                    hypertension: "Hypertension (HTN)",
                    ckd: "CKD",
                    cad: "CAD",
                    copd: "COPD",
                    thyroid: "Thyroid Disease"
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={cldHistory.comorbidities[key as keyof typeof cldHistory.comorbidities] as boolean}
                        onChange={e => setCldHistory({
                          ...cldHistory, 
                          comorbidities: { ...cldHistory.comorbidities, [key]: e.target.checked }
                        })}
                        className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Presenting complaints, general clinical exam, vitals */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <HeartPulse size={16} className="text-rose-500" />
              3. Presenting complaints, Signs & Vitals
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Complaints */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider border-b border-indigo-100/50 pb-1">Complaints Checkbox</h4>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {Object.entries({
                    jaundice: "Jaundice / Yellow eyes",
                    ascites: "Abdominal swelling (Ascites)",
                    abdominalPain: "Abdominal Pain",
                    difficultyBreathing: "Difficulty breathing",
                    hematemesis: "Vomiting of blood (Hematemesis)",
                    melena: "Black tarry stool (Melena)",
                    lossOfConsciousness: "Loss of consciousness *",
                    confusion: "Altered sensorium/Confusion *",
                    oliguria: "Decreased urinary output (Oliguria)"
                  }).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={complaints[key as keyof typeof complaints] as boolean}
                        onChange={e => setComplaints({
                          ...complaints,
                          [key]: e.target.checked
                        })}
                        className="rounded border-slate-300 text-indigo-600 h-4, w-4"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* General Exam & Stigmata */}
              <div className="space-y-4">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase mb-2 border-b border-slate-100 pb-1">General Signs</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries({
                      pallor: "Pallor",
                      icterus: "Icterus",
                      clubbing: "Clubbing",
                      pedalEdema: "Pedal Edema",
                      flappingTremor: "Flapping Tremor",
                      conscious: "Conscious",
                      oriented: "Oriented"
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={examination.general[key as keyof typeof examination.general] as boolean}
                          onChange={e => setExamination({
                            ...examination,
                            general: { ...examination.general, [key]: e.target.checked }
                          })}
                          className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase mb-2 border-b border-slate-100 pb-1">Stigmata of CLD</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries({
                      whiteNails: "White nails",
                      palmarErythema: "Palmar erythema",
                      duputyrenContracture: "Dupuytren Contracture",
                      hairLoss: "Hair loss",
                      parotidEnlargement: "Parotid Swelling",
                      spiderNevi: "Spider nevi",
                      gynaecomastia: "Gynaecomastia",
                      testicularAtrophy: "Testicular atrophy"
                    }).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={examination.stigmata[key as keyof typeof examination.stigmata] as boolean}
                          onChange={e => setExamination({
                            ...examination,
                            stigmata: { ...examination.stigmata, [key]: e.target.checked }
                          })}
                          className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Vitals, Height/Weight */}
              <div className="space-y-4">
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase border-b border-slate-100 pb-1">Physical Metrics & Vitals</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Height (cm)</label>
                      <input
                        type="number"
                        placeholder="cm"
                        value={examination.general.height}
                        onChange={e => setExamination({
                          ...examination,
                          general: { ...examination.general, height: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                        })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Weight (kg)</label>
                      <input
                        type="number"
                        placeholder="kg"
                        value={examination.general.weight}
                        onChange={e => setExamination({
                          ...examination,
                          general: { ...examination.general, weight: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                        })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:border-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <div className="flex justify-between items-center bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100/70">
                        <span className="text-[10px] font-bold text-blue-800 uppercase">Computed BMI</span>
                        <span className="text-xs font-bold font-mono text-blue-900">{examination.general.bmi || "N/A"} kg/m²</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Systolic BP</label>
                      <input
                        type="number"
                        placeholder="mmHg"
                        value={examination.vitals.bpSystolic}
                        onChange={e => setExamination({
                          ...examination,
                          vitals: { ...examination.vitals, bpSystolic: e.target.value !== "" ? parseInt(e.target.value, 10) : "" }
                        })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Diastolic BP</label>
                      <input
                        type="number"
                        placeholder="mmHg"
                        value={examination.vitals.bpDiastolic}
                        onChange={e => setExamination({
                          ...examination,
                          vitals: { ...examination.vitals, bpDiastolic: e.target.value !== "" ? parseInt(e.target.value, 10) : "" }
                        })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Pulse Rate</label>
                      <input
                        type="number"
                        placeholder="bpm"
                        value={examination.vitals.pulse}
                        onChange={e => setExamination({
                          ...examination,
                          vitals: { ...examination.vitals, pulse: e.target.value !== "" ? parseInt(e.target.value, 10) : "" }
                        })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Temp (&deg;F)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Fahrenheit"
                        value={examination.vitals.temperature}
                        onChange={e => setExamination({
                          ...examination,
                          vitals: { ...examination.vitals, temperature: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                        })}
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Abdomen Exam */}
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase mb-3 border-b border-slate-100 pb-1">Abdominal Examination Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ascites Classification</label>
                  <select
                    value={examination.abdomen.ascitesGrade}
                    onChange={e => setExamination({
                      ...examination,
                      abdomen: { ...examination.abdomen, ascitesGrade: e.target.value as ClinicalExamData["abdomen"]["ascitesGrade"] }
                    })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="None">None</option>
                    <option value="Mild">Mild (Controlled)</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe (Tense)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Liver Palpable?</label>
                  <select
                    value={examination.abdomen.liverPalpable ? "Yes" : "No"}
                    onChange={e => setExamination({
                      ...examination,
                      abdomen: { ...examination.abdomen, liverPalpable: e.target.value === "Yes" }
                    })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                {examination.abdomen.liverPalpable && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Liver Size (cm)</label>
                    <input
                      type="number"
                      placeholder="Size in cm"
                      value={examination.abdomen.liverSize}
                      onChange={e => setExamination({
                        ...examination,
                        abdomen: { ...examination.abdomen, liverSize: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                      })}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Splenomegaly?</label>
                  <select
                    value={examination.abdomen.splenomegaly ? "Yes" : "No"}
                    onChange={e => setExamination({
                      ...examination,
                      abdomen: { ...examination.abdomen, splenomegaly: e.target.value === "Yes" }
                    })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dilated Abdominal Veins?</label>
                  <select
                    value={examination.abdomen.dilatedVeins ? "Yes" : "No"}
                    onChange={e => setExamination({
                      ...examination,
                      abdomen: { ...examination.abdomen, dilatedVeins: e.target.value === "Yes" }
                    })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Laboratory / Investigations Module */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Binary size={16} className="text-slate-500" />
              4. Laboratory Investigations & Biochemistry
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Hematology */}
              <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-100 space-y-3 md:col-span-1">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200 pb-1">Hematology</h4>
                
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">Hb (g/dl)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 11.5"
                      value={investigations.hematology.hb}
                      onChange={e => setInvestigations({
                        ...investigations,
                        hematology: { ...investigations.hematology, hb: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">Total Count (/mm3)</label>
                    <input
                      type="number"
                      placeholder="TC e.g. 7200"
                      value={investigations.hematology.tc}
                      onChange={e => setInvestigations({
                        ...investigations,
                        hematology: { ...investigations.hematology, tc: e.target.value !== "" ? parseInt(e.target.value, 10) : "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">Platelet (/mm3)</label>
                    <input
                      type="number"
                      placeholder="Platelet e.g. 98000"
                      value={investigations.hematology.platelet}
                      onChange={e => setInvestigations({
                        ...investigations,
                        hematology: { ...investigations.hematology, platelet: e.target.value !== "" ? parseInt(e.target.value, 10) : "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* LFT Group - Double width since many parameters */}
              <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-100 space-y-3 md:col-span-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200 pb-1">Liver Function Tests</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">Total Bilirubin *(mg/dl)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 2.4"
                      value={investigations.lft.totalBilirubin}
                      onChange={e => setInvestigations({
                        ...investigations,
                        lft: { ...investigations.lft, totalBilirubin: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 border-indigo-200/50 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">Direct Bilirubin (mg/dl)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 1.2"
                      value={investigations.lft.directBilirubin}
                      onChange={e => setInvestigations({
                        ...investigations,
                        lft: { ...investigations.lft, directBilirubin: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">SGOT (AST) (U/L)</label>
                    <input
                      type="number"
                      placeholder="e.g. 54"
                      value={investigations.lft.sgotAST}
                      onChange={e => setInvestigations({
                        ...investigations,
                        lft: { ...investigations.lft, sgotAST: e.target.value !== "" ? parseInt(e.target.value, 10) : "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">SGPT (ALT) (U/L)</label>
                    <input
                      type="number"
                      placeholder="e.g. 42"
                      value={investigations.lft.sgptALT}
                      onChange={e => setInvestigations({
                        ...investigations,
                        lft: { ...investigations.lft, sgptALT: e.target.value !== "" ? parseInt(e.target.value, 10) : "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">S. Albumin *(g/dl)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 3.2"
                      value={investigations.lft.albumin}
                      onChange={e => setInvestigations({
                        ...investigations,
                        lft: { ...investigations.lft, albumin: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 border-indigo-200/50 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">INR *(Prothrombin time)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="e.g. 1.5"
                      value={investigations.lft.inr}
                      onChange={e => setInvestigations({
                        ...investigations,
                        lft: { ...investigations.lft, inr: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                      })}
                      className="w-full text-xs p-2 bg-white border border-slate-200 border-indigo-200/50 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Renal Panel & Viral Markers */}
              <div className="space-y-4">
                <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-100 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-1 border-b border-slate-100 pb-1">Renal Profile</h4>
                  
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">Urea (mg/dl)</label>
                    <input
                      type="number"
                      placeholder="e.g. 35"
                      value={investigations.renal.urea}
                      onChange={e => setInvestigations({
                        ...investigations,
                        renal: { ...investigations.renal, urea: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                      })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">Creatinine (mg/dl)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 0.95"
                      value={investigations.renal.creatinine}
                      onChange={e => setInvestigations({
                        ...investigations,
                        renal: { ...investigations.renal, creatinine: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                      })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">Sodium (mmol/ls)</label>
                    <input
                      type="number"
                      placeholder="Na+ e.g. 138"
                      value={investigations.renal.sodium}
                      onChange={e => setInvestigations({
                        ...investigations,
                        renal: { ...investigations.renal, sodium: e.target.value !== "" ? parseInt(e.target.value, 10) : "" }
                      })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500">Potassium (mmol/l)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="K+ e.g. 4.1"
                      value={investigations.renal.potassium}
                      onChange={e => setInvestigations({
                        ...investigations,
                        renal: { ...investigations.renal, potassium: e.target.value !== "" ? parseFloat(e.target.value) : "" }
                      })}
                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-100 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-1 border-b border-slate-100 pb-1">Viral Serology</h4>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600">HBsAg</span>
                      <select
                        value={investigations.viralMarkers.hbsAg}
                        onChange={e => setInvestigations({
                          ...investigations,
                          viralMarkers: { ...investigations.viralMarkers, hbsAg: e.target.value as any }
                        })}
                        className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="">Choose</option>
                        <option value="Non-Reactive">Non-Reactive</option>
                        <option value="Reactive">Reactive (Pos)</option>
                      </select>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600">Anti-HCV</span>
                      <select
                        value={investigations.viralMarkers.antiHCV}
                        onChange={e => setInvestigations({
                          ...investigations,
                          viralMarkers: { ...investigations.viralMarkers, antiHCV: e.target.value as any }
                        })}
                        className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
                      >
                        <option value="">Choose</option>
                        <option value="Non-Reactive">Non-Reactive</option>
                        <option value="Reactive">Reactive (Pos)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50/55 p-4 rounded-xl border border-slate-100 space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-1 border-b border-slate-100 pb-1">Other Tests</h4>
                  
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-600">Stool OBT</span>
                    <select
                      value={investigations.stoolOBT || ""}
                      onChange={e => setInvestigations({
                        ...investigations,
                        stoolOBT: e.target.value as any
                      })}
                      className="text-xs p-1.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">Choose</option>
                      <option value="Positive">Positive</option>
                      <option value="Negative">Negative</option>
                      <option value="Not Done">Not Done</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Ultrasound Examination Primary Module */}
        {currentStep === 5 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Calculator size={16} className="text-blue-600 animate-pulse" />
              5. Ultrasonographical Evaluation (Abdomen & Pelvis)
            </h3>

            <div className="bg-blue-50 border border-blue-100/50 rounded-2xl p-4 flex gap-4 items-center">
              <div className="p-3 bg-blue-600 text-white rounded-xl shadow-md">
                <Award size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wide">Primary Study Predictor Entry</h4>
                <p className="text-[11px] text-blue-700 font-light leading-relaxed mt-0.5">
                  Portal Vein Diameter (mm) and Spleen Size (cm) entered here represent the principal independent clinical variables in this protocol. Ensure measurements are strictly formulated during quiet respiration forward of the IVC.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-widest border-b border-blue-100 pb-1.5">Portal Hypertension Grid</h4>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Portal Vein Diameter *(mm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    required
                    placeholder="PV diameter e.g. 13.5"
                    value={ultrasound.portalVeinDiameter}
                    onChange={e => setUltrasound({
                      ...ultrasound,
                      portalVeinDiameter: e.target.value !== "" ? parseFloat(e.target.value) : ""
                    })}
                    className="w-full text-xs p-3 border border-blue-200 bg-blue-50/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-2">Normal reference diameter &le; 13 mm.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Splenic Size *(cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={1}
                    placeholder="Spleen size e.g. 14.2"
                    value={ultrasound.splenicSize}
                    onChange={e => setUltrasound({
                      ...ultrasound,
                      splenicSize: e.target.value !== "" ? parseFloat(e.target.value) : ""
                    })}
                    className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-2">Spleen measurements are highly corellated with portal hypertension.</p>
                </div>
              </div>

              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100/80 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase border-b border-slate-100 pb-1.5">USG Liver Findings</h4>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Liver Span (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Liver span in cm e.g. 11.2"
                    value={ultrasound.liverSize}
                    onChange={e => setUltrasound({
                      ...ultrasound,
                      liverSize: e.target.value !== "" ? parseFloat(e.target.value) : ""
                    })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Echotexture of liver</label>
                  <select
                    value={ultrasound.echotextureOfLiver}
                    onChange={e => setUltrasound({...ultrasound, echotextureOfLiver: e.target.value as any})}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Choose Echotexture --</option>
                    <option value="Normal">Normal</option>
                    <option value="Coarse">Coarse Parenchyma</option>
                    <option value="Nodular">Nodular / Cirrhotic</option>
                    <option value="Fatty">Fatty Liver Changes</option>
                    <option value="Other">Other Particulars</option>
                  </select>
                </div>

                {ultrasound.echotextureOfLiver === "Other" && (
                  <input
                    type="text"
                    placeholder="Specify other liver findings"
                    value={ultrasound.echotextureOtherText}
                    onChange={e => setUltrasound({...ultrasound, echotextureOtherText: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg"
                  />
                )}
              </div>

              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100/80 shadow-sm space-y-4">
                <h4 className="text-xs font-semibold text-slate-700 uppercase border-b border-slate-100 pb-1.5">USG Ascites & Flow Direction</h4>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Ascites Volume</label>
                  <select
                    value={ultrasound.ascites}
                    onChange={e => setUltrasound({...ultrasound, ascites: e.target.value as any})}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="None">None (Absent)</option>
                    <option value="Mild">Mild (Minimal fluid)</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe (Gross ascites)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Portal Vein Flow direction</label>
                  <select
                    value={ultrasound.portalVeinFlowDirection}
                    onChange={e => setUltrasound({...ultrasound, portalVeinFlowDirection: e.target.value as any})}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl"
                  >
                    <option value="">-- Choose Flow --</option>
                    <option value="Hepatopetal">Hepatopetal (Normal direction)</option>
                    <option value="Hepatofugal">Hepatofugal (Reversed flow)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: UGI Endoscopy findings, Automated Severity score displays, Review & Submit */}
        {currentStep === 6 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-2">
              <Stethoscope size={16} className="text-slate-500" />
              6. Endoscopy Findings, Automated Severity Scoring & Review
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Endoscopy results */}
              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-bold text-indigo-950 uppercase border-b border-indigo-100 pb-1.5">UGI Endoscopic Evaluation</h4>
                
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Esophageal Varices *</label>
                  <select
                    value={endoscopy.esophagealVarices}
                    onChange={e => setEndoscopy({
                      ...endoscopy, 
                      esophagealVarices: e.target.value as any,
                      varicesGrade: e.target.value === "Absent" ? "No varices" : endoscopy.varicesGrade
                    })}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:border-indigo-500"
                  >
                    <option value="">-- Choose Status --</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>

                {endoscopy.esophagealVarices === "Present" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Varices Grade</label>
                    <select
                      value={endoscopy.varicesGrade}
                      onChange={e => setEndoscopy({...endoscopy, varicesGrade: e.target.value as any})}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                    >
                      <option value="">-- Choose Grade --</option>
                      <option value="Small varices">Small Varices</option>
                      <option value="Large varices">Large Varices</option>
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={endoscopy.gastricVarices}
                      onChange={e => setEndoscopy({...endoscopy, gastricVarices: e.target.checked})}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    Gastric Varices
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={endoscopy.portalHypertensiveGastropathy}
                      onChange={e => setEndoscopy({...endoscopy, portalHypertensiveGastropathy: e.target.checked})}
                      className="rounded border-slate-300 text-indigo-600 h-4 w-4"
                    />
                    Hypertensive Gastropathy
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Additional Observations / History Notes</label>
                  <textarea
                    placeholder="Enter previous EVL shunts, or findings details here..."
                    rows={2}
                    value={endoscopy.additionalFindings}
                    onChange={e => setEndoscopy({...endoscopy, additionalFindings: e.target.value})}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Scores Visualizer & Eligibility Badges */}
              <div className="space-y-4">
                <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-1">Automated Severity Scores</h4>
                  
                  {/* Child-Pugh Score Display */}
                  <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100/70 p-3.5 rounded-xl">
                    <div>
                      <h5 className="text-xs font-bold font-sans text-blue-950">Child-Pugh Classification</h5>
                      <p className="text-[10px] text-blue-700 mt-0.5">Auto-computed from bilirubin, albumin, INR, ascites, HE</p>
                    </div>
                    <div className="text-right">
                      {computedScores.childPughPoints !== null ? (
                        <>
                          <div className="text-sm font-extrabold text-blue-900 font-sans uppercase">
                            {computedScores.childPughClass}
                          </div>
                          <div className="text-[10px] font-mono text-blue-600 font-bold mt-0.5">{computedScores.childPughPoints} Points</div>
                        </>
                      ) : (
                        <div className="text-[10px] font-semibold text-slate-400 italic">Incomplete lab parameters</div>
                      )}
                    </div>
                  </div>

                  {/* MELD Na score */}
                  <div className="flex justify-between items-center bg-blue-50/50 border border-blue-100/70 p-3.5 rounded-xl">
                    <div>
                      <h5 className="text-xs font-bold text-blue-950">MELD-Na score</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 max-w-[180px] leading-tight">UNOS adjusted. Values: creatinine, bilirubin, INR, na+</p>
                    </div>
                    <div className="text-right">
                      {computedScores.meldNaScore !== null ? (
                        <>
                          <div className="text-lg font-extrabold text-blue-900 font-mono tracking-tight">
                            {computedScores.meldNaScore}
                          </div>
                          <div className="text-[9px] text-slate-400 italic leading-none block max-w-[130px] font-light">Calculated correctly</div>
                        </>
                      ) : (
                        <div className="text-[10px] font-semibold text-slate-400 italic">Incomplete labs</div>
                      )}
                    </div>
                  </div>

                  {/* Detailed Math Audit Toggle */}
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => setShowScoreAudit(!showScoreAudit)}
                      className="w-full py-2 px-3 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all select-none shadow-sm"
                    >
                      <Eye size={13} className="text-blue-500" />
                      {showScoreAudit ? "Hide Detailed Calculation Math" : "Verify Detailed Math Calculations"}
                    </button>
                  </div>

                  {showScoreAudit && (
                    <div className="pt-2 animate-fade-in text-left">
                      <ScoreDetails
                        bilirubin={typeof investigations.lft.totalBilirubin === "number" ? investigations.lft.totalBilirubin : null}
                        albumin={typeof investigations.lft.albumin === "number" ? investigations.lft.albumin : null}
                        inr={typeof investigations.lft.inr === "number" ? investigations.lft.inr : null}
                        creatinine={typeof investigations.renal.creatinine === "number" ? investigations.renal.creatinine : null}
                        sodium={typeof investigations.renal.sodium === "number" ? investigations.renal.sodium : null}
                        ascitesGrade={examination.abdomen.ascitesGrade}
                        hasConfusion={!!complaints.confusion}
                      />
                    </div>
                  )}

                  {/* Eligibility review block */}
                  <div className="mt-2 text-xs border-t border-slate-200/60 pt-3">
                    <h5 className="font-bold text-slate-700 uppercase mb-1.5 flex items-center gap-1">
                      Trial Protocol Screen
                    </h5>
                    {eligibility.isEligible ? (
                      <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-[11px] leading-relaxed">
                        ✓ Participant qualifies for formal trial inclusion based on age and clinical criteria checks.
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 text-amber-800 border border-amber-100 rounded-lg text-[10px] space-y-1">
                        <span className="font-bold uppercase tracking-wider block text-amber-700 flex items-center gap-1">
                          <ShieldAlert size={12} />
                          Disqualification Flags
                        </span>
                        <ul className="list-disc pl-3.5 space-y-0.5 font-light">
                          {eligibility.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form CRF actions */}
        <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-8">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-200 text-slate-500 rounded-lg text-xs font-medium hover:bg-slate-50 select-none cursor-pointer"
          >
            Cancel CRF
          </button>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-105 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Save partially completed case records as an editable draft directly in the registry list"
            >
              <Save size={14} className="stroke-2" />
              Save Draft (Partial)
            </button>

            {currentStep > 1 && (
              <button
                type="button"
                id="form-prev-btn"
                onClick={handleBack}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft size={14} />
                Back
              </button>
            )}

            {currentStep < 6 ? (
              <button
                type="button"
                id="form-next-btn"
                onClick={handleNext}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-blue-500 shadow shadow-blue-600/10 cursor-pointer"
              >
                Continue
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="submit"
                id="form-submit-btn"
                className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500 shadow-md shadow-emerald-600/10 active:scale-95 cursor-pointer"
              >
                <Save size={14} />
                Submit and Save CRF Record
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
