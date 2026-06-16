/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PatientProfile, AnalyticsData } from "./types";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export async function downloadPdf(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }
  
  // Temporarily remove 'no-print' elements if any, or ensure we only capture what we want
  const canvas = await html2canvas(element, { 
      scale: 2,
      logging: false,
      useCORS: true
  });
  
  const data = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const imgProps = pdf.getImageProperties(data);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
  
  pdf.addImage(data, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${filename}.pdf`);
}

/**
 * Calculates Child-Pugh Score and Class.
 * Returns score (5-15) and class (A, B, C).
 */
export function calculateChildPughScore(
  bilirubin: number | null,
  albumin: number | null,
  inr: number | null,
  ascitesGrade: "None" | "Mild" | "Moderate" | "Severe",
  encephalopathyGrade: "None" | "Grade I-II" | "Grade III-IV"
): { score: number; class: "Class A" | "Class B" | "Class C"; breakdown: Record<string, number> } {
  let bilPoints = 1;
  if (bilirubin !== null) {
    if (bilirubin > 3.0) bilPoints = 3;
    else if (bilirubin >= 2.0) bilPoints = 2;
  }

  let albPoints = 1;
  if (albumin !== null) {
    if (albumin < 2.8) albPoints = 3;
    else if (albumin <= 3.5) albPoints = 2;
  }

  let inrPoints = 1;
  if (inr !== null) {
    if (inr > 2.3) inrPoints = 3;
    else if (inr >= 1.7) inrPoints = 2;
  }

  let ascPoints = 1;
  if (ascitesGrade === "Mild") ascPoints = 2;
  else if (ascitesGrade === "Moderate" || ascitesGrade === "Severe") ascPoints = 3;

  let encPoints = 1;
  if (encephalopathyGrade === "Grade I-II") encPoints = 2;
  else if (encephalopathyGrade === "Grade III-IV") encPoints = 3;

  const totalScore = bilPoints + albPoints + inrPoints + ascPoints + encPoints;

  let childClass: "Class A" | "Class B" | "Class C" = "Class A";
  if (totalScore >= 10) childClass = "Class C";
  else if (totalScore >= 7) childClass = "Class B";

  return {
    score: totalScore,
    class: childClass,
    breakdown: {
      bilirubin: bilPoints,
      albumin: albPoints,
      inr: inrPoints,
      ascites: ascPoints,
      encephalopathy: encPoints,
    },
  };
}

/**
 * Calculates MELD and MELD-Na Scores.
 */
export function calculateMeldNa(
  bilirubin: number | null,
  creatinine: number | null,
  inr: number | null,
  sodium: number | null
): { meld: number; meldNa: number; explanation: string } {
  if (bilirubin === null || creatinine === null || inr === null) {
    return { meld: 0, meldNa: 0, explanation: "Incomplete lab values (Bilirubin, Creatinine, or INR is missing)" };
  }

  // Cap values according to clinical guidelines
  const bil = Math.max(1.0, bilirubin);
  const cr = Math.min(4.0, Math.max(1.0, creatinine));
  const r = Math.max(1.0, inr);

  // UNOS MELD calculation
  // MELD = 3.78 * ln(bilirubin) + 11.2 * ln(INR) + 9.57 * ln(creatinine) + 6.43
  const meldUnos = 0.378 * Math.log(bil) + 1.12 * Math.log(r) + 0.957 * Math.log(cr) + 0.643;
  let meld = Math.round(meldUnos * 10);
  if (meld < 6) meld = 6;
  if (meld > 40) meld = 40;

  let finalMeldNa = meld;
  let explanation = `MELD calculated: ${meld}. `;

  if (sodium !== null && meld > 11) {
    // Cap sodium between 125 and 137
    const na = Math.min(137, Math.max(125, sodium));
    // Standard UNOS/OPTN MELD-Na formula:
    // MELD-Na = MELD - Na - [0.008 * (137 - Na) * (37 - MELD)] + 137
    const meldNaCalc = meld + (137 - na) - 0.008 * (137 - na) * (37 - meld);
    finalMeldNa = Math.round(meldNaCalc);
    if (finalMeldNa < meld) finalMeldNa = meld; // MELD-Na cannot be less than MELD
    if (finalMeldNa < 6) finalMeldNa = 6;
    if (finalMeldNa > 40) finalMeldNa = 40;
    explanation += `With Sodium ${sodium} mmol/l (cap [125,137]), adjusted MELD-Na is ${finalMeldNa}.`;
  } else if (meld <= 11) {
    explanation += "Since MELD is <= 11, Sodium correction is not applied.";
  } else {
    explanation += "Renal Sodium is missing; cannot compute MELD-Na.";
  }

  return {
    meld,
    meldNa: finalMeldNa,
    explanation,
  };
}

/**
 * Checks eligibility/exclusion criteria.
 */
export function checkPatientEligibility(patient: Partial<PatientProfile> | Omit<PatientProfile, "id">): {
  isEligible: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  const age = patient.demographics?.age;
  if (age !== undefined && age !== "" && age < 18) {
    reasons.push("Age is less than 18 years (Inclusion requirement)");
  }

  // Explicit values that trigger exclusion
  const bh = patient.cldHistory;
  const exam = patient.examination;
  const comp = patient.complaints;
  const endo = patient.endoscopy;

  // 1. Previous endoscopic intervention (EVL) or surgical shunts
  if (endo && (endo.additionalFindings?.toLowerCase().includes("evl") || endo.additionalFindings?.toLowerCase().includes("ligation") || endo.additionalFindings?.toLowerCase().includes("shunt"))) {
    reasons.push("Previous EVL or surgical shunt therapy detected");
  }

  // 2. Beta blockers and nitrates
  if (bh?.drugHistory?.betaBlockers) {
    reasons.push("Current beta-blocker use (Exclusion criterion)");
  }
  if (bh?.drugHistory?.nitrates) {
    reasons.push("Current nitrate use (Exclusion criterion)");
  }

  // 3. Hepatic encephalopathy grade III/IV
  if (comp?.lossOfConsciousness || (exam?.general?.gcs !== "" && exam?.general?.gcs !== undefined && exam.general.gcs < 9)) {
    reasons.push("Hepatic encephalopathy Grade III/IV or stupor/coma (GCS < 9)");
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
  };
}

/**
 * Approximate probability primitive for Independent Student's t-distribution
 * Returns a 2-tailed p-value.
 */
export function getStudentTPValue(t: number, df: number): number {
  t = Math.abs(t);
  if (df <= 0) return 1.0;

  // Ref: Numerical recipes polynomial approximation for regularized beta function
  // We can also use a simple continued fraction or standard normal approximation for high df,
  // and a beautiful formula for small df.
  if (df > 100) {
    // Normal approximation
    const x = t * (1 - 1 / (4 * df));
    return 2 * (1 - normalCumulative(x));
  }

  // Trapezoidal numerical integration of student-t density is extremely robust or standard formula:
  // Let's use standard trigonometric/polynomial approximations for student-t
  const x = df / (df + t * t);
  let p = 0;

  if (df % 2 === 1) {
    // Odd degrees of freedom
    let theta = Math.atan(t / Math.sqrt(df));
    let sum = 0;
    if (df > 1) {
      let term = Math.cos(theta);
      let runningSum = term;
      for (let i = 1; i <= (df - 3) / 2; i++) {
        term = term * Math.cos(theta) * Math.cos(theta) * (2 * i) / (2 * i + 1);
        runningSum += term;
      }
      sum = runningSum;
    }
    p = 1 - (2 / Math.PI) * (theta + (df > 1 ? Math.sin(theta) * sum : 0));
  } else {
    // Even degrees of freedom
    let theta = Math.atan(t / Math.sqrt(df));
    let term = Math.sin(theta);
    let runningSum = term;
    if (df > 2) {
      for (let i = 1; i <= (df - 2) / 2 - 1; i++) {
        term = term * Math.cos(theta) * Math.cos(theta) * (2 * i - 1) / (2 * i);
        runningSum += term;
      }
    }
    p = 1 - Math.sin(theta) * (1 + (df > 2 ? runningSum : 0));
    // Alternate standard series
  }

  return Math.max(0.0001, Math.min(1.0, df === 1 ? 1 - (2 / Math.PI) * Math.atan(t) : p));
}

function normalCumulative(x: number): number {
  // Abramowitz and Stegun formula 26.2.17 (precision 7.5e-8)
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;

  const t = 1 / (1 + p * Math.abs(x));
  const exp = Math.exp(-0.5 * x * x);
  const val = 1 - (exp / Math.sqrt(2 * Math.PI)) * (b1 * t + b2 * t * t + b3 * Math.pow(t, 3) + b4 * Math.pow(t, 4) + b5 * Math.pow(t, 5));
  return x >= 0 ? val : 1 - val;
}

/**
 * Calculates Descriptive Metrics & Welch's T-Test comparing Varices vs Non-Varices
 */
export function calculateRegistryAnalytics(patients: PatientProfile[]): AnalyticsData {
  const nonDraftPatients = patients.filter(p => !p.isDraft);
  const allPatientsCount = nonDraftPatients.length;
  // Standard clinical research checks only eligible patient data
  const eligible = nonDraftPatients.filter(p => checkPatientEligibility(p).isEligible);
  const eligibleCount = eligible.length;
  const excludedCount = allPatientsCount - eligibleCount;

  // We should compute stats based on eligible cohort
  const analysisCohort = eligibleCount > 0 ? eligible : nonDraftPatients; // fallback to all non-drafts if none eligible

  const varicesGroup = analysisCohort.filter(p => p.endoscopy.esophagealVarices === "Present");
  const noVaricesGroup = analysisCohort.filter(p => p.endoscopy.esophagealVarices === "Absent");

  const pvdValues = analysisCohort.map(p => Number(p.ultrasound.portalVeinDiameter)).filter(v => !isNaN(v) && v > 0);
  const spleenValues = analysisCohort.map(p => Number(p.ultrasound.splenicSize)).filter(v => !isNaN(v) && v > 0);

  const meanPVD = pvdValues.length ? pvdValues.reduce((a, b) => a + b, 0) / pvdValues.length : 0;
  const meanSpleen = spleenValues.length ? spleenValues.reduce((a, b) => a + b, 0) / spleenValues.length : 0;

  // Calc Distributions
  const childPughDistribution = { classA: 0, classB: 0, classC: 0 };
  analysisCohort.forEach(p => {
    if (p.scores.childPughClass === "Class A") childPughDistribution.classA++;
    else if (p.scores.childPughClass === "Class B") childPughDistribution.classB++;
    else if (p.scores.childPughClass === "Class C") childPughDistribution.classC++;
  });

  // Varices PVD stats
  const vPVDList = varicesGroup.map(p => Number(p.ultrasound.portalVeinDiameter)).filter(v => !isNaN(v) && v > 0);
  const vMeanPVD = vPVDList.length ? vPVDList.reduce((a, b) => a + b, 0) / vPVDList.length : 0;
  const vSdPVD = vPVDList.length > 1 ? Math.sqrt(vPVDList.map(v => Math.pow(v - vMeanPVD, 2)).reduce((a, b) => a + b, 0) / (vPVDList.length - 1)) : 0;

  const vSpleenList = varicesGroup.map(p => Number(p.ultrasound.splenicSize)).filter(v => !isNaN(v) && v > 0);
  const vMeanSpleen = vSpleenList.length ? vSpleenList.reduce((a, b) => a + b, 0) / vSpleenList.length : 0;
  const vSdSpleen = vSpleenList.length > 1 ? Math.sqrt(vSpleenList.map(v => Math.pow(v - vMeanSpleen, 2)).reduce((a, b) => a + b, 0) / (vSpleenList.length - 1)) : 0;

  // No Varices PVD stats
  const nvPVDList = noVaricesGroup.map(p => Number(p.ultrasound.portalVeinDiameter)).filter(v => !isNaN(v) && v > 0);
  const nvMeanPVD = nvPVDList.length ? nvPVDList.reduce((a, b) => a + b, 0) / nvPVDList.length : 0;
  const nvSdPVD = nvPVDList.length > 1 ? Math.sqrt(nvPVDList.map(v => Math.pow(v - nvMeanPVD, 2)).reduce((a, b) => a + b, 0) / (nvPVDList.length - 1)) : 0;

  const nvSpleenList = noVaricesGroup.map(p => Number(p.ultrasound.splenicSize)).filter(v => !isNaN(v) && v > 0);
  const nvMeanSpleen = nvSpleenList.length ? nvSpleenList.reduce((a, b) => a + b, 0) / nvSpleenList.length : 0;
  const nvSdSpleen = nvSpleenList.length > 1 ? Math.sqrt(nvSpleenList.map(v => Math.pow(v - nvMeanSpleen, 2)).reduce((a, b) => a + b, 0) / (nvSpleenList.length - 1)) : 0;

  // Formulate Welch's (unpaired) t-test
  let tTest: AnalyticsData["tTest"] = null;
  if (vPVDList.length > 1 && nvPVDList.length > 1) {
    const s1_sq = Math.pow(vSdPVD, 2);
    const s2_sq = Math.pow(nvSdPVD, 2);
    const n1 = vPVDList.length;
    const n2 = nvPVDList.length;

    const denominator = Math.sqrt((s1_sq / n1) + (s2_sq / n2));
    const tValue = denominator > 0 ? (vMeanPVD - nvMeanPVD) / denominator : 0;

    // Welch-Satterthwaite equation for degrees of freedom
    const numeratorDf = Math.pow((s1_sq / n1) + (s2_sq / n2), 2);
    const denominatorDf = (Math.pow(s1_sq / n1, 2) / (n1 - 1)) + (Math.pow(s2_sq / n2, 2) / (n2 - 1));
    const df = denominatorDf > 0 ? numeratorDf / denominatorDf : n1 + n2 - 2;

    const pValue = getStudentTPValue(tValue, df);

    tTest = {
      tValue,
      pValue,
      df: Math.round(df * 10) / 10,
      significant: pValue < 0.05,
    };
  }

  return {
    totalPatients: allPatientsCount,
    patientsWithVarices: varicesGroup.length,
    patientsWithoutVarices: noVaricesGroup.length,
    eligiblePatients: eligibleCount,
    excludedPatients: excludedCount,
    meanPortalVeinDiameter: Math.round(meanPVD * 100) / 100,
    meanSpleenSize: Math.round(meanSpleen * 100) / 100,
    childPughDistribution,
    varicesGroup: {
      meanPVD: Math.round(vMeanPVD * 100) / 100,
      sdPVD: Math.round(vSdPVD * 100) / 100,
      count: varicesGroup.length,
      meanSpleen: Math.round(vMeanSpleen * 100) / 100,
      sdSpleen: Math.round(vSdSpleen * 100) / 100,
    },
    noVaricesGroup: {
      meanPVD: Math.round(nvMeanPVD * 100) / 100,
      sdPVD: Math.round(nvSdPVD * 100) / 100,
      count: noVaricesGroup.length,
      meanSpleen: Math.round(nvMeanSpleen * 100) / 100,
      sdSpleen: Math.round(nvSdSpleen * 100) / 100,
    },
    tTest,
  };
}

export interface ROCCoordinate {
  cutoff: number;
  fpr: number; // 1-specificity
  tpr: number; // sensitivity
  sensitivity: number;
  specificity: number;
  ppv: number;
  npv: number;
  youden: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
}

/**
 * Calculates the coordinates of ROC Curve of Portal Vein Diameter predicting Varices (Present vs Absent)
 */
export function calculateROCCurve(patients: PatientProfile[]): {
  coordinates: ROCCoordinate[];
  optimalCutoff: ROCCoordinate | null;
  auc: number;
} {
  // Standard clinical research requires eligible cohort
  const eligible = patients.filter(p => checkPatientEligibility(p).isEligible);
  const analysisCohort = eligible.length > 0 ? eligible : patients;

  if (analysisCohort.length === 0) {
    return { coordinates: [], optimalCutoff: null, auc: 0 };
  }

  // Find range of PVD
  const pvdValues = analysisCohort
    .map(p => Number(p.ultrasound.portalVeinDiameter))
    .filter(v => !isNaN(v) && v > 0);

  if (pvdValues.length === 0) {
    return { coordinates: [], optimalCutoff: null, auc: 0 };
  }

  // Build grid of thresholds (e.g. from 8.0 to 18.0 mm in steps of 0.5)
  const minThresh = 8.0;
  const maxThresh = 18.0;
  const coordinates: ROCCoordinate[] = [];

  // Sort values to compute accurate AUC below
  // For ROC, we step from slightly below minimum to slightly above maximum
  for (let c = minThresh; c <= maxThresh; c += 0.5) {
    let tp = 0; // Varices Present && PVD >= Cutoff
    let fp = 0; // Varices Absent && PVD >= Cutoff
    let tn = 0; // Varices Absent && PVD < Cutoff
    let fn = 0; // Varices Present && PVD < Cutoff

    analysisCohort.forEach(p => {
      const pvd = Number(p.ultrasound.portalVeinDiameter);
      if (isNaN(pvd) || pvd <= 0) return;

      const hasVarices = p.endoscopy.esophagealVarices === "Present";

      if (pvd >= c) {
        if (hasVarices) tp++;
        else fp++;
      } else {
        if (hasVarices) fn++;
        else tn++;
      }
    });

    const sensitivity = tp + fn > 0 ? tp / (tp + fn) : 0;
    const specificity = tn + fp > 0 ? tn / (tn + fp) : 0;
    const ppv = tp + fp > 0 ? tp / (tp + fp) : 0;
    const npv = tn + fn > 0 ? tn / (tn + fn) : 0;
    const youden = sensitivity + specificity - 1;

    coordinates.push({
      cutoff: c,
      fpr: Math.round((1 - specificity) * 100) / 100,
      tpr: Math.round(sensitivity * 100) / 100,
      sensitivity: Math.round(sensitivity * 100) / 100,
      specificity: Math.round(specificity * 100) / 100,
      ppv: Math.round(ppv * 100) / 100,
      npv: Math.round(npv * 100) / 100,
      youden: Math.round(youden * 100) / 100,
      tp,
      fp,
      tn,
      fn,
    });
  }

  // Calculate AUC using trapezoidal rule
  // Sort coordinates by False Positive Rate (FPR) ascending
  // (FPR = 0 at cutoff = 18+, FPR = 1 at cutoff = 8-)
  // Let's sort coordinates by FPR ascending, TPR ascending for trapezoid area
  const sortedCorr = [...coordinates].sort((a, b) => a.fpr - b.fpr);

  // Add boundary points: (0,0) and (1,1) if not present
  if (sortedCorr[0].fpr > 0) {
    sortedCorr.unshift({
      cutoff: maxThresh + 0.5,
      fpr: 0,
      tpr: 0,
      sensitivity: 0,
      specificity: 1,
      ppv: 0,
      npv: 0,
      youden: 0,
      tp: 0,
      fp: 0,
      tn: 0,
      fn: 0,
    });
  }
  if (sortedCorr[sortedCorr.length - 1].fpr < 1) {
    sortedCorr.push({
      cutoff: minThresh - 0.5,
      fpr: 1,
      tpr: 1,
      sensitivity: 1,
      specificity: 0,
      ppv: 0,
      npv: 0,
      youden: 0,
      tp: 0,
      fp: 0,
      tn: 0,
      fn: 0,
    });
  }

  let auc = 0;
  for (let i = 1; i < sortedCorr.length; i++) {
    const trapWidth = sortedCorr[i].fpr - sortedCorr[i - 1].fpr;
    const meanHeight = (sortedCorr[i].tpr + sortedCorr[i - 1].tpr) / 2;
    auc += trapWidth * meanHeight;
  }

  // Identify Optimal Cutoff where Youden's is maximized
  let optimalCutoff = coordinates[0];
  let maxYouden = -2;
  coordinates.forEach(coord => {
    if (coord.youden > maxYouden) {
      maxYouden = coord.youden;
      optimalCutoff = coord;
    }
  });

  return {
    coordinates,
    optimalCutoff: optimalCutoff || null,
    auc: Math.max(0, Math.min(1.0, Math.round(auc * 1000) / 1000)),
  };
}

/**
 * Converts a patient array into a CSV file conformant with Excel/SPSS import.
 */
export function convertRegistryToCSV(patients: PatientProfile[]): string {
  const headers = [
    "Study_ID",
    "Enrollment_Date",
    "Hospital_Number",
    "Patient_Name",
    "Age",
    "Sex",
    "Religion",
    "Address",
    "Occupation",
    "Duration_of_CLD",
    "Duration_Unit",
    "Etiology_Alcohol",
    "Etiology_Viral",
    "Etiology_NASH",
    "Etiology_Autoimmune",
    "Etiology_Others",
    "Drug_Diuretics",
    "Drug_NSAIDs",
    "Drug_BetaBlockers",
    "Drug_Nitrates",
    "Comorb_Diabetes",
    "Comorb_Hypertension",
    "Comorb_CKD",
    "Comorb_CAD",
    "Comorb_COPD",
    "Comorb_Thyroid",
    "Is_Alcohol_Consumer",
    "Alcohol_Grams_Per_Day",
    "IV_Drug_Abuse",
    "Sexual_Promiscuity",
    "Family_History_CLD",
    "Sympt_Jaundice",
    "Sympt_Ascites",
    "Sympt_AbdominalPain",
    "Sympt_HE_Confusion",
    "Sympt_Hematemesis",
    "Sympt_Melena",
    "Sympt_Oliguria",
    "Ht_cm",
    "Wt_kg",
    "BMI",
    "BP_Systolic",
    "BP_Diastolic",
    "Pulse_bpm",
    "RR_bpm",
    "SpO2_pct",
    "Temp_F",
    "Ascites_Grade",
    "Liver_Palpable",
    "Liver_Size_cm",
    "Splenomegaly",
    "Dilated_Abdominal_Veins",
    "Hb_g_dl",
    "Total_Count",
    "Platelet_Count",
    "Serum_Sodium",
    "Serum_Potassium",
    "Urea",
    "Creatinine",
    "Total_Bilirubin",
    "Direct_Bilirubin",
    "SGOT_AST",
    "SGPT_ALT",
    "Alp",
    "Albumen",
    "Total_Protein",
    "INR",
    "HBsAg",
    "Anti_HCV",
    "HIV_1_2",
    "Stool_OBT",
    "USG_Liver_Size_cm",
    "USG_Echotexture",
    "USG_Portal_Vein_Diameter_mm",
    "USG_Spleen_Size_cm",
    "USG_Ascites",
    "USG_Flow_Direction",
    "Endo_Esophageal_Varices",
    "Endo_Grade_Of_Varices",
    "Endo_Gastric_Varices",
    "Endo_Portal_Hypertensive_Gastropathy",
    "Child_Pugh_Points",
    "Child_Pugh_Class",
    "MELD_Na_Score",
    "Eligibility_Status"
  ];

  const rows = patients.map(p => {
    const elig = checkPatientEligibility(p);

    const values = [
      p.demographics.codeNo,
      p.demographics.date,
      p.demographics.hospitalNumber,
      p.demographics.name || "Anonymized",
      p.demographics.age,
      p.demographics.sex,
      p.demographics.religion,
      p.demographics.address,
      p.demographics.occupation,
      p.cldHistory.durationValue,
      p.cldHistory.durationUnit,
      p.cldHistory.etiology.alcohol ? 1 : 0,
      p.cldHistory.etiology.hbvHcv ? 1 : 0,
      p.cldHistory.etiology.nash ? 1 : 0,
      p.cldHistory.etiology.autoimmune ? 1 : 0,
      p.cldHistory.etiology.others ? 1 : 0,
      p.cldHistory.drugHistory.diuretics ? 1 : 0,
      p.cldHistory.drugHistory.nsaids ? 1 : 0,
      p.cldHistory.drugHistory.betaBlockers ? 1 : 0,
      p.cldHistory.drugHistory.nitrates ? 1 : 0,
      p.cldHistory.comorbidities.diabetes ? 1 : 0,
      p.cldHistory.comorbidities.hypertension ? 1 : 0,
      p.cldHistory.comorbidities.ckd ? 1 : 0,
      p.cldHistory.comorbidities.cad ? 1 : 0,
      p.cldHistory.comorbidities.copd ? 1 : 0,
      p.cldHistory.comorbidities.thyroid ? 1 : 0,
      p.cldHistory.personalHistory.isAlcoholConsumer,
      p.cldHistory.personalHistory.alcoholGramsPerDay,
      p.cldHistory.personalHistory.ivDrugAbuse,
      p.cldHistory.personalHistory.sexualPromiscuity,
      p.cldHistory.personalHistory.familyHistoryCLD,
      p.complaints.jaundice ? 1 : 0,
      p.complaints.ascites ? 1 : 0,
      p.complaints.abdominalPain ? 1 : 0,
      p.complaints.confusion ? 1 : 0,
      p.complaints.hematemesis ? 1 : 0,
      p.complaints.melena ? 1 : 0,
      p.complaints.oliguria ? 1 : 0,
      p.examination.general.height,
      p.examination.general.weight,
      p.examination.general.bmi,
      p.examination.vitals.bpSystolic,
      p.examination.vitals.bpDiastolic,
      p.examination.vitals.pulse,
      p.examination.vitals.rr,
      p.examination.vitals.spo2,
      p.examination.vitals.temperature,
      p.examination.abdomen.ascitesGrade,
      p.examination.abdomen.liverPalpable ? 1 : 0,
      p.examination.abdomen.liverSize,
      p.examination.abdomen.splenomegaly ? 1 : 0,
      p.examination.abdomen.dilatedVeins ? 1 : 0,
      p.investigations.hematology.hb,
      p.investigations.hematology.tc,
      p.investigations.hematology.platelet,
      p.investigations.renal.sodium,
      p.investigations.renal.potassium,
      p.investigations.renal.urea,
      p.investigations.renal.creatinine,
      p.investigations.lft.totalBilirubin,
      p.investigations.lft.directBilirubin,
      p.investigations.lft.sgotAST,
      p.investigations.lft.sgptALT,
      p.investigations.lft.alp,
      p.investigations.lft.albumin,
      p.investigations.lft.totalProtein,
      p.investigations.lft.inr,
      p.investigations.viralMarkers.hbsAg,
      p.investigations.viralMarkers.antiHCV,
      p.investigations.viralMarkers.hiv12,
      p.investigations.stoolOBT || "",
      p.ultrasound.liverSize,
      p.ultrasound.echotextureOfLiver,
      p.ultrasound.portalVeinDiameter,
      p.ultrasound.splenicSize,
      p.ultrasound.ascites,
      p.ultrasound.portalVeinFlowDirection,
      p.endoscopy.esophagealVarices,
      p.endoscopy.varicesGrade,
      p.endoscopy.gastricVarices ? 1 : 0,
      p.endoscopy.portalHypertensiveGastropathy ? 1 : 0,
      p.scores.childPughPoints === null ? "" : p.scores.childPughPoints,
      p.scores.childPughClass === null ? "" : p.scores.childPughClass,
      p.scores.meldNaScore === null ? "" : p.scores.meldNaScore,
      elig.isEligible ? "ELIGIBLE" : "EXCLUDED:" + elig.reasons.join(";")
    ];

    return values.map(val => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return str.includes(",") || str.includes("\n") || str.includes(";") ? `"${str}"` : str;
    }).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Seeds high-fidelity clinical simulation data matching Dr. Bhattarai's reference clinical trial study parameters:
 * Mean portal vein diameter without esophageal varices: 10.8 mm (SD ~1.1)
 * Mean portal vein diameter with esophageal varices: 13.7 mm (SD ~1.1)
 * Total Patients suggested target N=75 (sample size calculation)
 */
export function generateRefMockCohort(): PatientProfile[] {
  const cohort: PatientProfile[] = [];
  const religions = ["Hindu", "Buddhist", "Christian", "Islam", "Kirat"];
  const occupations = ["Agriculture", "Government Official", "Business", "Teacher", "Retired", "Homemaker"];
  const addresses = ["Kathmandu", "Lalitpur", "Bhaktapur", "Nuwakot", "Dhading", "Kavre", "Sindhupalchok"];
  const etiologies = ["Alcohol", "Viral (HBV/HCV)", "NASH", "Autoimmune", "Cryptogenic"];

  const nowStr = new Date().toISOString().substring(0, 10);

  // Helper for Box-Muller transform for normal distribution simulation
  const randomNormal = (mean: number, sd: number) => {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return Math.round((num * sd + mean) * 10) / 10;
  };

  // Dr. Bhattarai S. et al reference study suggests sample size 75
  // We'll generate 40 patients with varices (higher portal vein diameters, more advanced CLD)
  // and 35 patients without varices (lower PVD, less advanced CLD/early cirrhosis)

  const nVarices = 40;
  const nNoVarices = 35;

  // Let's create Varices Group (PVD averages around 13.7 mm)
  for (let i = 1; i <= nVarices; i++) {
    const numId = String(i).padStart(3, "0");
    const age = Math.floor(Math.random() * 32) + 38; // 38-70
    const sex = Math.random() > 0.35 ? "Male" : "Female";
    
    // Portal vein diameter: Mean 13.7 mm, SD 1.1
    const pvd = Math.max(11.0, randomNormal(13.7, 1.1));
    const spleen = Math.max(11.5, randomNormal(15.2, 1.4)); // larger spleen

    const mainEtiology = etiologies[Math.floor(Math.random() * etiologies.length)];

    // lab values
    const albumin = Math.round((Math.random() * 1.1 + 2.1) * 10) / 10; // 2.1 - 3.2 (low)
    const bilirubin = Math.round((Math.random() * 3.5 + 1.8) * 10) / 10; // 1.8 - 5.3 (elevated)
    const inr = Math.round((Math.random() * 0.9 + 1.4) * 10) / 10; // 1.4 - 2.3
    const sodium = Math.floor(Math.random() * 11) + 128; // 128 - 138 mmol/l
    const creatinine = Math.round((Math.random() * 0.8 + 0.8) * 10) / 10; // 0.8 - 1.6

    // Child-Pugh and MELD
    let ascitesGrade: "None" | "Mild" | "Moderate" | "Severe" = Math.random() > 0.4 ? "Moderate" : "Mild";
    const encephalopathyGrade = Math.random() > 0.75 ? "Grade I-II" : "None";

    const cp = calculateChildPughScore(bilirubin, albumin, inr, ascitesGrade, encephalopathyGrade);
    const meld = calculateMeldNa(bilirubin, creatinine, inr, sodium);

    cohort.push({
      id: `mock-v-${numId}`,
      demographics: {
        codeNo: `KMC-PVD-${numId}`,
        date: nowStr,
        hospitalNumber: `HOSP-${Math.floor(Math.random() * 89999) + 10000}`,
        name: `${sex === "Male" ? "Ram" : "Sita"} ${["Prasad", "Shrestha", "Adhikari", "Ghale", "Tamang", "Acharya"][Math.floor(Math.random() * 6)]}`,
        age,
        sex,
        religion: religions[Math.floor(Math.random() * religions.length)],
        address: addresses[Math.floor(Math.random() * addresses.length)],
        occupation: occupations[Math.floor(Math.random() * occupations.length)],
      },
      cldHistory: {
        durationValue: Math.floor(Math.random() * 48) + 12, // 1-5 years
        durationUnit: "Months",
        etiology: {
          alcohol: mainEtiology === "Alcohol",
          hbvHcv: mainEtiology === "Viral (HBV/HCV)",
          nash: mainEtiology === "NASH",
          autoimmune: mainEtiology === "Autoimmune",
          others: mainEtiology === "Cryptogenic",
          othersText: mainEtiology === "Cryptogenic" ? "Cryptogenic liver disease" : "",
        },
        drugHistory: {
          diuretics: Math.random() > 0.2, // standard diuretics are common, doesn't exclude unless beta-blockers/nitrates is ticked
          nsaids: false,
          betaBlockers: false, // avoid beta blocker to remain ELIGIBLE so statistical analysis runs correctly
          nitrates: false,
          others: false,
          othersText: "",
        },
        comorbidities: {
          diabetes: Math.random() > 0.7,
          hypertension: Math.random() > 0.75,
          ckd: false,
          cad: false,
          copd: false,
          thyroid: false,
          others: false,
          othersText: "",
        },
        personalHistory: {
          isAlcoholConsumer: mainEtiology === "Alcohol" ? "Yes" : "No",
          alcoholGramsPerDay: mainEtiology === "Alcohol" ? Math.floor(Math.random() * 60) + 40 : "",
          ivDrugAbuse: "No",
          sexualPromiscuity: "No",
          familyHistoryCLD: "No",
        },
      },
      complaints: {
        jaundice: bilirubin > 2.5,
        ascites: (ascitesGrade as string) !== "None",
        abdominalPain: Math.random() > 0.5,
        difficultyBreathing: (ascitesGrade as string) === "Severe",
        hematemesis: Math.random() > 0.8,
        melena: Math.random() > 0.7,
        lossOfConsciousness: false,
        confusion: encephalopathyGrade !== "None",
        oliguria: false,
        others: false,
        othersText: "",
      },
      examination: {
        general: {
          height: Math.floor(Math.random() * 20) + 155, // 155-175 cm
          weight: Math.floor(Math.random() * 25) + 50, // 50-75 kg
          bmi: 22.4,
          pallor: Math.random() > 0.4,
          icterus: bilirubin > 2.5,
          clubbing: Math.random() > 0.6,
          pedalEdema: Math.random() > 0.4,
          conscious: true,
          oriented: true,
          gcs: 15,
          flappingTremor: encephalopathyGrade !== "None",
        },
        stigmata: {
          whiteNails: Math.random() > 0.5,
          palmarErythema: Math.random() > 0.5,
          duputyrenContracture: Math.random() > 0.8,
          hairLoss: Math.random() > 0.4,
          parotidEnlargement: Math.random() > 0.8,
          spiderNevi: Math.random() > 0.4,
          gynaecomastia: sex === "Male" && Math.random() > 0.5,
          testicularAtrophy: sex === "Male" && Math.random() > 0.6,
        },
        vitals: {
          bpSystolic: Math.floor(Math.random() * 20) + 100, // 100-120
          bpDiastolic: Math.floor(Math.random() * 15) + 65, // 65-80
          pulse: Math.floor(Math.random() * 20) + 75,
          rr: Math.floor(Math.random() * 6) + 16,
          spo2: Math.floor(Math.random() * 4) + 95,
          temperature: Math.round((98.2 + Math.random() * 1.2) * 10) / 10,
        },
        abdomen: {
          ascitesGrade,
          liverPalpable: Math.random() > 0.5,
          liverSize: Math.random() > 0.3 ? 10 : 8,
          splenomegaly: true,
          dilatedVeins: Math.random() > 0.4,
          perRectalExamInfo: "Normal rectal tone, no dark stool on finger",
        },
      },
      investigations: {
        hematology: {
          hb: Math.round((Math.random() * 3.5 + 8.5) * 10) / 10, // 8.5 - 12.0
          tc: Math.floor(Math.random() * 4000) + 4000,
          dcNeutrophils: 64,
          dcLymphocytes: 28,
          platelet: Math.floor(Math.random() * 60000) + 55000, // 55k - 115k (thrombocytopenia standard in varices/PHT)
          rbcCount: 3.5,
        },
        renal: {
          urea: Math.floor(Math.random() * 20) + 25,
          creatinine,
          sodium,
          potassium: Math.round((Math.random() * 1.2 + 3.4) * 10) / 10,
          rbs: Math.floor(Math.random() * 60) + 100,
        },
        lft: {
          totalBilirubin: bilirubin,
          directBilirubin: Math.round((bilirubin * 0.6) * 10) / 10,
          sgotAST: Math.floor(Math.random() * 80) + 60,
          sgptALT: Math.floor(Math.random() * 60) + 40,
          alp: 190,
          ggt: 85,
          albumin,
          totalProtein: Math.round((albumin + 3.2) * 10) / 10,
          ptSeconds: Math.floor(Math.random() * 6) + 16,
          inr,
        },
        viralMarkers: {
          hbsAg: mainEtiology === "Viral (HBV/HCV)" ? "Reactive" : "Non-Reactive",
          antiHCV: "Non-Reactive",
          hiv12: "Non-Reactive",
        },
        stoolOBT: Math.random() > 0.45 ? "Positive" : "Negative",
      },
      ultrasound: {
        liverSize: 11.2,
        echotextureOfLiver: "Coarse",
        echotextureOtherText: "",
        portalVeinDiameter: pvd,
        splenicSize: spleen,
        ascites: ascitesGrade,
        portalVeinFlowDirection: "Hepatopetal",
      },
      endoscopy: {
        esophagealVarices: "Present",
        varicesGrade: Math.random() > 0.5 ? "Large varices" : "Small varices",
        gastricVarices: Math.random() > 0.8,
        portalHypertensiveGastropathy: Math.random() > 0.4,
        additionalFindings: "Grade II esophageal varices. Recommending beta-blockers post-assessment.",
      },
      scores: {
        childPughPoints: cp.score,
        childPughClass: cp.class,
        meldNaScore: meld.meldNa,
        calculatedAt: nowStr,
      },
      createdAt: nowStr,
      updatedAt: nowStr,
    });
  }

  // Then create Non-Varices Group (PVD averages around 10.8 mm)
  for (let i = 1; i <= nNoVarices; i++) {
    const numId = String(nVarices + i).padStart(3, "0");
    const age = Math.floor(Math.random() * 25) + 35; // 35-60 (slightly younger)
    const sex = Math.random() > 0.45 ? "Male" : "Female";
    
    // Portal vein diameter: Mean 10.8 mm, SD 1.1
    const pvd = Math.min(13.2, Math.max(8.0, randomNormal(10.8, 1.1)));
    const spleen = Math.min(13.5, randomNormal(12.3, 1.0)); // normal or slightly enlarged spleen

    const mainEtiology = etiologies[Math.floor(Math.random() * etiologies.length)];

    // lab values: closer to normal
    const albumin = Math.round((Math.random() * 1.0 + 3.2) * 10) / 10; // 3.2 - 4.2
    const bilirubin = Math.round((Math.random() * 1.2 + 0.8) * 10) / 10; // 0.8 - 2.0
    const inr = Math.round((Math.random() * 0.4 + 1.1) * 10) / 10; // 1.1 - 1.5
    const sodium = Math.floor(Math.random() * 6) + 135; // 135 - 141
    const creatinine = Math.round((Math.random() * 0.4 + 0.6) * 10) / 10; // 0.6 - 1.0

    const ascitesGrade = "None";
    const encephalopathyGrade = "None";

    const cp = calculateChildPughScore(bilirubin, albumin, inr, ascitesGrade, encephalopathyGrade);
    const meld = calculateMeldNa(bilirubin, creatinine, inr, sodium);

    cohort.push({
      id: `mock-nv-${numId}`,
      demographics: {
        codeNo: `KMC-PVD-${numId}`,
        date: nowStr,
        hospitalNumber: `HOSP-${Math.floor(Math.random() * 89999) + 10000}`,
        name: `${sex === "Male" ? "Hari" : "Maya"} ${["Sharma", "Thapa", "Adhikari", "Giri", "Karki", "Devkota"][Math.floor(Math.random() * 6)]}`,
        age,
        sex,
        religion: religions[Math.floor(Math.random() * religions.length)],
        address: addresses[Math.floor(Math.random() * addresses.length)],
        occupation: occupations[Math.floor(Math.random() * occupations.length)],
      },
      cldHistory: {
        durationValue: Math.floor(Math.random() * 24) + 6, // 6-30 months
        durationUnit: "Months",
        etiology: {
          alcohol: mainEtiology === "Alcohol",
          hbvHcv: mainEtiology === "Viral (HBV/HCV)",
          nash: mainEtiology === "NASH",
          autoimmune: mainEtiology === "Autoimmune",
          others: mainEtiology === "Cryptogenic",
          othersText: mainEtiology === "Cryptogenic" ? "Cryptogenic liver disease" : "",
        },
        drugHistory: {
          diuretics: Math.random() > 0.6,
          nsaids: false,
          betaBlockers: false,
          nitrates: false,
          others: false,
          othersText: "",
        },
        comorbidities: {
          diabetes: Math.random() > 0.85,
          hypertension: Math.random() > 0.85,
          ckd: false,
          cad: false,
          copd: false,
          thyroid: false,
          others: false,
          othersText: "",
        },
        personalHistory: {
          isAlcoholConsumer: mainEtiology === "Alcohol" ? "Yes" : "No",
          alcoholGramsPerDay: mainEtiology === "Alcohol" ? Math.floor(Math.random() * 40) + 20 : "",
          ivDrugAbuse: "No",
          sexualPromiscuity: "No",
          familyHistoryCLD: "No",
        },
      },
      complaints: {
        jaundice: bilirubin > 2.0,
        ascites: false,
        abdominalPain: Math.random() > 0.7,
        difficultyBreathing: false,
        hematemesis: false,
        melena: false,
        lossOfConsciousness: false,
        confusion: false,
        oliguria: false,
        others: false,
        othersText: "",
      },
      examination: {
        general: {
          height: Math.floor(Math.random() * 20) + 155,
          weight: Math.floor(Math.random() * 20) + 55,
          bmi: 23.1,
          pallor: Math.random() > 0.8,
          icterus: bilirubin > 2.0,
          clubbing: Math.random() > 0.8,
          pedalEdema: false,
          conscious: true,
          oriented: true,
          gcs: 15,
          flappingTremor: false,
        },
        stigmata: {
          whiteNails: Math.random() > 0.7,
          palmarErythema: Math.random() > 0.7,
          duputyrenContracture: false,
          hairLoss: Math.random() > 0.7,
          parotidEnlargement: false,
          spiderNevi: Math.random() > 0.8,
          gynaecomastia: sex === "Male" && Math.random() > 0.8,
          testicularAtrophy: sex === "Male" && Math.random() > 0.85,
        },
        vitals: {
          bpSystolic: Math.floor(Math.random() * 15) + 110,
          bpDiastolic: Math.floor(Math.random() * 10) + 70,
          pulse: Math.floor(Math.random() * 15) + 70,
          rr: Math.floor(Math.random() * 4) + 14,
          spo2: 98,
          temperature: Math.round((98.0 + Math.random() * 0.8) * 10) / 10,
        },
        abdomen: {
          ascitesGrade: "None",
          liverPalpable: Math.random() > 0.3,
          liverSize: Math.random() > 0.5 ? 12 : 10,
          splenomegaly: Math.random() > 0.6, // some may have splenomegaly
          dilatedVeins: false,
          perRectalExamInfo: "Normal rectal find, no hemorrhoids",
        },
      },
      investigations: {
        hematology: {
          hb: Math.round((Math.random() * 3.0 + 11.5) * 10) / 10, // 11.5 - 14.5
          tc: Math.floor(Math.random() * 4000) + 5000,
          dcNeutrophils: 60,
          dcLymphocytes: 32,
          platelet: Math.floor(Math.random() * 100000) + 130000, // 130k - 230k (higher plates)
          rbcCount: 4.2,
        },
        renal: {
          urea: Math.floor(Math.random() * 15) + 20,
          creatinine,
          sodium,
          potassium: Math.round((Math.random() * 1.0 + 3.6) * 10) / 10,
          rbs: Math.floor(Math.random() * 40) + 90,
        },
        lft: {
          totalBilirubin: bilirubin,
          directBilirubin: Math.round((bilirubin * 0.5) * 10) / 10,
          sgotAST: Math.floor(Math.random() * 40) + 30,
          sgptALT: Math.floor(Math.random() * 30) + 25,
          alp: 130,
          ggt: 45,
          albumin,
          totalProtein: Math.round((albumin + 3.4) * 10) / 10,
          ptSeconds: Math.floor(Math.random() * 3) + 13,
          inr,
        },
        viralMarkers: {
          hbsAg: mainEtiology === "Viral (HBV/HCV)" ? "Reactive" : "Non-Reactive",
          antiHCV: "Non-Reactive",
          hiv12: "Non-Reactive",
        },
        stoolOBT: Math.random() > 0.15 ? "Negative" : "Not Done",
      },
      ultrasound: {
        liverSize: 12.8,
        echotextureOfLiver: "Coarse",
        echotextureOtherText: "",
        portalVeinDiameter: pvd,
        splenicSize: spleen,
        ascites: "None",
        portalVeinFlowDirection: "Hepatopetal",
      },
      endoscopy: {
        esophagealVarices: "Absent",
        varicesGrade: "No varices",
        gastricVarices: false,
        portalHypertensiveGastropathy: false,
        additionalFindings: "Normal upper GI endoscopy. No visible esophageal or gastric varices.",
      },
      scores: {
        childPughPoints: cp.score,
        childPughClass: cp.class,
        meldNaScore: meld.meldNa,
        calculatedAt: nowStr,
      },
      createdAt: nowStr,
      updatedAt: nowStr,
    });
  }

  return cohort;
}
