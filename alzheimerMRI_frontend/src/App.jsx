import React, { useEffect, useState, useRef } from 'react';
import LiquidEther from './LiquidEther';
import GradientText from './GradientText';
import TrueFocus from './TrueFocus';
import Threads from './Threads';
import CountUp from './CountUp';
import Orb from './Orb';
import CardSwap, { Card } from './CardSwap';
import Stepper, { Step } from './Stepper';
import ChatbotPanel from './ChatbotPanel';
import { postClinicalPrediction, postMriImage } from './api';

import mildImg from './assets/MildDemented/0a0a0acd-8bd8-4b79-b724-cc5711e83bc7.jpg';
import moderateImg from './assets/ModerateDemented/0a0d37fb-adeb-4e0e-8bc8-624cd70fc6e7.jpg';
import nonImg from './assets/NonDemented/0a4abb93-5af1-4d3a-a475-3be960cdd4af.jpg';
import veryMildImg from './assets/VeryMildDemented/0a1d2c6b-8a59-4e07-879f-fd4f4b76db34.jpg';

import { 
  Brain, 
  Activity, 
  Upload,
  Loader2,
  Save,
  RotateCcw
} from 'lucide-react';

const downloadElementScreenshot = async (element, filename) => {
  if (!element) throw new Error('Result card element not found.');

  const rect = element.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  const dpr = Math.max(window.devicePixelRatio || 1, 1);

  const cloneWithInlineStyles = (sourceNode) => {
    const cloned = sourceNode.cloneNode(false);
    if (sourceNode.nodeType === Node.ELEMENT_NODE) {
      const sourceEl = sourceNode;
      const clonedEl = cloned;
      const computed = window.getComputedStyle(sourceEl);
      const styleText = Array.from(computed)
        .map((prop) => `${prop}:${computed.getPropertyValue(prop)};`)
        .join('');
      clonedEl.setAttribute('style', styleText);
    }

    sourceNode.childNodes.forEach((child) => {
      cloned.appendChild(cloneWithInlineStyles(child));
    });

    return cloned;
  };

  const clonedNode = cloneWithInlineStyles(element);
  if (clonedNode.nodeType === Node.ELEMENT_NODE) {
    clonedNode.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
    clonedNode.style.margin = '0';
    clonedNode.style.width = `${width}px`;
    clonedNode.style.height = `${height}px`;
  }

  const serializedNode = new XMLSerializer().serializeToString(clonedNode);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <foreignObject width="100%" height="100%">${serializedNode}</foreignObject>
  </svg>`;
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to render screenshot image.'));
    img.src = svgDataUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context is unavailable.');

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const link = document.createElement('a');
  link.download = filename;
  const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

  if (pngBlob) {
    const downloadUrl = URL.createObjectURL(pngBlob);
    link.href = downloadUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(downloadUrl);
    return;
  }

  // Fallback for browsers where toBlob may return null.
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const normalizePercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 1) return n * 100;
  return n;
};

const toImageDataUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;
  return `data:image/png;base64,${trimmed}`;
};

const formatExplanationTypeLabel = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (value === 'grad_cam_plus_plus') return 'GRAD CAM ++';
  return value.replace(/_/g, ' ').toUpperCase();
};

const parseMriResult = (data = {}) => {
  const probabilitySource = data.probability ?? data.confidence ?? data.score ?? data.prob;
  let confidenceValue = normalizePercent(probabilitySource);

  let classification = data.diagnosis
    || data.classification
    || data.label
    || data.result
    || data.predicted_class
    || data.class_name
    || (typeof data.prediction === 'string' ? data.prediction : '');

  if ((!classification || !String(classification).trim()) && data.probabilities && typeof data.probabilities === 'object') {
    const ranked = Object.entries(data.probabilities)
      .map(([name, value]) => [name, normalizePercent(value)])
      .filter(([, value]) => Number.isFinite(value))
      .sort((a, b) => b[1] - a[1]);

    if (ranked.length > 0) {
      classification = ranked[0][0];
      if (!Number.isFinite(confidenceValue)) {
        confidenceValue = ranked[0][1];
      }
    }
  }

  const finalClassification = String(classification || 'Predicted').trim();
  const normalizedLabel = finalClassification.toLowerCase().replace(/[\s_-]/g, '');
  const includesAny = (arr) => arr.some((kw) => normalizedLabel.includes(kw));

  let severity = 'neutral';
  if (includesAny(['moderatedemented', 'moderate'])) {
    severity = 'moderate';
  } else if (includesAny(['milddemented']) && !includesAny(['verymilddemented'])) {
    severity = 'mild';
  } else if (includesAny(['verymilddemented', 'verymild'])) {
    severity = 'very_mild';
  } else if (includesAny(['nondemented', 'non-demented', 'non', 'normal', 'healthy', 'negative'])) {
    severity = 'non';
  } else if (Number.isFinite(confidenceValue)) {
    severity = confidenceValue >= 50 ? 'mild' : 'non';
  }

  const confidence = Number.isFinite(confidenceValue) ? confidenceValue.toFixed(1) : '--';
  const explanation = severity === 'moderate'
    ? `MRI pattern analysis indicates a high-risk imaging pattern consistent with moderate dementia (${confidence}%). This requires timely specialist follow-up and comprehensive clinical correlation.`
    : severity === 'mild' || severity === 'very_mild'
      ? `MRI pattern analysis indicates early-to-intermediate dementia-related imaging change (${confidence}%). Clinical follow-up and structured cognitive reassessment are recommended.`
      : severity === 'non'
        ? `MRI pattern analysis indicates a low-risk pattern without clear dementia-level structural change (${confidence}%). Continue routine monitoring and reassessment if symptoms evolve.`
      : `MRI analysis completed. The model identified "${finalClassification}". Please combine this imaging result with clinical assessment for final interpretation.`;

  const originalImageSrc = toImageDataUrl(data.original_image_base64);
  const heatmapImageSrc = toImageDataUrl(data.heatmap_image_base64);
  const overlayImageSrc = toImageDataUrl(data.overlay_image_base64) || (severity === 'non' ? originalImageSrc : null);

  return {
    classification: finalClassification,
    confidence,
    confidenceValue: Number.isFinite(confidenceValue) ? confidenceValue : null,
    severity,
    explanation,
    attentionAvailable: Boolean(data.attention_available),
    explanationType: formatExplanationTypeLabel(data.explanation_type),
    originalImageSrc,
    heatmapImageSrc,
    overlayImageSrc
  };
};

const getMriSeverityStyles = (severity) => {
  if (severity === 'non') {
    return {
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
      icon: 'text-emerald-400'
    };
  }
  if (severity === 'very_mild') {
    return {
      badge: 'bg-lime-500/20 text-lime-300 border-lime-500/30',
      text: 'text-lime-400',
      bar: 'bg-lime-500',
      icon: 'text-lime-400'
    };
  }
  if (severity === 'mild') {
    return {
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
      icon: 'text-amber-400'
    };
  }
  if (severity === 'moderate') {
    return {
      badge: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      text: 'text-rose-400',
      bar: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]',
      icon: 'text-rose-400'
    };
  }
  return {
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    text: 'text-slate-300',
    bar: 'bg-slate-400',
    icon: 'text-slate-300'
  };
};

function App() {
  const [stepData, setStepData] = useState({
    step1: '',
    step2: '',
    step3: '',
    step4: '',
    step5: ''
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [mriResult, setMriResult] = useState(null);
  const [stepperStep, setStepperStep] = useState(1);
  const [mriFile, setMriFile] = useState(null);
  const [uploadingMri, setUploadingMri] = useState(false);
  const [uploadStatusType, setUploadStatusType] = useState('success');
  const [uploadStatus, setUploadStatus] = useState('');
  const [savingResult, setSavingResult] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveStatusType, setSaveStatusType] = useState('success');
  const [savingMriResult, setSavingMriResult] = useState(false);
  const [mriSaveStatus, setMriSaveStatus] = useState('');
  const [mriSaveStatusType, setMriSaveStatusType] = useState('success');
  const [stepperCardHeight, setStepperCardHeight] = useState(0);
  
  const awarenessRef = useRef(null);
  const inputSectionRef = useRef(null);
  const stepperCardRef = useRef(null);
  const resultCardRef = useRef(null);
  const resultSectionRef = useRef(null);
  const mriResultCardRef = useRef(null);
  const mriResultSectionRef = useRef(null);
  const mriInputRef = useRef(null);

  const scrollToAwareness = () => {
    awarenessRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const scrollToInput = () => {
    inputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleStepInputChange = (stepKey) => (e) => {
    setStepData(prev => ({
      ...prev,
      [stepKey]: e.target.value
    }));
  };

  const handleMriFileChange = (e) => {
    const selectedFile = e.target.files?.[0] ?? null;
    setMriFile(selectedFile);
    setMriResult(null);
    setUploadStatus('');
    setUploadStatusType('success');
  };

  const handleMriUploadSubmit = async (e) => {
    e.preventDefault();
    if (!mriFile) return;

    setUploadingMri(true);
    setUploadStatus('');

    try {
      const response = await postMriImage(mriFile);

      if (!response?.ok) {
        throw new Error(`Upload failed with status ${response?.status ?? 'unknown'}`);
      }
      const responseData = await response.json().catch(() => ({}));
      const parsedMriResult = parseMriResult(responseData);
      setMriResult(parsedMriResult);
      setMriSaveStatus('');
      setMriSaveStatusType('success');

      if (mriInputRef.current) {
        mriInputRef.current.value = '';
      }
      setMriFile(null);
      setUploadStatusType('success');
      setUploadStatus('MRI image uploaded and analyzed successfully.');
    } catch (error) {
      console.error('Error uploading MRI image:', error);
      setMriResult(null);
      setUploadStatusType('error');
      setUploadStatus('Failed to upload MRI image. Please try again.');
    } finally {
      setUploadingMri(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setResult(null);

    const payload = {
      FunctionalAssessment: Number(stepData.step1) || 0,
      ADL: Number(stepData.step2) || 0,
      MemoryComplaints: Number(stepData.step3) || 0,
      MMSE: Number(stepData.step4) || 0,
      BehavioralProblems: Number(stepData.step5) || 0
    };

    try {
      const response = await postClinicalPrediction(payload);

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      
      const prob = Number(data.probability);
      const percentage = (prob * 100).toFixed(1);
      const isPositive = data.prediction === 1 || data.diagnosis === 'Positive';

      setResult({
        classification: data.diagnosis || (isPositive ? 'Positive' : 'Negative'),
        confidence: percentage,
        prediction: data.prediction,
        explanation: isPositive 
          ? "The analysis indicates a high likelihood of Alzheimer's based on the provided clinical metrics. Please consult a specialist."
          : "The analysis indicates a low likelihood of Alzheimer's based on the provided clinical metrics. Regular monitoring is advised.",
        severity: isPositive ? 'high' : 'low'
      });
      setSaveStatus('');
      setSaveStatusType('success');
    } catch (error) {
      console.error('Error analyzing data:', error);
      alert('Failed to connect to analysis server. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const isAllStepsEmpty = Object.values(stepData).every(value => !value.trim());
  const isAnalyzeDisabled = stepperStep === 5 && isAllStepsEmpty;
  const normalizedClassification = (result?.classification || '').toLowerCase();
  const isNegativeResult = normalizedClassification === 'negative';
  const isPositiveResult = normalizedClassification === 'positive';
  const detailedExplanation = isPositiveResult
    ? `The current model output indicates an elevated likelihood of Alzheimer's-related cognitive impairment (${result?.confidence ?? '--'}%). This result should be treated as a clinical risk signal rather than a standalone diagnosis. We recommend arranging a specialist consultation for a full cognitive workup, medication review, and follow-up imaging and lab evaluation as needed.`
    : isNegativeResult
      ? `The current model output indicates a lower likelihood of Alzheimer's-related cognitive impairment (${result?.confidence ?? '--'}%). This is not a definitive exclusion of disease. If memory decline, executive dysfunction, or behavioral changes persist, continue routine monitoring and consider repeat assessment with formal neurocognitive testing and clinician follow-up.`
      : result?.explanation || 'Model output is available. Please review with a qualified clinician for final interpretation.';
  const mriSeverityStyles = getMriSeverityStyles(mriResult?.severity);

  const handleSaveResult = async () => {
    if (!resultCardRef.current) return;

    setSavingResult(true);
    setSaveStatus('');
    setSaveStatusType('success');

    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      await downloadElementScreenshot(resultCardRef.current, `clinical-result-${ts}.png`);
      setSaveStatusType('success');
      setSaveStatus('Result card screenshot is ready for download.');
    } catch (error) {
      console.error('Error saving result screenshot:', error);
      setSaveStatusType('error');
      setSaveStatus('Failed to save result screenshot. Please try again.');
    } finally {
      setSavingResult(false);
    }
  };

  const handleRetest = () => {
    setResult(null);
    setSaveStatus('');
    setSaveStatusType('success');
  };

  const handleSaveMriResult = async () => {
    if (!mriResultCardRef.current) return;

    setSavingMriResult(true);
    setMriSaveStatus('');
    setMriSaveStatusType('success');

    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      await downloadElementScreenshot(mriResultCardRef.current, `mri-result-${ts}.png`);
      setMriSaveStatusType('success');
      setMriSaveStatus('Result card screenshot is ready for download.');
    } catch (error) {
      console.error('Error saving MRI result screenshot:', error);
      setMriSaveStatusType('error');
      setMriSaveStatus('Failed to save result screenshot. Please try again.');
    } finally {
      setSavingMriResult(false);
    }
  };

  const handleMriRetest = () => {
    setMriResult(null);
    setMriSaveStatus('');
    setMriSaveStatusType('success');
  };

  useEffect(() => {
    const node = stepperCardRef.current;
    if (!node) return;

    const updateHeight = () => {
      setStepperCardHeight(node.offsetHeight || 0);
    };

    updateHeight();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(node);
    return () => observer.disconnect();
  }, [stepperStep, analyzing]);

  useEffect(() => {
    if (!result) return;

    const scrollId = window.requestAnimationFrame(() => {
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(scrollId);
  }, [result]);

  useEffect(() => {
    if (!mriResult) return;

    const scrollId = window.requestAnimationFrame(() => {
      mriResultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    return () => window.cancelAnimationFrame(scrollId);
  }, [mriResult]);

  return (
    <div className="min-h-screen bg-black text-slate-50 selection:bg-brand-500/30">

      <main className="space-y-16 pb-12">
        
        {/* Hero Section */}
        <section className="relative w-full h-[800px] bg-black overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 z-0">
            <LiquidEther
              colors={[ '#5227FF', '#FF9FFC', '#B19EEF' ]}
              mouseForce={20}
              cursorSize={160}
              isViscous
              viscous={50}
              iterationsViscous={32}
              iterationsPoisson={32}
              resolution={0.5}
              isBounce={false}
              autoDemo
              autoSpeed={0.5}
              autoIntensity={2.2}
              takeoverDuration={0.25}
              autoResumeDelay={3000}
              autoRampDuration={0.6}
              color0="#5227FF"
              color1="#FF9FFC"
              color2="#B19EEF"
            />
          </div>
          <div className="relative z-10 text-center space-y-12 max-w-4xl mx-auto px-6 flex flex-col items-center justify-start h-full pt-40">
            <GradientText
              colors={["#5227FF", "#FF9FFC", "#B19EEF"]}
              animationSpeed={3}
              showBorder={false}
              className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm shadow-sm hover:bg-white/20 transition-colors !mx-0"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity size={16} className="text-white" />
                <span>Advanced MRI & Clinical Info Analysis</span>
              </div>
            </GradientText>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight drop-shadow-xl flex flex-col items-center">
              Alzheimer’s Disease
              <div className="mt-6">
                <TrueFocus 
                  sentence="Detection Classification"
                  manualMode={false}
                  blurAmount={5}
                  borderColor="#5227FF"
                  animationDuration={0.5}
                  pauseBetweenAnimations={1}
                />
              </div>
            </h1>
            
            <div className="flex items-center gap-10 mt-16">
              <button 
                onClick={scrollToInput}
                className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold border border-white hover:bg-slate-100 transition-colors"
              >
                Get Started
              </button>
              <button 
                onClick={scrollToAwareness}
                className="px-6 py-2.5 rounded-full bg-white/10 text-white text-sm font-semibold border border-white/20 backdrop-blur-sm hover:bg-white/20 transition-colors"
              >
                Learn More
              </button>
            </div>
          </div>
        </section>

        <div className="max-w-[90rem] mx-auto px-4 md:px-8 xl:px-12 space-y-32">
          {/* Awareness Section */}
          <section ref={awarenessRef} className="py-32">
            <div className="w-full px-0 md:px-2 xl:px-4 space-y-16">
              {/* Part 1: Understanding Alzheimer's Disease */}
              <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 xl:gap-8 items-center w-full">
                <div className="space-y-8 text-left w-full md:pr-2 xl:pr-4">
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    Understanding Alzheimer's Disease
                  </h2>
                  <div className="space-y-6 text-slate-400 leading-relaxed text-lg">
                    <p>
                      Alzheimer’s disease is a progressive neurodegenerative disorder that gradually impairs memory, cognition, and daily functioning. Structural brain changes often begin years before noticeable symptoms appear, making early detection both challenging and critical.
                    </p>
                    <p>
                      Globally, over 50 million people are living with dementia, and the number continues to rise. Traditional diagnostic approaches rely heavily on clinical assessments and imaging interpretation, which may detect the disease only after significant progression.
                    </p>
                    <p>
                      Early-stage identification offers the greatest opportunity to slow decline, support treatment planning, and improve long-term quality of life.
                    </p>
                  </div>
                  <div className="flex justify-start gap-8 pt-4">
                    <div className="flex flex-col gap-1 items-center">
                      <GradientText colors={["#5227FF", "#FF9FFC", "#B19EEF"]} animationSpeed={3} showBorder={false} className="text-4xl font-black">
                        <CountUp from={0} to={55} separator="," direction="up" duration={1} className="count-up-text" />M+
                      </GradientText>
                      <span className="text-xs text-slate-500 uppercase tracking-wider">Global Cases</span>
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <GradientText colors={["#5227FF", "#FF9FFC", "#B19EEF"]} animationSpeed={3} showBorder={false} className="text-4xl font-black">
                        <CountUp from={0} to={1} duration={1} />&nbsp;in&nbsp;<CountUp from={0} to={3} duration={1} />
                      </GradientText>
                      <span className="text-xs text-slate-500 uppercase tracking-wider">Seniors Affected</span>
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <GradientText colors={["#5227FF", "#FF9FFC", "#B19EEF"]} animationSpeed={3} showBorder={false} className="text-4xl font-black">
                         <CountUp from={0} to={3} duration={1} />&nbsp;Seconds
                      </GradientText>
                      <span className="text-xs text-slate-500 uppercase tracking-wider">A New Case</span>
                    </div>
                  </div>
                </div>
                <div className="h-[590px] xl:h-[620px] w-full relative md:translate-x-2 xl:translate-x-4">
                  <div className="relative h-full w-full overflow-hidden">
                    <CardSwap
                      width={420}
                      height={310}
                      cardDistance={100}
                      verticalDistance={70}
                      delay={3000}
                      pauseOnHover
                      skewAmount={4}
                      easing="elastic"
                      containerClassName="translate-x-[-20%] translate-y-[-12%] max-[768px]:translate-x-[8%] max-[768px]:translate-y-[8%] max-[768px]:scale-[0.72] max-[480px]:translate-x-[16%] max-[480px]:translate-y-[16%] max-[480px]:scale-[0.56]"
                    >
                      <Card customClass="rounded-xl border p-6 bg-slate-950/95 border-emerald-400/30 shadow-[0_0_40px_rgba(52,211,153,0.15)] hover:border-emerald-400 hover:shadow-[0_0_60px_rgba(52,211,153,0.6)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">NonDemented</p>
                        <img
                          src={nonImg}
                          alt="NonDemented MRI sample"
                          className="mt-3 h-56 w-full rounded-lg object-cover border border-emerald-300/20"
                        />
                      </Card>
                      <Card customClass="rounded-xl border p-6 bg-slate-950/95 border-rose-400/30 shadow-[0_0_40px_rgba(251,113,133,0.14)] hover:border-rose-400 hover:shadow-[0_0_60px_rgba(251,113,133,0.6)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-rose-300/80">ModerateDemented</p>
                        <img
                          src={moderateImg}
                          alt="ModerateDemented MRI sample"
                          className="mt-3 h-56 w-full rounded-lg object-cover border border-rose-300/20"
                        />
                      </Card>
                      <Card customClass="rounded-xl border p-6 bg-slate-950/95 border-amber-400/30 shadow-[0_0_40px_rgba(251,191,36,0.14)] hover:border-amber-400 hover:shadow-[0_0_60px_rgba(251,191,36,0.6)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">MildDemented</p>
                        <img
                          src={mildImg}
                          alt="MildDemented MRI sample"
                          className="mt-3 h-56 w-full rounded-lg object-cover border border-amber-300/20"
                        />
                      </Card>
                      <Card customClass="rounded-xl border p-6 bg-slate-950/95 border-lime-400/30 shadow-[0_0_40px_rgba(163,230,53,0.14)] hover:border-lime-400 hover:shadow-[0_0_60px_rgba(163,230,53,0.6)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-lime-300/80">VeryMildDemented</p>
                        <img
                          src={veryMildImg}
                          alt="VeryMildDemented MRI sample"
                          className="mt-3 h-56 w-full rounded-lg object-cover border border-lime-300/20"
                        />
                      </Card>
                    </CardSwap>
                  </div>
                </div>
              </div>

              {/* Part 2: Why AI-Driven Screening Matters */}
              <div className="grid md:grid-cols-[1.2fr_1fr] gap-6 xl:gap-8 items-center w-full pt-16">
                <div className="space-y-8 w-full md:pr-2 xl:pr-4">
                  <h2 className="text-3xl font-bold text-white tracking-tight">
                    Why AI-Driven Screening Matters
                  </h2>
                  <div className="space-y-6 text-slate-400 leading-relaxed text-lg">
                    <p>
                      Advances in Artificial Intelligence enable the analysis of subtle structural patterns in MRI scans and structured clinical data that may not be easily detectable by the human eye.
                    </p>
                    <div className="text-slate-400">
                      <p className="mb-4">By leveraging deep learning models and optimized preprocessing techniques, our system supports:</p>
                      <ul className="list-disc list-inside space-y-2 ml-4 text-base">
                        <li>Early-stage Alzheimer’s classification</li>
                        <li>Multi-class severity prediction</li>
                        <li>Data-driven clinical decision assistance</li>
                        <li>Scalable and web-based deployment for real-world use</li>
                      </ul>
                    </div>
                    <p>
                      Our goal is to bridge the gap between cutting-edge research and practical, accessible AI tools for early Alzheimer’s detection.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-start gap-8 pt-4">
                    <div className="flex flex-col gap-1 items-center">
                      <GradientText colors={["#5227FF", "#FF9FFC", "#B19EEF"]} animationSpeed={3} showBorder={false} className="text-4xl font-black">
                        <CountUp from={0} to={40} separator="," duration={1} />K+
                      </GradientText>
                      <span className="text-xs text-slate-500 uppercase tracking-wider">MRI Images Analyzed</span>
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <GradientText colors={["#5227FF", "#FF9FFC", "#B19EEF"]} animationSpeed={3} showBorder={false} className="text-4xl font-black">
                        <CountUp from={0} to={2} separator="," duration={1} />K+
                      </GradientText>
                      <span className="text-xs text-slate-500 uppercase tracking-wider">Clinical Records Integrated</span>
                    </div>
                    <div className="flex flex-col gap-1 items-center">
                      <GradientText colors={["#5227FF", "#FF9FFC", "#B19EEF"]} animationSpeed={3} showBorder={false} className="text-4xl font-black">
                        <CountUp from={0} to={97} duration={1} />%+
                      </GradientText>
                      <span className="text-xs text-slate-500 uppercase tracking-wider">Model Accuracy</span>
                    </div>
                  </div>
                </div>
                <div className="h-[560px] w-full relative md:translate-x-2 xl:translate-x-4 flex items-center justify-center">
                  <div className="absolute inset-0 z-0">
                    <Orb
                      hoverIntensity={1.51}
                      rotateOnHover
                      hue={0}
                      forceHoverState={false}
                      backgroundColor="#000000"
                    />
                  </div>
                  <div className="relative z-10 w-48 h-48 rounded-full overflow-hidden shadow-[0_0_30px_rgba(82,39,255,0.3)]">
                    <img 
                      src={veryMildImg} 
                      alt="AI Analysis Target" 
                      className="w-full h-full object-cover opacity-90"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Input Section - Full Width */}
        <div ref={inputSectionRef} className="relative w-full py-16 mt-64">
          <div className="absolute inset-0 z-0 opacity-50">
            <Threads
              amplitude={3}
              distance={0}
              // enableMouseInteraction
            />
          </div>
          <section className="relative z-10 flex flex-col gap-8 max-w-5xl mx-auto px-6">
            
            <div className="space-y-6 text-center">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Secure Medical Data Submission
              </h2>
              <div className="text-slate-400 leading-relaxed text-sm text-left max-w-3xl mx-auto">
                <p>We prioritize patient privacy and data security.</p>
                <p>
                  All submitted clinical information and MRI scans are processed in real time and are not permanently stored on our servers.
                </p>
                <p>
                  No personal medical data is retained, shared, or used for any purpose beyond generating the requested prediction.
                </p>
              </div>
            </div>

            {/* Stepper Form */}
            {analyzing ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 min-h-[400px]">
                <Loader2 size={48} className="animate-spin text-brand-500" />
                <p className="text-xl font-medium text-white">Processing Scan...</p>
              </div>
            ) : (
              <div className="w-full mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-center">
                <div className="w-full max-w-md">
                  <Stepper
                    initialStep={1}
                    onStepChange={setStepperStep}
                    onFinalStepCompleted={handleAnalyze}
                    completeButtonText="Analyze Data"
                    backButtonText="Back"
                    nextButtonText="Next"
                    nextButtonProps={{ disabled: isAnalyzeDisabled }}
                    cardRef={stepperCardRef}
                  >
                  <Step>
                    <div className="space-y-2 pt-1">
                      <label className="block text-sm font-medium text-slate-300 mb-0">Functional Assessment</label>
                      <p className="text-xs text-slate-500 leading-snug">Evaluates higher-level daily function, including planning, task execution, and independent living ability.</p>
                      <input
                        type="text"
                        value={stepData.step1}
                        onChange={handleStepInputChange('step1')}
                        placeholder="Optional"
                        className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </Step>
                  <Step>
                    <div className="space-y-2 pt-1">
                      <label className="block text-sm font-medium text-slate-300 mb-0">ADL</label>
                      <p className="text-xs text-slate-500 leading-snug">Assesses Activities of Daily Living such as dressing, bathing, feeding, and other basic self-care tasks.</p>
                      <input
                        type="text"
                        value={stepData.step2}
                        onChange={handleStepInputChange('step2')}
                        placeholder="Optional"
                        className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </Step>
                  <Step>
                    <div className="space-y-2 pt-1">
                      <label className="block text-sm font-medium text-slate-300 mb-0">Memory Complaints</label>
                      <p className="text-xs text-slate-500 leading-snug">Captures subjective memory concerns reported by the patient or caregiver in routine cognitive observation.</p>
                      <input
                        type="text"
                        value={stepData.step3}
                        onChange={handleStepInputChange('step3')}
                        placeholder="Optional"
                        className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </Step>
                  <Step>
                    <div className="space-y-2 pt-1">
                      <label className="block text-sm font-medium text-slate-300 mb-0">MMSE</label>
                      <p className="text-xs text-slate-500 leading-snug">Mini-Mental State Examination score used to quantify orientation, recall, attention, and language performance.</p>
                      <input
                        type="text"
                        value={stepData.step4}
                        onChange={handleStepInputChange('step4')}
                        placeholder="Optional"
                        className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </Step>
                  <Step>
                    <div className="space-y-2 pt-1">
                      <label className="block text-sm font-medium text-slate-300 mb-0">Behavioral Problems</label>
                      <p className="text-xs text-slate-500 leading-snug">Tracks neuropsychiatric symptoms such as agitation, mood changes, irritability, or behavior instability.</p>
                      <input
                        type="text"
                        value={stepData.step5}
                        onChange={handleStepInputChange('step5')}
                        placeholder="Optional"
                        className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </Step>
                  </Stepper>
                </div>

                <div
                  className="w-full max-w-md rounded-3xl shadow-xl border border-white/10 bg-white/[0.16] backdrop-blur-sm p-8"
                  style={stepperCardHeight > 0 ? { height: `${stepperCardHeight}px` } : undefined}
                >
                  <h3 className="text-lg font-semibold text-white">MRI Image Upload</h3>
                  <p className="text-xs text-slate-400 mt-1">Upload a single MRI image file for later analysis.</p>

                  <form className="mt-5 space-y-4" onSubmit={handleMriUploadSubmit}>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">MRI Image File</label>
                      <input
                        ref={mriInputRef}
                        type="file"
                        accept="image/*,.dcm"
                        onChange={handleMriFileChange}
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#5227FF] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[#6340FF]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!mriFile || uploadingMri}
                      className="mt-2 w-full flex items-center justify-center gap-2 rounded-full bg-[#5227FF] py-2.5 text-sm font-medium text-white transition hover:bg-[#6340FF] active:bg-[#3F17D8] disabled:bg-slate-500 disabled:cursor-not-allowed"
                    >
                      {uploadingMri ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                      {uploadingMri ? 'Uploading...' : 'Upload MRI'}
                    </button>

                    {uploadStatus && (
                      <p className={`text-xs ${uploadStatusType === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
                        {uploadStatus}
                      </p>
                    )}
                  </form>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="max-w-5xl mx-auto px-6 space-y-16">
        {/* MRI Result Section */}        {mriResult && (
          <section
            ref={mriResultSectionRef}
            className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 lg:max-w-[920px] lg:mx-auto"
          >
            <div ref={mriResultCardRef} className="bg-white/[0.16] backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden border border-white/10">
              <div className="p-8 md:p-10">
                <div className="space-y-6">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">MRI Analysis Result</h3>
                      <div className="flex items-center gap-3">
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">{mriResult.classification}</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${mriSeverityStyles.badge}`}>
                          MRI
                        </span>
                      </div>
                    </div>

                    <div className="w-full md:w-[280px] pt-1 md:pt-0">
                      <h4 className="text-sm font-semibold text-white mb-4">Risk Probability</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-300">Imaging Probability</span>
                            <span className={`font-bold ${mriSeverityStyles.text}`}>
                              {mriResult.confidence}%
                            </span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${mriSeverityStyles.bar}`}
                              style={{ width: `${mriResult.confidence}%` }}
                            ></div>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2 text-right">
                            Threshold: 50%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-black/30 rounded-xl border border-white/10">
                    <div className="flex gap-3">
                      <Brain className={`shrink-0 mt-1 ${mriSeverityStyles.icon}`} size={20} />
                      <p className="text-slate-300 leading-relaxed">
                        {mriResult.explanation}
                      </p>
                    </div>
                  </div>

                  {(mriResult.overlayImageSrc || mriResult.originalImageSrc || mriResult.heatmapImageSrc || mriResult.severity === 'non') && (
                    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Attention Overlay</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {mriResult.attentionAvailable
                                ? 'Model-highlighted MRI regions associated with the current classification.'
                                : 'No abnormal attention map was generated. The original MRI is shown for reference.'}
                            </p>
                          </div>
                          {mriResult.explanationType && (
                            <span className="whitespace-nowrap rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                              {mriResult.explanationType}
                            </span>
                          )}
                        </div>
                        {mriResult.overlayImageSrc ? (
                          <div className="flex-1">
                            <img
                              src={mriResult.overlayImageSrc}
                              alt={`${mriResult.classification} MRI attention overlay`}
                              className="h-full min-h-[280px] w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex min-h-[280px] flex-1 items-center justify-center px-6 text-center text-sm text-slate-500">
                            No highlighted MRI overlay was returned for this scan.
                          </div>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                        {mriResult.originalImageSrc && (
                          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                            <div className="border-b border-white/10 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Original MRI</p>
                            </div>
                            <div className="flex-1">
                              <img
                                src={mriResult.originalImageSrc}
                                alt="Original uploaded MRI"
                                className="h-full min-h-[190px] w-full object-cover"
                              />
                            </div>
                          </div>
                        )}

                        {mriResult.heatmapImageSrc && (
                          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                            <div className="border-b border-white/10 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Heatmap View</p>
                            </div>
                            <div className="flex-1">
                              <img
                                src={mriResult.heatmapImageSrc}
                                alt="MRI attention heatmap"
                                className="h-full min-h-[190px] w-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                        {!mriResult.heatmapImageSrc && (
                          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                            <div className="border-b border-white/10 px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Heatmap View</p>
                            </div>
                            <div className="flex min-h-[190px] flex-1 items-center justify-center px-6 text-center text-sm text-slate-500">
                              No heatmap is shown for the current MRI result.
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleSaveMriResult}
                disabled={savingMriResult}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5227FF] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#6340FF] active:bg-[#3F17D8] disabled:bg-slate-500 disabled:cursor-not-allowed"
              >
                {savingMriResult ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {savingMriResult ? 'Saving...' : 'Save Result'}
              </button>
              <button
                type="button"
                onClick={handleMriRetest}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                <RotateCcw size={15} />
                Test Again
              </button>
            </div>
            {mriSaveStatus && (
              <p className={`mt-2 text-xs text-right ${mriSaveStatusType === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
                {mriSaveStatus}
              </p>
            )}
          </section>
        )}

        {/* Result Section */}        {result && (
          <section
            ref={resultSectionRef}
            className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700 lg:max-w-[920px] lg:mx-auto"
          >
            <div ref={resultCardRef} className="bg-white/[0.16] backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden border border-white/10">
              <div className="p-8 md:p-10">
                <div className="space-y-6">
                  <div className="flex flex-col gap-6 md:flex-row md:items-start">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Clinical Assessment Result</h3>
                      <div className="flex items-center gap-3">
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">{result.classification}</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          isNegativeResult
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          Diagnosis
                        </span>
                      </div>
                    </div>

                    <div className="w-full md:w-[280px] pt-1 md:pt-0">
                      <h4 className="text-sm font-semibold text-white mb-4">Risk Probability</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-300">Alzheimer's Probability</span>
                            <span className={`font-bold ${isNegativeResult ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {result.confidence}%
                            </span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                isNegativeResult ? 'bg-emerald-500' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                              }`}
                              style={{ width: `${result.confidence}%` }}
                            ></div>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2 text-right">
                            Threshold: 50%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-black/30 rounded-xl border border-white/10">
                    <div className="flex gap-3">
                      <Brain className={`shrink-0 mt-1 ${isNegativeResult ? 'text-emerald-400' : 'text-rose-400'}`} size={20} />
                      <p className="text-slate-300 leading-relaxed">
                        {detailedExplanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleSaveResult}
                disabled={savingResult}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5227FF] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#6340FF] active:bg-[#3F17D8] disabled:bg-slate-500 disabled:cursor-not-allowed"
              >
                {savingResult ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {savingResult ? 'Saving...' : 'Save Result'}
              </button>
              <button
                type="button"
                onClick={handleRetest}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                <RotateCcw size={15} />
                Test Again
              </button>
            </div>
            {saveStatus && (
              <p className={`mt-2 text-xs text-right ${saveStatusType === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>
                {saveStatus}
              </p>
            )}
          </section>
        )}

          <ChatbotPanel />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 mt-12 bg-black">
         <div className="max-w-5xl mx-auto px-6 text-center text-slate-500 text-sm">
           <p>© 2026 Alzheimer's Detection Research System. For clinical support only.</p>
         </div>
      </footer>
    </div>
  );
}

export default App;
