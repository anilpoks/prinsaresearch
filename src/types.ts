/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DemographicData {
  codeNo: string; // Patient study ID / Code No
  date: string; // Enrollment date
  hospitalNumber: string;
  name?: string; // Optional if anonymized
  age: number | "";
  sex: "Male" | "Female" | "";
  religion: string;
  address: string;
  occupation: string;
}

export interface CLDHistoryData {
  durationValue: number | "";
  durationUnit: "Months" | "Years";
  etiology: {
    alcohol: boolean;
    hbvHcv: boolean;
    nash: boolean;
    autoimmune: boolean;
    others: boolean;
    othersText: string;
  };
  drugHistory: {
    diuretics: boolean;
    nsaids: boolean;
    betaBlockers: boolean;
    nitrates: boolean;
    others: boolean;
    othersText: string;
  };
  comorbidities: {
    diabetes: boolean;
    hypertension: boolean;
    ckd: boolean;
    cad: boolean;
    copd: boolean;
    thyroid: boolean;
    others: boolean;
    othersText: string;
  };
  personalHistory: {
    isAlcoholConsumer: "Yes" | "No" | "";
    alcoholGramsPerDay: number | "";
    ivDrugAbuse: "Yes" | "No" | "";
    sexualPromiscuity: "Yes" | "No" | "";
    familyHistoryCLD: "Yes" | "No" | "";
  };
}

export interface PresentingComplaints {
  jaundice: boolean;
  ascites: boolean;
  abdominalPain: boolean;
  difficultyBreathing: boolean;
  hematemesis: boolean;
  melena: boolean;
  lossOfConsciousness: boolean;
  confusion: boolean;
  oliguria: boolean;
  others: boolean;
  othersText: string;
}

export interface ClinicalExamData {
  general: {
    height: number | ""; // cm
    weight: number | ""; // kg
    bmi: number | ""; // auto-calculated
    pallor: boolean;
    icterus: boolean;
    clubbing: boolean;
    pedalEdema: boolean;
    conscious: boolean;
    oriented: boolean;
    gcs: number | "";
    flappingTremor: boolean;
  };
  stigmata: {
    whiteNails: boolean;
    palmarErythema: boolean;
    duputyrenContracture: boolean;
    hairLoss: boolean;
    parotidEnlargement: boolean;
    spiderNevi: boolean;
    gynaecomastia: boolean;
    testicularAtrophy: boolean;
  };
  vitals: {
    bpSystolic: number | ""; // mmHg
    bpDiastolic: number | ""; // mmHg
    pulse: number | ""; // bpm
    rr: number | ""; // breaths/min
    spo2: number | ""; // %
    temperature: number | ""; // F
  };
  abdomen: {
    ascitesGrade: "None" | "Mild" | "Moderate" | "Severe";
    liverPalpable: boolean;
    liverSize: number | ""; // cm
    splenomegaly: boolean;
    dilatedVeins: boolean;
    perRectalExamInfo: string;
  };
}

export interface InvestigationsData {
  hematology: {
    hb: number | ""; // g/dl
    tc: number | ""; // /mm3
    dcNeutrophils: number | ""; // %
    dcLymphocytes: number | ""; // %
    platelet: number | ""; // /mm3
    rbcCount: number | ""; // million/cmm
  };
  renal: {
    urea: number | ""; // mg/dl
    creatinine: number | ""; // mg/dl
    sodium: number | ""; // mmol/l
    potassium: number | ""; // mmol/l
    rbs: number | ""; // mg/dl
  };
  lft: {
    totalBilirubin: number | ""; // mg/dl
    directBilirubin: number | ""; // mg/dl
    sgotAST: number | ""; // U/L
    sgptALT: number | ""; // U/L
    alp: number | ""; // U/L
    ggt: number | ""; // U/L
    albumin: number | ""; // g/dl
    totalProtein: number | ""; // g/dl
    ptSeconds: number | ""; // sec
    inr: number | "";
  };
  viralMarkers: {
    hbsAg: "Non-Reactive" | "Reactive" | "";
    antiHCV: "Non-Reactive" | "Reactive" | "";
    hiv12: "Non-Reactive" | "Reactive" | "";
  };
  stoolOBT?: "Positive" | "Negative" | "Not Done" | ""; // Stool Occult Blood Test (OBT)
}

export interface SeverityScores {
  childPughPoints: number | null;
  childPughClass: "Class A" | "Class B" | "Class C" | null;
  meldNaScore: number | null;
  calculatedAt: string;
}

export interface UltrasoundData {
  liverSize: number | ""; // cm
  echotextureOfLiver: "Normal" | "Coarse" | "Nodular" | "Fatty" | "Other" | "";
  echotextureOtherText: string;
  portalVeinDiameter: number | ""; // mm (primary variable)
  splenicSize: number | ""; // cm
  ascites: "None" | "Mild" | "Moderate" | "Severe";
  portalVeinFlowDirection: "Hepatopetal" | "Hepatofugal" | "";
}

export interface EndoscopyData {
  esophagealVarices: "Present" | "Absent" | "";
  varicesGrade: "No varices" | "Small varices" | "Large varices" | "";
  gastricVarices: boolean;
  portalHypertensiveGastropathy: boolean;
  additionalFindings: string;
}

export interface PatientProfile {
  id: string; // Internal UUID
  userId?: string; // UID of the researcher/creator
  isDraft?: boolean; // True if the record is saved as a partial draft
  demographics: DemographicData;
  cldHistory: CLDHistoryData;
  complaints: PresentingComplaints;
  examination: ClinicalExamData;
  investigations: InvestigationsData;
  ultrasound: UltrasoundData;
  endoscopy: EndoscopyData;
  scores: SeverityScores;
  createdAt: string;
  updatedAt: string;
}

// Struct to store statistical calculations
export interface AnalyticsData {
  totalPatients: number;
  patientsWithVarices: number;
  patientsWithoutVarices: number;
  eligiblePatients: number;
  excludedPatients: number;
  meanPortalVeinDiameter: number;
  meanSpleenSize: number;
  childPughDistribution: {
    classA: number;
    classB: number;
    classC: number;
  };
  varicesGroup: {
    meanPVD: number;
    sdPVD: number;
    count: number;
    meanSpleen: number;
    sdSpleen: number;
  };
  noVaricesGroup: {
    meanPVD: number;
    sdPVD: number;
    count: number;
    meanSpleen: number;
    sdSpleen: number;
  };
  tTest: {
    tValue: number;
    pValue: number;
    df: number;
    significant: boolean;
  } | null;
}
