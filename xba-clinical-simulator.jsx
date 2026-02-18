import { useState, useCallback, useMemo } from "react";

// ══════════════════════════════════════════════════════════════════
// BIFACTOR PARAMETERS
// WISC-V: Canivez, McGill, Dombrowski, Watkins, Pritchard, &
//   Jacobson (2020). Assessment, 27(2), 274-296.
//   Table 11, CFA Bifactor Model 4b, Clinical Sample (n = 1,256).
//
// WJ-IV COG: Approximate from Dombrowski, McGill, & Canivez
//   (2017a, 2017b). Values are representative midpoints.
//
// Published omegaHS (Canivez et al., 2020, Table 11):
//   VC = .243, PR = .220, WM = .100, PS = .397
//   General omegaH = .836
//   Minimum for clinical interpretation: .50 (Reise, 2012)
// ══════════════════════════════════════════════════════════════════

function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const CHC = {
  Gc: { name: "Comprehension-Knowledge", color: "#1e40af" },
  Gv: { name: "Visual Processing", color: "#6d28d9" },
  Gf: { name: "Fluid Reasoning", color: "#047857" },
  Gwm: { name: "Working Memory", color: "#b45309" },
  Gs: { name: "Processing Speed", color: "#b91c1c" },
  Glr: { name: "Long-Term Retrieval", color: "#0e7490" },
  Ga: { name: "Auditory Processing", color: "#9d174d" },
};
const CHC_ORDER = ["Gc", "Gv", "Gf", "Gwm", "Gs", "Glr", "Ga"];

const SUBTESTS = [
  { name: "Similarities", abbr: "SI", bat: "WISC-V", chc: "Gc", g: .711, s: .472, src: "C20" },
  { name: "Vocabulary", abbr: "VO", bat: "WISC-V", chc: "Gc", g: .735, s: .445, src: "C20" },
  { name: "Block Design", abbr: "BD", bat: "WISC-V", chc: "Gv", g: .637, s: .499, src: "C20" },
  { name: "Visual Puzzles", abbr: "VP", bat: "WISC-V", chc: "Gv", g: .711, s: .477, src: "C20" },
  { name: "Matrix Reasoning", abbr: "MR", bat: "WISC-V", chc: "Gf", g: .679, s: .320, src: "C20" },
  { name: "Figure Weights", abbr: "FW", bat: "WISC-V", chc: "Gf", g: .692, s: .287, src: "C20" },
  { name: "Digit Span", abbr: "DS", bat: "WISC-V", chc: "Gwm", g: .761, s: .276, src: "C20" },
  { name: "Picture Span", abbr: "PS", bat: "WISC-V", chc: "Gwm", g: .632, s: .281, src: "C20" },
  { name: "Coding", abbr: "CD", bat: "WISC-V", chc: "Gs", g: .521, s: .557, src: "C20" },
  { name: "Symbol Search", abbr: "SS", bat: "WISC-V", chc: "Gs", g: .553, s: .573, src: "C20" },
  { name: "Oral Vocabulary", abbr: "ORLV", bat: "WJ-IV", chc: "Gc", g: .70, s: .38, src: "DMC17" },
  { name: "General Information", abbr: "GINF", bat: "WJ-IV", chc: "Gc", g: .67, s: .34, src: "DMC17" },
  { name: "Visualization", abbr: "VIS", bat: "WJ-IV", chc: "Gv", g: .56, s: .34, src: "DMC17" },
  { name: "Picture Recognition", abbr: "PREC", bat: "WJ-IV", chc: "Gv", g: .44, s: .29, src: "DMC17" },
  { name: "Number Series", abbr: "NSER", bat: "WJ-IV", chc: "Gf", g: .68, s: .28, src: "DMC17" },
  { name: "Concept Formation", abbr: "CFRM", bat: "WJ-IV", chc: "Gf", g: .58, s: .24, src: "DMC17" },
  { name: "Numbers Reversed", abbr: "NREV", bat: "WJ-IV", chc: "Gwm", g: .60, s: .34, src: "DMC17" },
  { name: "Obj-Number Seq.", abbr: "ONSE", bat: "WJ-IV", chc: "Gwm", g: .56, s: .29, src: "DMC17" },
  { name: "Letter-Pattern Match.", abbr: "LPAT", bat: "WJ-IV", chc: "Gs", g: .34, s: .54, src: "DMC17" },
  { name: "Pair Cancellation", abbr: "PCAN", bat: "WJ-IV", chc: "Gs", g: .37, s: .49, src: "DMC17" },
  { name: "Story Recall", abbr: "SREC", bat: "WJ-IV", chc: "Glr", g: .44, s: .39, src: "DMC17" },
  { name: "Visual-Aud. Learning", abbr: "VALE", bat: "WJ-IV", chc: "Glr", g: .49, s: .34, src: "DMC17" },
  { name: "Phonological Proc.", abbr: "PHPR", bat: "WJ-IV", chc: "Ga", g: .54, s: .37, src: "DMC17" },
  { name: "Nonword Repetition", abbr: "NWRD", bat: "WJ-IV", chc: "Ga", g: .47, s: .31, src: "DMC17" },
];

const FSIQ_SUBS = ["SI", "VO", "BD", "MR", "FW", "DS", "CD"];

const ACAD = {
  BRS: { name: "Basic Reading Skills", gW: .55, sW: { Gc: .15, Ga: .20, Gs: .10, Gwm: .08 }, linked: ["Gc", "Ga", "Gs", "Gwm", "Glr"] },
  RC: { name: "Reading Comprehension", gW: .58, sW: { Gc: .22, Gwm: .10, Glr: .08 }, linked: ["Gc", "Gwm", "Glr", "Gf"] },
  MC: { name: "Math Calculation", gW: .50, sW: { Gf: .18, Gwm: .12, Gs: .10 }, linked: ["Gf", "Gwm", "Gs", "Gc"] },
  MPS: { name: "Math Problem Solving", gW: .55, sW: { Gf: .22, Gc: .12, Gwm: .10 }, linked: ["Gf", "Gc", "Gwm"] },
  WE: { name: "Written Expression", gW: .45, sW: { Gc: .12, Gs: .15, Gwm: .10, Glr: .08 }, linked: ["Gc", "Gs", "Gwm", "Glr"] },
};

const SCENARIOS = [
  {
    id: "classic", label: "Classic Reading Referral",
    tagline: "The most common referral profile in school psychology",
    name: "Marcus T.", grade: "3rd",
    referral: "Persistent reading difficulties despite 18 weeks of Tier 2 small-group phonics intervention. Slow decoding and poor fluency.",
    g: 88, dev: -12, domain: "BRS",
    spec: { Gc: 0, Gv: 0, Gf: 0, Gwm: 0, Gs: 0, Glr: 0, Ga: 0 },
    truth: "Marcus has no specific processing deficits. All specific factors are set to zero. His reading difficulty comes from low-average general ability combined with environmental factors. There is nothing for the PSW model to find.",
    reveal: "Every cognitive weakness the DD/C analysis identified was manufactured by measurement error. The determination changed from administration to administration because observed index scores contain too little reliable specific variance to support stable profile interpretation. The scatter is noise.",
    concept: "When there is no real processing variation, any PSW pattern the system detects is a false positive. This is the base rate problem: with index-level reliability this low, even a flat true profile generates enough random scatter to occasionally meet criteria.",
  },
  {
    id: "gs", label: "Genuine Speed Deficit (Best Case)",
    tagline: "The most detectable deficit on the most reliable factor",
    name: "Anika R.", grade: "4th",
    referral: "Slow written work completion despite average oral comprehension. Takes 2-3x longer than peers on timed assignments.",
    g: 98, dev: -8, domain: "WE",
    spec: { Gc: 0, Gv: 0, Gf: 0, Gwm: 0, Gs: -20, Glr: 0, Ga: 0 },
    truth: "Anika has a genuine, substantial processing speed deficit (Gs = -20 points below her g). Processing Speed has the highest specific reliability of any WISC-V factor (omegaHS of roughly .40), making this the absolute best-case scenario for profile-based detection.",
    reveal: "Even in the best case, with a large deficit on the most reliably measured factor, the DD/C analysis still misidentifies the wrong weakness or misses Gs entirely in a substantial proportion of administrations. If PSW cannot work reliably here, where can it?",
    concept: "An omegaHS near .40 means 60% of the PSI score is still g plus error. A 20-point true specific deficit only produces an observed deficit some of the time, and when it does, other factors may dip below threshold too, confusing the pattern.",
  },
  {
    id: "ga", label: "Phonological Deficit (Textbook SLD)",
    tagline: "The profile every SLD textbook describes",
    name: "Jordan K.", grade: "2nd",
    referral: "Significant decoding difficulties. Strong oral vocabulary and comprehension when text is read aloud. Struggles with phoneme segmentation.",
    g: 100, dev: -15, domain: "BRS",
    spec: { Gc: 5, Gv: 0, Gf: 0, Gwm: 0, Gs: 0, Glr: 0, Ga: -18 },
    truth: "Jordan has the textbook phonological processing SLD profile: average g, strong language (Gc +5), and a genuine auditory processing deficit (Ga = -18). But Ga has among the lowest specific reliability values of any broad CHC ability.",
    reveal: "The real Ga deficit is rarely captured reliably in observed cluster scores. When a weakness IS identified, it is often flagged in the wrong CHC area (Gwm, Glr, or Gs instead of Ga) because those scores are equally noisy.",
    concept: "Low specific reliability means the genuine deficit is buried under g variance and error. The test cannot reliably separate Ga-specific processing from general ability at the individual level, even when a real deficit exists.",
  },
  {
    id: "low", label: "Globally Low, Not SLD",
    tagline: "A misidentification the PSW model should prevent but does not",
    name: "Destiny W.", grade: "5th",
    referral: "Below grade level across all academics. Tier 2 support in reading and math. Adaptive behavior scores are also below average.",
    g: 78, dev: -5, domain: "BRS",
    spec: { Gc: 0, Gv: 0, Gf: 0, Gwm: 0, Gs: 0, Glr: 0, Ga: 0 },
    truth: "Destiny does not have SLD. Her profile is flat, with all specific factors set to zero. Her academic difficulties are proportional to globally low general ability (g = 78). An intellectual disability evaluation may be warranted.",
    reveal: "Random scatter around uniformly low true scores can meet DD/C criteria purely by chance. The system occasionally identifies a 'processing strength' and 'processing weakness' when both are just noise around the same low baseline.",
    concept: "With g = 78, every index hovers around 78 plus or minus measurement error. When one index randomly dips to 72 while another bounces to 85, the PSW model sees a pattern where none exists. This is a classification accuracy problem.",
  },
  {
    id: "2e", label: "Twice-Exceptional (Gifted + SLD?)",
    tagline: "Maximum contrast between strengths and weaknesses",
    name: "Elijah C.", grade: "6th",
    referral: "Identified gifted in 2nd grade. Strong math reasoning but frequent computational errors. Loses track of multi-step problems.",
    g: 118, dev: -10, domain: "MC",
    spec: { Gc: 0, Gv: 0, Gf: 5, Gwm: -22, Gs: -5, Glr: 0, Ga: 0 },
    truth: "Elijah has high general ability (g = 118) with a genuine working memory deficit (Gwm = -22) and mild processing speed depression (Gs = -5). This should be the ideal case for PSW, providing maximum contrast between cognitive strengths and a real weakness.",
    reveal: "With g = 118, the WMI is pulled up by the massive g contribution (omegaHS = .10 means 90% of WMI is g). Elijah's real Gwm deficit is masked. His WMI may score Average despite a genuine 22-point specific weakness.",
    concept: "An omegaHS of .10 for Working Memory means almost all of the WMI reflects g. A 22-point specific deficit loses about 90% of its impact in the observed score. This is exactly what bifactor research predicts: the index score measures g, not the specific ability the clinical interpretation assumes.",
  },
  {
    id: "ell", label: "ELL with Depressed Gc",
    tagline: "The DD/C system cannot distinguish deficit from bias",
    name: "Thien N.", grade: "3rd",
    referral: "Vietnamese-speaking home. In U.S. schools since K, exited ELL services in 2nd grade. Reading comprehension below grade level; decoding and math adequate.",
    g: 95, dev: -10, domain: "RC",
    spec: { Gc: -20, Gv: 0, Gf: 0, Gwm: 0, Gs: 0, Glr: 0, Ga: 0 },
    truth: "Thien has average general ability (g = 95). The Gc depression (-20) represents reduced English language exposure, not a cognitive processing deficit. The score claims to measure crystallized intelligence, but it is actually measuring English proficiency.",
    reveal: "The DD/C system reliably identifies a Gc 'weakness,' but it is detecting English exposure, not the cognitive construct. Adding more Gc subtests from a second battery makes the problem worse: it adds more measures of the same construct-irrelevant variance.",
    concept: "This is an extrapolation inference failure in Kane's framework. The observed score does not mean what the PSW model assumes it means. The DD/C system has no mechanism to distinguish construct deficit from construct-irrelevant variance. It treats all low scores as processing weaknesses.",
  },
];

// ── Simulation engine ──
function simulate(g, spec, domain, dev) {
  const zG = (g - 100) / 15;
  const st = {};
  SUBTESTS.forEach(sub => {
    const zS = (spec[sub.chc] || 0) / 15;
    const eVar = Math.max(0.01, 1 - sub.g ** 2 - sub.s ** 2);
    const z = sub.g * zG + sub.s * zS + randn() * Math.sqrt(eVar);
    st[sub.abbr] = { z, ss: Math.round(Math.max(1, Math.min(19, 10 + 3 * z))), sub };
  });
  const comp = (abbrs) => {
    const subs = abbrs.map(a => SUBTESTS.find(x => x.abbr === a));
    const zs = abbrs.map(a => st[a].z);
    let v = subs.length;
    for (let i = 0; i < subs.length; i++)
      for (let j = i + 1; j < subs.length; j++) {
        let c = subs[i].g * subs[j].g;
        if (subs[i].chc === subs[j].chc) c += subs[i].s * subs[j].s;
        v += 2 * c;
      }
    return Math.round(Math.max(40, Math.min(160, 100 + 15 * zs.reduce((a, b) => a + b, 0) / Math.sqrt(v))));
  };
  const fsiq = comp(FSIQ_SUBS);
  const chc = {};
  CHC_ORDER.forEach(c => { chc[c] = comp(SUBTESTS.filter(x => x.chc === c).map(x => x.abbr)); });
  const dm = ACAD[domain];
  let aZ = dm.gW * zG;
  Object.entries(dm.sW).forEach(([c, w]) => { aZ += w * ((spec[c] || 0) / 15); });
  aZ += (dev || 0) / 15 + randn() * Math.sqrt(0.30);
  const acad = Math.round(Math.max(40, Math.min(160, 100 + 15 * aZ)));
  const acadWeak = acad <= 85;
  const cogWeak = dm.linked.filter(c => chc[c] <= 85);
  const intact = CHC_ORDER.some(c => chc[c] >= 90);
  const met = acadWeak && cogWeak.length > 0 && intact;
  return { st, fsiq, chc, acad, acadWeak, cogWeak, intact, met };
}

const dsc = s => s >= 130 ? "Very Superior" : s >= 120 ? "Superior" : s >= 110 ? "High Average" : s >= 90 ? "Average" : s >= 80 ? "Low Average" : s >= 70 ? "Below Average" : "Extremely Low";
const pct = s => { const z = (s - 100) / 15, t = 1 / (1 + .2316419 * Math.abs(z)), d = .3989423 * Math.exp(-z * z / 2), p = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? Math.round((1 - p) * 100) : Math.round(p * 100); };
const MO = "'Consolas','Courier New',monospace";
const SA = "'Segoe UI',system-ui,sans-serif";
const SE = "'Georgia','Times New Roman',serif";
const pill = (color, bg) => ({ fontSize: 7, fontWeight: 700, padding: "2px 6px", borderRadius: 3, color, background: bg, letterSpacing: "0.03em", display: "inline-block" });
const btn = (bg, fg) => ({ padding: "7px 16px", fontSize: 11, fontWeight: 600, color: fg, background: bg, border: "none", borderRadius: 4, cursor: "pointer" });

const CUSTOM_DEFAULTS = { name: "Custom Student", grade: "3rd", referral: "", g: 100, dev: -10, domain: "BRS", spec: { Gc: 0, Gv: 0, Gf: 0, Gwm: 0, Gs: 0, Glr: 0, Ga: 0 } };

// ══════════════════════════════════════════════════════════════════
export default function ClinicalXBA() {
  const [scId, setScId] = useState(null);
  const [phase, setPhase] = useState("pick");
  const [hist, setHist] = useState([]);
  const [tab, setTab] = useState("scores");
  const [showLimits, setShowLimits] = useState(false);

  // Custom student state
  const [custom, setCustom] = useState({ ...CUSTOM_DEFAULTS, spec: { ...CUSTOM_DEFAULTS.spec } });
  const [isCustom, setIsCustom] = useState(false);

  const sc = useMemo(() => {
    if (isCustom) return {
      id: "custom", label: "Custom Student", tagline: "User-defined parameters",
      name: custom.name, grade: custom.grade, referral: custom.referral || "User-defined referral scenario.",
      g: custom.g, dev: custom.dev, domain: custom.domain, spec: custom.spec,
      truth: null, reveal: null, concept: null,
    };
    return scId ? SCENARIOS.find(x => x.id === scId) : null;
  }, [scId, isCustom, custom]);

  const cur = hist.length > 0 ? hist[hist.length - 1] : null;
  const dom = sc ? ACAD[sc.domain] : null;

  const pick = (id) => { setScId(id); setIsCustom(false); setPhase("briefing"); setHist([]); setTab("scores"); };
  const pickCustom = () => { setIsCustom(true); setScId(null); setPhase("custom"); setHist([]); setTab("scores"); };
  const launchCustom = () => { setPhase("briefing"); };
  const admin = useCallback(() => {
    if (!sc) return;
    setHist([simulate(sc.g, sc.spec, sc.domain, sc.dev)]);
    setPhase("first"); setTab("scores");
  }, [sc]);
  const retest1 = useCallback(() => {
    if (!sc) return;
    setHist(p => [...p, simulate(sc.g, sc.spec, sc.domain, sc.dev)]);
    setPhase("retest"); setTab("stability");
  }, [sc]);
  const batchR = useCallback(() => {
    if (!sc) return;
    const b = []; for (let i = 0; i < 25; i++) b.push(simulate(sc.g, sc.spec, sc.domain, sc.dev));
    setHist(p => [...p, ...b]); setPhase("retest"); setTab("stability");
  }, [sc]);
  const reset = () => { setScId(null); setIsCustom(false); setPhase("pick"); setHist([]); setCustom({ ...CUSTOM_DEFAULTS, spec: { ...CUSTOM_DEFAULTS.spec } }); };

  const rate = useMemo(() => hist.length < 2 ? null : hist.filter(h => h.met).length / hist.length, [hist]);
  const wt = useMemo(() => { const t = {}; CHC_ORDER.forEach(c => t[c] = 0); hist.forEach(h => h.cogWeak.forEach(c => t[c]++)); return t; }, [hist]);

  const setC = (k, v) => setCustom(p => ({ ...p, [k]: v }));
  const setSpec = (k, v) => setCustom(p => ({ ...p, spec: { ...p.spec, [k]: v } }));
  const sld = (lo, hi, step, val, onChange, label) => (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
        <span style={{ color: "#475569" }}>{label}</span>
        <span style={{ fontFamily: MO, fontWeight: 700 }}>{val > 0 ? "+" : ""}{val}</span>
      </div>
      <input type="range" min={lo} max={hi} step={step} value={val} onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", height: 4, cursor: "pointer" }} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: SA, fontSize: 12 }}>
      {/* Header */}
      <div style={{ background: "#0f172a", color: "#e2e8f0", padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: ".04em" }}>CROSS-BATTERY PSW SIMULATOR</div>
          <div style={{ fontSize: 8, color: "#64748b", letterSpacing: ".05em" }}>BIFACTOR PARAMETERS: CANIVEZ ET AL. (2020) | INSTRUCTIONAL USE ONLY</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowLimits(p => !p)} style={{ fontSize: 9, color: "#94a3b8", background: "transparent", border: "1px solid #334155", borderRadius: 4, padding: "3px 10px", cursor: "pointer" }}>
            {showLimits ? "Hide" : "Assumptions & Limits"}
          </button>
          {phase !== "pick" && phase !== "custom" && (
            <button onClick={reset} style={{ fontSize: 10, color: "#94a3b8", background: "#1e293b", border: "1px solid #334155", borderRadius: 4, padding: "4px 12px", cursor: "pointer" }}>
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Assumptions panel */}
      {showLimits && (
        <div style={{ background: "#fefce8", borderBottom: "1px solid #fde68a", padding: "12px 20px" }}>
          <div style={{ maxWidth: 940, margin: "0 auto", fontSize: 10, lineHeight: 1.8, color: "#713f12" }}>
            <strong style={{ fontSize: 11 }}>Assumptions and Limitations</strong>
            <p style={{ margin: "6px 0 4px" }}>
              <strong>What is well-grounded.</strong> The WISC-V bifactor loadings come directly from Canivez et al. (2020), Table 11: a CFA bifactor model fit to a clinical sample of 1,256 children. This finding has been replicated across the U.S. standardization sample, Canadian WISC-V, WISC-V UK, French WISC-V, and Spanish WISC-V. The simulation engine (observed z = g_loading x true_g + s_loading x true_specific + error) is the standard approach used in published Monte Carlo studies of profile reliability. The qualitative conclusion that PSW determinations are unstable is supported by empirical retest data, including Watkins and Canivez (2004) profile stability kappas in the .20s to .40s range.
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>What is simplified.</strong> Composite scoring uses z-score aggregation rather than the actual scaled-score-sum-to-normative-table lookup. DD/C rules use a simplified cutoff of 85 or below; real XBA/DD-C involves more nuanced clinical judgment. WJ-IV COG loadings are approximate midpoints from Dombrowski et al. (2017a, 2017b), not exact published values. The academic score model is a weighted composite; real achievement is influenced by additional factors (instruction, motivation, opportunity).
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>What can be debated.</strong> The bifactor model itself is contested. Reynolds and Keith (2017) argue higher-order models are more theoretically defensible and that bifactor models may benefit from systematic statistical bias in model fit comparisons. However, even under the Schmid-Leiman transformation of a higher-order model, the variance decomposition produces similar results: VC = .194, PR = .270, WM = .083, PS = .351 (Canivez et al., 2020, Table 8). No factor reaches the .50 threshold under either approach. A PSW advocate could also argue that skilled clinical judgment stabilizes determinations beyond what score-based analysis alone would show. The simulator does not model this.
            </p>
            <p style={{ margin: "4px 0 0" }}>
              <strong>Bottom line.</strong> The simulator treats the bifactor model as ground truth for data generation. If the real world is better described by a different model, simulated instability could be overstated or understated. The simulator is transparent about this assumption. Apply the same critical evaluation to this tool that you would to any assessment instrument.
            </p>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 940, margin: "0 auto", padding: "16px 20px" }}>

        {/* ═══════════ PHASE: PICK ═══════════ */}
        {phase === "pick" && (
          <div>
            <div style={{ textAlign: "center", padding: "12px 0 20px" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", fontFamily: SE }}>How Reliable Is a PSW Determination?</div>
              <div style={{ fontSize: 12, color: "#64748b", maxWidth: 600, margin: "8px auto 0", lineHeight: 1.7 }}>
                The Dual-Discrepancy/Consistency method identifies SLD by finding cognitive weaknesses
                linked to academic deficits, with other abilities intact. Select a student below.
                You will walk through the DD/C analysis, then test whether the determination holds up.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {SCENARIOS.map(s => (
                <button key={s.id} onClick={() => pick(s.id)}
                  style={{ textAlign: "left", padding: "14px 16px", borderRadius: 8, cursor: "pointer", border: "1px solid #e2e8f0", background: "white", transition: "all .15s", boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#93c5fd"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.transform = "none"; }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 600, marginBottom: 6 }}>{s.tagline}</div>
                  <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>
                    <strong>{s.name}</strong> ({s.grade} grade) {s.referral.length > 90 ? "- " + s.referral.slice(0, 90) + "..." : "- " + s.referral}
                  </div>
                </button>
              ))}
              {/* Custom student card */}
              <button onClick={pickCustom}
                style={{ textAlign: "left", padding: "14px 16px", borderRadius: 8, cursor: "pointer", border: "2px dashed #cbd5e1", background: "#f8fafc", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#6366f1"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#cbd5e1"; }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1", marginBottom: 2 }}>+ Build Your Own</div>
                <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 600, marginBottom: 6 }}>Set custom g, specific factors, and academic area</div>
                <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.5 }}>
                  Configure a student profile from scratch. Useful for testing specific hypotheses about when PSW works or fails.
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ PHASE: CUSTOM BUILDER ═══════════ */}
        {phase === "custom" && (
          <div>
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={pill("#6366f1", "#eef2ff")}>CUSTOM STUDENT</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
                {/* Left column: student info */}
                <div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>Student Name</label>
                    <input type="text" value={custom.name} onChange={e => setC("name", e.target.value)}
                      style={{ width: "100%", padding: "5px 8px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, marginTop: 2, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>Grade</label>
                    <input type="text" value={custom.grade} onChange={e => setC("grade", e.target.value)}
                      style={{ width: "100%", padding: "5px 8px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, marginTop: 2, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>Referral Concern (optional)</label>
                    <textarea value={custom.referral} onChange={e => setC("referral", e.target.value)} rows={2}
                      style={{ width: "100%", padding: "5px 8px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, marginTop: 2, resize: "vertical", boxSizing: "border-box" }} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 10, color: "#475569", fontWeight: 600 }}>Academic Area</label>
                    <select value={custom.domain} onChange={e => setC("domain", e.target.value)}
                      style={{ width: "100%", padding: "5px 8px", fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 4, marginTop: 2 }}>
                      {Object.entries(ACAD).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                    </select>
                  </div>
                  {sld(55, 140, 1, custom.g, v => setC("g", v), `True General Ability (g): ${custom.g}`)}
                  {sld(-30, 0, 1, custom.dev, v => setC("dev", v), `Academic Deviation: ${custom.dev}`)}
                </div>
                {/* Right column: specific factors */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                    Specific Factor Deviations (IQ-scale points relative to g)
                  </div>
                  <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 8, lineHeight: 1.5 }}>
                    Set to 0 for no specific deficit or strength. Negative values create processing weaknesses; positive values create strengths. These represent true latent deviations, not observed scores.
                  </div>
                  {CHC_ORDER.map(c => (
                    <div key={c}>
                      {sld(-30, 30, 1, custom.spec[c], v => setSpec(c, v),
                        <span><span style={{ color: CHC[c].color, fontWeight: 700 }}>{c}</span> {CHC[c].name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <button onClick={launchCustom}
                style={{ padding: "11px 32px", fontSize: 13, fontWeight: 700, color: "white", background: "#6366f1", border: "none", borderRadius: 6, cursor: "pointer" }}>
                Continue to Briefing →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ PHASE: BRIEFING ═══════════ */}
        {phase === "briefing" && sc && (
          <div>
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: 20, marginBottom: 16 }}>
              <div style={pill("#6366f1", "#eef2ff")}>REFERRAL</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", fontFamily: SE, marginTop: 6 }}>{sc.name}</div>
              <div style={{ fontSize: 11, color: "#475569", marginTop: 4, lineHeight: 1.7 }}>
                <strong>Grade:</strong> {sc.grade} &nbsp;|&nbsp; <strong>Concern:</strong> {sc.referral}
              </div>

              <div style={{ marginTop: 16, padding: "12px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", marginBottom: 4, letterSpacing: ".04em" }}>
                  BEHIND THE CURTAIN {sc.truth ? "" : "(Custom Parameters)"}
                </div>
                {sc.truth ? (
                  <div style={{ fontSize: 11, color: "#78350f", lineHeight: 1.7 }}>{sc.truth}</div>
                ) : (
                  <div style={{ fontSize: 11, color: "#78350f", lineHeight: 1.7 }}>
                    Custom student with user-defined parameters. There is no preset teaching point for this profile. Watch how the DD/C determination behaves across repeated administrations.
                  </div>
                )}
                <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap", fontFamily: MO, fontSize: 10 }}>
                  <span>True g = <strong>{sc.g}</strong></span>
                  <span>Acad. dev. = <strong>{sc.dev}</strong></span>
                  <span>Area = <strong>{sc.domain}</strong></span>
                  {CHC_ORDER.filter(c => sc.spec[c] !== 0).map(c => (
                    <span key={c}><span style={{ color: CHC[c].color, fontWeight: 700 }}>{c}</span> = {sc.spec[c] > 0 ? "+" : ""}{sc.spec[c]}</span>
                  ))}
                  {CHC_ORDER.every(c => sc.spec[c] === 0) && <span style={{ color: "#94a3b8" }}>All specific factors = 0</span>}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <button onClick={admin}
                style={{ padding: "11px 32px", fontSize: 13, fontWeight: 700, color: "white", background: "#1e40af", border: "none", borderRadius: 6, cursor: "pointer" }}>
                Administer Full Cross-Battery Evaluation
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ PHASE: RESULTS / RETEST ═══════════ */}
        {(phase === "first" || phase === "retest") && cur && sc && dom && (
          <div>
            {/* PSW Banner */}
            <div style={{
              background: cur.met ? "#fef2f2" : "#f0fdf4", border: `1px solid ${cur.met ? "#fecaca" : "#bbf7d0"}`,
              borderRadius: "8px 8px 0 0", padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{sc.name}</span>
                <span style={{ fontSize: 10, color: "#64748b", marginLeft: 10 }}>Admin #{hist.length} | {dom.name} | {sc.grade} grade</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ padding: "5px 14px", borderRadius: 5, fontSize: 12, fontWeight: 800, background: cur.met ? "#991b1b" : "#166534", color: "white" }}>
                  {cur.met ? "SLD CRITERIA MET" : "SLD CRITERIA NOT MET"}
                </span>
                {rate !== null && hist.length >= 3 && (
                  <div style={{ fontSize: 9, color: "#64748b", marginTop: 3 }}>Met in {Math.round(rate * 100)}% of {hist.length} administrations</div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ background: "white", borderLeft: "1px solid #e2e8f0", borderRight: "1px solid #e2e8f0", display: "flex", padding: "0 4px" }}>
              {[
                { id: "scores", label: "CHC Scores" },
                { id: "ddc", label: "DD/C Levels" },
                ...(hist.length > 1 ? [{ id: "stability", label: `Retest Stability (n=${hist.length})` }] : []),
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  padding: "7px 14px", fontSize: 10, fontWeight: tab === t.id ? 700 : 500,
                  color: tab === t.id ? "#1e40af" : "#64748b",
                  borderBottom: tab === t.id ? "2px solid #1e40af" : "2px solid transparent",
                  background: "transparent", border: "none", cursor: "pointer",
                }}>{t.label}</button>
              ))}
            </div>

            {/* Tab body */}
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, minHeight: 250 }}>

              {/* SCORES */}
              {tab === "scores" && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
                    FSIQ: <span style={{ fontFamily: MO, fontSize: 18, color: "#0f172a" }}>{cur.fsiq}</span>
                    <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: 6 }}>({dsc(cur.fsiq)}, {pct(cur.fsiq)}th %ile)</span>
                  </div>
                  {CHC_ORDER.map(c => {
                    const v = cur.chc[c], weak = v <= 85, linked = dom.linked.includes(c);
                    const barW = Math.max(2, Math.min(100, ((v - 40) / 120) * 100));
                    return (
                      <div key={c} style={{ marginBottom: 6, padding: "6px 10px", borderRadius: 5, background: weak && linked ? "#fef2f2" : linked ? "#f0f9ff" : "#fafafa", border: `1px solid ${weak && linked ? "#fecaca" : linked ? "#bae6fd" : "#f1f5f9"}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 800, color: CHC[c].color, fontSize: 11 }}>{c}</span>
                            <span style={{ fontSize: 10, color: "#475569" }}>{CHC[c].name}</span>
                            {linked && <span style={pill("#1e40af", "#dbeafe")}>LINKED</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontFamily: MO, fontSize: 15, fontWeight: 800, color: weak ? "#991b1b" : "#0f172a" }}>{v}</span>
                            <span style={{ fontSize: 8, color: "#94a3b8" }}>{pct(v)}th</span>
                          </div>
                        </div>
                        <div style={{ height: 5, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${barW}%`, height: "100%", borderRadius: 3, background: weak ? "#ef4444" : CHC[c].color, opacity: .65 }} />
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                          {SUBTESTS.filter(x => x.chc === c).map(x => (
                            <span key={x.abbr} style={{ fontSize: 8, color: "#94a3b8" }}>
                              {x.abbr}={cur.st[x.abbr].ss}{x.bat === "WJ-IV" ? "\u02B7" : ""}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 6, fontSize: 10, color: "#64748b" }}>
                    Academic ({dom.name}): <strong style={{ fontFamily: MO, fontSize: 14, color: cur.acad <= 85 ? "#991b1b" : "#0f172a" }}>{cur.acad}</strong>
                    <span style={{ marginLeft: 4 }}>({dsc(cur.acad)}, {pct(cur.acad)}th %ile)</span>
                  </div>
                  <div style={{ fontSize: 8, color: "#94a3b8", marginTop: 4 }}>{"\u02B7"} = WJ-IV COG subtest. WISC-V loadings: Canivez et al. (2020) Table 11. WJ-IV loadings: Dombrowski et al. (2017), approximate.</div>
                </div>
              )}

              {/* DD/C LEVELS */}
              {tab === "ddc" && (
                <div style={{ fontSize: 11, lineHeight: 1.7 }}>
                  <div style={{ padding: "8px 12px", background: cur.acadWeak ? "#fef2f2" : "#f0fdf4", borderRadius: 5, marginBottom: 6, border: `1px solid ${cur.acadWeak ? "#fecaca" : "#bbf7d0"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>Level I: Academic Weakness</strong>
                      <span style={{ fontWeight: 700, color: cur.acadWeak ? "#991b1b" : "#166534" }}>{cur.acadWeak ? "PRESENT" : "NOT PRESENT"}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "#475569" }}>{dom.name} = {cur.acad} ({dsc(cur.acad)}). {cur.acadWeak ? "Meets the 85-or-below criterion." : "Does not meet criterion; analysis stops."}</div>
                  </div>
                  <div style={{ padding: "8px 12px", background: "#f8fafc", borderRadius: 5, marginBottom: 6, border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>Level II: Exclusionary Factors</strong>
                      <span style={{ fontSize: 10, color: "#64748b", fontStyle: "italic" }}>ASSUMED MET</span>
                    </div>
                    <div style={{ fontSize: 9, color: "#94a3b8" }}>Sensory, EL, ID, emotional, inadequate instruction: assumed ruled out in simulation.</div>
                  </div>
                  <div style={{ padding: "8px 12px", background: cur.cogWeak.length > 0 && cur.intact ? "#fef2f2" : "#f0fdf4", borderRadius: 5, marginBottom: 6, border: `1px solid ${cur.cogWeak.length > 0 && cur.intact ? "#fecaca" : "#bbf7d0"}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>Level III: Pattern of Strengths and Weaknesses</strong>
                      <span style={{ fontWeight: 700, color: cur.cogWeak.length > 0 && cur.intact ? "#991b1b" : "#166534" }}>
                        {cur.cogWeak.length > 0 && cur.intact ? "PSW PRESENT" : "PSW NOT PRESENT"}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 4, marginLeft: 4 }}>
                      {dom.linked.map(c => (
                        <div key={c} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ color: cur.chc[c] <= 85 ? "#991b1b" : "#166534", fontWeight: 700 }}>{cur.chc[c] <= 85 ? "\u2717" : "\u2713"}</span>
                          <span style={{ fontWeight: 700, color: CHC[c].color }}>{c}</span>
                          <span style={{ fontFamily: MO }}>{cur.chc[c]}</span>
                          <span style={{ color: "#94a3b8" }}>({dsc(cur.chc[c])})</span>
                        </div>
                      ))}
                      <div style={{ marginTop: 3 }}>
                        {cur.cogWeak.length > 0 ? <span style={{ color: "#991b1b" }}>Linked weakness: {cur.cogWeak.join(", ")}</span> : <span style={{ color: "#166534" }}>No linked cognitive weakness.</span>}
                        {" | "}{cur.intact ? "Otherwise intact processing: present." : "No intact area identified."}
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px", borderRadius: 5, background: cur.met ? "#991b1b" : "#166534", color: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>Level IV: Determination</strong>
                      <span style={{ fontWeight: 800, fontSize: 13 }}>{cur.met ? "SLD CRITERIA MET" : "SLD CRITERIA NOT MET"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STABILITY */}
              {tab === "stability" && hist.length > 1 && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 36, fontWeight: 800, color: rate > .5 ? "#991b1b" : rate > .2 ? "#b45309" : "#166534" }}>
                        {Math.round(rate * 100)}%
                      </div>
                      <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>meet SLD criteria<br />({hist.length} administrations)</div>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#475569", marginBottom: 4 }}>Which weakness was identified?</div>
                      {dom.linked.map(c => {
                        const r = wt[c] / hist.length;
                        return (
                          <div key={c} style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: CHC[c].color, width: 24 }}>{c}</span>
                            <div style={{ flex: 1, background: "#e2e8f0", borderRadius: 3, height: 6 }}>
                              <div style={{ width: `${r * 100}%`, height: "100%", background: CHC[c].color, opacity: .7, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 8, fontFamily: MO, color: "#64748b", width: 28, textAlign: "right" }}>{Math.round(r * 100)}%</span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: 12, textAlign: "center" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#475569", marginBottom: 2 }}>FSIQ Range</div>
                      <div style={{ fontFamily: MO, fontSize: 20, fontWeight: 700 }}>{Math.min(...hist.map(h => h.fsiq))} to {Math.max(...hist.map(h => h.fsiq))}</div>
                      <div style={{ fontSize: 9, color: "#94a3b8" }}>True g = {sc.g}</div>
                    </div>
                  </div>

                  <div style={{ overflowX: "auto", marginBottom: 12 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #cbd5e1" }}>
                          <th style={{ textAlign: "left", padding: "2px 3px", color: "#94a3b8" }}>#</th>
                          <th style={{ textAlign: "center", padding: "2px 3px", color: "#94a3b8" }}>FSIQ</th>
                          {CHC_ORDER.map(c => <th key={c} style={{ textAlign: "center", padding: "2px 3px", color: CHC[c].color, fontWeight: 700 }}>{c}</th>)}
                          <th style={{ textAlign: "center", padding: "2px 3px", color: "#b91c1c" }}>Acad</th>
                          <th style={{ textAlign: "center", padding: "2px 3px" }}>Weak</th>
                          <th style={{ textAlign: "center", padding: "2px 3px", fontWeight: 700 }}>PSW</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hist.slice(-30).map((h, i) => {
                          const idx = hist.length > 30 ? hist.length - 30 + i : i;
                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", background: idx === hist.length - 1 ? "#eff6ff" : "white" }}>
                              <td style={{ padding: "2px 3px", fontFamily: MO, color: "#94a3b8" }}>{idx + 1}</td>
                              <td style={{ textAlign: "center", fontFamily: MO, fontWeight: 600 }}>{h.fsiq}</td>
                              {CHC_ORDER.map(c => {
                                const w = h.chc[c] <= 85;
                                return <td key={c} style={{ textAlign: "center", fontFamily: MO, color: w ? "#991b1b" : "#475569", fontWeight: w ? 700 : 400, background: w ? "#fef2f2" : "transparent" }}>{h.chc[c]}</td>;
                              })}
                              <td style={{ textAlign: "center", fontFamily: MO, color: h.acad <= 85 ? "#991b1b" : "#475569", fontWeight: h.acad <= 85 ? 700 : 400 }}>{h.acad}</td>
                              <td style={{ textAlign: "center", fontSize: 8, color: "#64748b" }}>{h.cogWeak.length > 0 ? h.cogWeak.join(",") : "-"}</td>
                              <td style={{ textAlign: "center" }}>
                                <span style={{ fontSize: 7, fontWeight: 700, padding: "1px 5px", borderRadius: 2, background: h.met ? "#991b1b" : "#e2e8f0", color: h.met ? "white" : "#94a3b8" }}>
                                  {h.met ? "MET" : "NOT"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {hist.length > 30 && <div style={{ fontSize: 8, color: "#94a3b8", marginTop: 2 }}>Showing last 30 of {hist.length}</div>}
                  </div>

                  {/* Teaching explanation */}
                  <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e", marginBottom: 6, fontFamily: SE }}>What Is Happening Here</div>
                    <div style={{ fontSize: 11, color: "#78350f", lineHeight: 1.8 }}>
                      {sc.reveal ? (
                        <>
                          <p style={{ margin: "0 0 8px" }}>{sc.reveal}</p>
                          <p style={{ margin: "0 0 8px" }}>{sc.concept}</p>
                        </>
                      ) : (
                        <p style={{ margin: "0 0 8px" }}>
                          With true g = {sc.g}{CHC_ORDER.some(c => sc.spec[c] !== 0) ? " and specific deviations in " + CHC_ORDER.filter(c => sc.spec[c] !== 0).join(", ") : " and no specific factor deviations"},
                          the DD/C determination met criteria in {Math.round(rate * 100)}% of {hist.length} administrations.
                          {rate > 0.3 && rate < 0.7 ? " The determination is essentially a coin flip for this profile." : ""}
                          {CHC_ORDER.some(c => sc.spec[c] !== 0) && wt[CHC_ORDER.find(c => sc.spec[c] === Math.min(...CHC_ORDER.map(x => sc.spec[x])))] < hist.length * 0.5
                            ? " Notice that the real weakness is not consistently the one identified." : ""}
                        </p>
                      )}
                      <p style={{ margin: 0, fontSize: 10, paddingTop: 6, borderTop: "1px solid #fde68a" }}>
                        <strong>Published specific reliability values</strong> (Canivez et al., 2020, Table 11, clinical sample):
                        VC = .243 &nbsp;|&nbsp; PR = .220 &nbsp;|&nbsp; WM = <strong>.100</strong> &nbsp;|&nbsp; PS = .397.
                        The minimum recommended for clinical interpretation is .50 (Reise, 2012).
                        No WISC-V factor index meets this standard.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ textAlign: "center", marginTop: 14 }}>
              {phase === "first" && hist.length === 1 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8, fontFamily: SE }}>
                    Would {sc.name.split(" ")[0]} get the same determination if tested again tomorrow?
                  </div>
                  <button onClick={retest1} style={{ ...btn("#047857", "white"), padding: "10px 24px", fontSize: 12 }}>
                    Re-Administer Full Battery
                  </button>
                </div>
              )}
              {phase === "retest" && (
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button onClick={retest1} style={btn("#047857", "white")}>+ 1 Retest</button>
                  <button onClick={batchR} style={{ ...btn("#fef3c7", "#92400e"), border: "1px solid #fde68a" }}>+ 25 Retests</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "20px 16px", fontSize: 8, color: "#94a3b8", borderTop: "1px solid #e2e8f0", lineHeight: 1.7, maxWidth: 700, margin: "30px auto 0" }}>
        <strong>Instructional simulation, not a clinical tool.</strong><br />
        WISC-V bifactor loadings: Canivez, McGill, Dombrowski, Watkins, Pritchard, and Jacobson (2020). <em>Assessment, 27</em>(2), 274-296, Table 11 (CFA Bifactor Model 4b, clinical n = 1,256).<br />
        WJ-IV COG loadings: approximate from Dombrowski, McGill, and Canivez (2017a, 2017b).<br />
        DD/C rules simplified from Flanagan, Ortiz, and Alfonso (2013). Academic linkages are representative, not exhaustive.
      </div>
    </div>
  );
}
