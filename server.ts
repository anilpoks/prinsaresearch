import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Crucial: parse JSON payloads with high limit for statistical datasets
  app.use(express.json({ limit: "15mb" }));

  // Initialize Gemini client lazily
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return null;
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });
    }
    return aiClient;
  }

  // Thesis Generator Server endpoint
  app.post("/api/thesis/generate", async (req, res) => {
    try {
      const { section, statsSummary, clinicalContext } = req.body;
      if (!section || !statsSummary) {
        return res.status(400).json({ error: "Missing required parameters: section and statsSummary" });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.status(503).json({
          error: "GEMINI_API_KEY is not configured on the server-side.",
          isFallback: true
        });
      }

      const statsText = JSON.stringify(statsSummary, null, 2);
      
      let prompt = "";
      let systemInstruction = "You are an elite clinical research biostatistician and surgical professor assisting an MD candidate writing their clinical thesis at Kathmandu Medical College (KMC). Your tone is strictly academic, highly authoritative, formal, and publication-ready. Never speak casually. Avoid promotional adjectives. Utilize standard medical terminology.";

      switch (section) {
        case "results":
          systemInstruction += " You specialize in compiling Chapter 4: Results. Generate extensive text and clean markdown tables. Ensure the text explains the statistics (t-test p-values, ANOVA F-test, Youden cutoffs) with statistical accuracy.";
          prompt = `
You are writing "Chapter 4: Results" for an MD Thesis. 
The study analyzed the correlation between Portal Vein Diameter (PVD) on ultrasonography and the presence of Esophageal Varices on endoscopy in patients with Chronic Liver Disease (CLD) at Kathmandu Medical College (KMC), Nepal.

Using the following verified statistical data from the registry, generate a rigorous and extremely thorough Results Chapter:

${statsText}

Additional user clinical context specified: ${clinicalContext || "None"}

Please structure your chapter into sections:
1. Demographic Characteristics of the Cohort (Table 1: Age, gender split. Include a descriptive paragraph noting the mean age, SD, and sex percentages).
2. Etiology of Chronic Liver Disease (Table 2: Counts and % for Alcohol, Viral Hep, NASH, Autoimmune, Cryptogenic. Note the dominant etiology: alcohol).
3. Clinical Presentations and Symptoms (Table 3: Counts and % of clinical symptoms like Ascites, Jaundice, Hematemesis, Melena, Hepatic Encephalopathy).
4. Detailed Laboratory Profile (Table 4: Mean ± SD tables for Hematology and Liver function metrics like Hb, Platelets, Bilirubin, Albumin, INR, Creatinine).
5. Ultrasonographic Findings (Table 5: Mean ± SD for Portal Vein Diameter and Spleen size/length).
6. Esophagogastroduodenoscopy (EGD) Outcomes (Table 6: Count and % of Varices presence, and variceal grades: None vs Small vs Large).
7. Primary Outcome Analysis: PVD vs Varices outcome (Table 7: Contrast mean PVD in Varices Present vs Varices Absent. Include the exact Welch unpaired t-test statistics: t-value, degrees of freedom, and p-value. Detail if it is highly statistically significant. Explain that patients with varices had significantly larger portal vein diameters).
8. ROC Curve Performance Analysis of Portal Vein Diameter as a non-invasive predictor (Table 8: Diagnostic cut-off points, Sensitivity, Specificity, positive predictive value, negative predictive value, and Youden index. Note the diagnostic AUC and the optimal cut-off value).
9. Univariate Risk Models / Predictor Odds Ratios (Table 9: Map Odds Ratios (OR), 95% Confidence Intervals, and Wald t-test p-values for key exposure variables like Platelets <100k, PVD >=13mm, Albumin <3.0, Advanced CP Class B/C, Splash size >=13cm, etc.).
10. One-Way ANOVA of PVD across Varices Severity (Table 10: Comparison of Mean PVD across Variceal size grades: None vs Small vs Large. Report the calculated SS_between, SS_within, degrees of freedom, F-statistic, and ANOVA p-value).

Produce comprehensive, professional paragraphs between each table to read exactly like an elite scientific publication. Ensure every single number matches the provided statistical data perfectly. Do not make up fake calculations.
`;
          break;

        case "discussion":
          systemInstruction += " You specialize in compiling Chapter 5: Discussion. Ensure deep physiological rationale is integrated, linking portal hypertension to splenomegaly and collateral varices.";
          prompt = `
You are writing "Chapter 5: Discussion" for an MD Thesis. 
Write an extensive, comprehensive scholarly Discussion Section evaluating the diagnostic accuracy of Portal Vein Diameter (PVD) on ultrasonography as a non-invasive surrogate marker of esophageal varices in portal hypertension.

Integrate the study's specific findings:
${statsText}

You MUST explicitly reference, analyze, and compare your findings to the following Nepalese literature:
1. "Bhattarai et al. conducted in Nepal", which reported a mean portal vein diameter of 13.73 mm among patients with varices compared with 10.80 mm among patients without varices.
2. "Gyawali et al.", who reported that a portal vein diameter exceeding 12.8 mm was significantly associated with gastroesophageal varices.

Be sure to address:
- Pathophysiological mechanisms: Explain how progressive intrahepatic resistance increases portal venous pressure, causing compensatory dilatation of the portal vein system and the formation of portosystemic collaterals (esophageal varices) and spleen congestive enlargement.
- Compare the exact mean values of PVD from your data with Bhattarai et al. and Gyawali et al. Point out if your registry results corroborate, extend, or differ from their reported guidelines.
- Detail the clinical and economic implications for resource-limited settings like Nepal. Highlight how non-invasive screening via ultrasound (which is widely available, cost-effective, and safe) can help triage and prioritize high-risk patients for expensive, invasive endoscopic screening in Kathmandu and rural Nepal.
- Discuss limitations of the study (single-center registry, sample size, operator dependency of ultrasound).

Write this discussion in a highly academic, elegant, and sophisticated style without using flowery marketing words. Write at least 4-5 long, comprehensive paragraphs of mature clinical analysis.
`;
          break;

        case "abstract":
          prompt = `
Generate a fully structured, clinical journal style MD Thesis Abstract (Background & Aims, Methods, Results, Conclusion, Keywords) based on the Kathmandu Medical College child study cohort:

${statsText}

Keep it crisp, word-limited (approx. 250-300 words), and highly impactful. Ensure exact numbers like Study N, Mean Age, Mean PVD, AUC value, optimal cut-off, and significant p-values are embedded into the Results sentence of the abstract.
`;
          break;

        case "conclusion":
          prompt = `
Write the "Conclusion" chapter for the MD Thesis based on this statistical context:
${statsText}

Conclude clearly on:
- The validity of Portal Vein Diameter on ultrasonography as a non-invasive surrogate marker.
- The statistical strength of PVD in differentiating between patients with and without esophageal varices.
- Its performance index (AUC/ROC) and Youden cutoff for clinical guidance.
`;
          break;

        case "recommendations":
          prompt = `
Formulate realistic and robust "Clinical & Policy Recommendations" based on the results:
${statsText}

Address:
- Routine measurement and documentation of PVD in standard abdominal ultrasounds for all CLD patients in Nepalese clinics.
- Setting explicit clinical referral criteria for upper gastrointestinal endoscopy based on your optimal cutoff.
- Educating rural medical practitioners in Nepal on non-invasive screening proxies to maximize safety.
- Designing a larger multi-center Nepalese national trial to validate these screening cutoffs.
`;
          break;

        case "spss":
          prompt = `
Generate a highly descriptive technical guide for SPSS Analysis.
Using this dataset profile:
${statsText}

Provide two components:
1. SPSS Variable Definition View table (Variable Name, Type, Width, Decimals, Label, Values Coding, Measure) to help the student set up their SPSS datasheet.
2. Copy-pasteable SPSS Syntax commands (.sps syntax code) to replicate:
   - Descriptive statistics for continuous and categorical parameters.
   - Independent sample t-test (Welch/unpaired) comparing PVD between varices present vs absent.
   - One-Way ANOVA comparing PVD across variceal grades.
   - Univariate Logistic Regression commands predicting varices based on PVD, platelet count, and spleen size.
   - ROC Curve syntax for PVD predicting varices.

Explain how to execute the syntax in SPSS.
`;
          break;

        case "manuscript":
          prompt = `
Generate a professional, fully structured Clinical Journal Manuscript Draft based on this cohort:
${statsText}

Follow the standard IMReD (Introduction, Methods, Results, Discussion) framework. Format it to comply with peer-reviewed medical journals such as the Journal of Kathmandu Medical College (JKMC) or Journal of Nepal Medical Association (JNMA). Include Title, Author Institutional Affiliation (Kathmandu Medical College), Abstract, Introduction, Materials & Methods (ethical approvals at KMC, ultrasound and endoscopy protocol), Results (utilizing embedded tables), Discussion (referencing Bhattarai et al. & Gyawali et al.), and Conclusion. Maintain a strict academic style.
`;
          break;

        case "slide":
          prompt = `
Generate a rigorous PowerPoint Slidedeck Outline for the MD Thesis Defense.
Using this cohort statistical profile:
${statsText}

Outline a slide show of 10-12 slides. For each slide, provide:
1. Slide Number and elegant scholarly Title.
2. Structure of Key Bullet Points (findings, numbers, physiological reasons).
3. Detailed, professional Speaker Notes (the script of what the MD candidate should say during their defense to impress the clinical reviewers and external examiners).
`;
          break;

        case "poster":
          prompt = `
Generate a layout blueprint and copy text for an Academic Conference Poster (standard 4'x3' landscape presentation).
Based on this clinical data:
${statsText}

Organize into standard horizontal/columnar bento blocks:
- Title, Authors, and Institution (Kathmandu Medical College)
- Introduction & Problem Statement
- Materials & Methodology
- Key Graphical Results (provide guidance on charts to place)
- Tables (Demographics & Primary Outcomes)
- Discussion & Clinical Implications
- Conclusions & References
Make the text blocks concise, bulleted, and highly readable for a conference setting.
`;
          break;

        case "interpretation":
          prompt = `
Write a detailed Clinical & Statistical Interpretation guide for this patient cohort:
${statsText}

Provide explanations for a clinician of what these metrics mean:
- Welch's unpaired t-test: Why the difference in mean PVD is clinically relevant and how to interpret the p-value.
- One-Way ANOVA: What the F-test measures when looking at None vs. Small vs. Large varices in relation to portal dilatation.
- ROC Curve/AUC: Explain what Area Under the Curve actually means for diagnostic screening, and how sensitivity vs. specificity trade-offs work.
- Odds Ratios (OR): Explain what a risk or odds ratio of X means relative to reference exposures.
`;
          break;

        default:
          return res.status(400).json({ error: "Invalid section" });
      }

      // Generate content using gemini-3.5-flash
      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.1, // keep it deterministic, highly academic
        },
      });

      return res.json({
        content: response.text,
        isSuccess: true
      });

    } catch (error) {
      console.error("Gemini Thesis generation error:", error);
      return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Internal service error during generation",
        isFallback: true
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

