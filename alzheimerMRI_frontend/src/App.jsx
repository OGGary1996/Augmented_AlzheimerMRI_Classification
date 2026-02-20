import React, { useEffect, useState, useRef } from 'react';
import LiquidEther from './LiquidEther';
import GradientText from './GradientText';
import TrueFocus from './TrueFocus';
import Threads from './Threads';
import CountUp from './CountUp';
import Orb from './Orb';
import CardSwap, { Card } from './CardSwap';
import Stepper, { Step } from './Stepper';

import mildImg from './assets/MildDemented/0a0a0acd-8bd8-4b79-b724-cc5711e83bc7.jpg';
import moderateImg from './assets/ModerateDemented/0a0d37fb-adeb-4e0e-8bc8-624cd70fc6e7.jpg';
import nonImg from './assets/NonDemented/0a4abb93-5af1-4d3a-a475-3be960cdd4af.jpg';
import veryMildImg from './assets/VeryMildDemented/0a1d2c6b-8a59-4e07-879f-fd4f4b76db34.jpg';

import { 
  Brain, 
  Activity, 
  Upload,
  CheckCircle,
  Loader2
} from 'lucide-react';

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
  const [stepperStep, setStepperStep] = useState(1);
  const [mriFile, setMriFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [stepperCardHeight, setStepperCardHeight] = useState(0);
  
  const awarenessRef = useRef(null);
  const inputSectionRef = useRef(null);
  const stepperCardRef = useRef(null);

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
    setUploadStatus('');
  };

  const handleMriUploadSubmit = (e) => {
    e.preventDefault();
    if (!mriFile) return;
    setUploadStatus('MRI image added successfully.');
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
      const apiUrl = import.meta.env.REACT_APP_API_URL || '';
      const response = await fetch(`${apiUrl}/predict/clinical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

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
    } catch (error) {
      console.error('Error analyzing data:', error);
      alert('Failed to connect to analysis server. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const isAllStepsEmpty = Object.values(stepData).every(value => !value.trim());
  const isAnalyzeDisabled = stepperStep === 5 && isAllStepsEmpty;

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
                      <Card customClass="rounded-xl border p-6 bg-slate-950/95 border-cyan-400/30 shadow-[0_0_40px_rgba(34,211,238,0.15)] hover:border-cyan-400 hover:shadow-[0_0_60px_rgba(34,211,238,0.6)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/80">NonDemented</p>
                        <img
                          src={nonImg}
                          alt="NonDemented MRI sample"
                          className="mt-3 h-56 w-full rounded-lg object-cover border border-cyan-300/20"
                        />
                      </Card>
                      <Card customClass="rounded-xl border p-6 bg-slate-950/95 border-emerald-400/30 shadow-[0_0_40px_rgba(52,211,153,0.14)] hover:border-emerald-400 hover:shadow-[0_0_60px_rgba(52,211,153,0.6)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">ModerateDemented</p>
                        <img
                          src={moderateImg}
                          alt="ModerateDemented MRI sample"
                          className="mt-3 h-56 w-full rounded-lg object-cover border border-emerald-300/20"
                        />
                      </Card>
                      <Card customClass="rounded-xl border p-6 bg-slate-950/95 border-violet-400/30 shadow-[0_0_40px_rgba(167,139,250,0.14)] hover:border-violet-400 hover:shadow-[0_0_60px_rgba(167,139,250,0.6)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-violet-300/80">MildDemented</p>
                        <img
                          src={mildImg}
                          alt="MildDemented MRI sample"
                          className="mt-3 h-56 w-full rounded-lg object-cover border border-violet-300/20"
                        />
                      </Card>
                      <Card customClass="rounded-xl border p-6 bg-slate-950/95 border-amber-400/30 shadow-[0_0_40px_rgba(251,191,36,0.14)] hover:border-amber-400 hover:shadow-[0_0_60px_rgba(251,191,36,0.6)]">
                        <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">VeryMildDemented</p>
                        <img
                          src={veryMildImg}
                          alt="VeryMildDemented MRI sample"
                          className="mt-3 h-56 w-full rounded-lg object-cover border border-amber-300/20"
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
                      <label className="block text-sm font-medium text-slate-300 mb-0">FunctionalAssessment</label>
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
                      <label className="block text-sm font-medium text-slate-300 mb-0">MemoryComplaints</label>
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
                      <label className="block text-sm font-medium text-slate-300 mb-0">BehavioralProblems</label>
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
                        type="file"
                        accept="image/*,.dcm"
                        onChange={handleMriFileChange}
                        className="w-full px-3 py-2 rounded-lg bg-black/50 border border-white/10 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#5227FF] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-[#6340FF]"
                      />
                    </div>

                    {mriFile && (
                      <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-300 shrink-0" />
                        <p className="text-xs text-emerald-200">
                          {mriFile.name} ({(mriFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={!mriFile}
                      className="w-full flex items-center justify-center gap-2 rounded-full bg-[#5227FF] py-2.5 text-sm font-medium text-white transition hover:bg-[#6340FF] active:bg-[#3F17D8] disabled:bg-slate-500 disabled:cursor-not-allowed"
                    >
                      <Upload size={15} />
                      Upload MRI
                    </button>

                    {uploadStatus && <p className="text-xs text-emerald-300">{uploadStatus}</p>}
                  </form>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="max-w-5xl mx-auto px-6 space-y-16">
        {/* Result Section */}        {result && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white/[0.16] backdrop-blur-sm rounded-3xl shadow-xl overflow-hidden border border-white/10">
              <div className="p-8 md:p-10">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  
                  <div className="flex-1 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Clinical Assessment Result</h3>
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-white">{result.classification}</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          result.classification === 'Negative' 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}>
                          Diagnosis
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-black/30 rounded-xl border border-white/10">
                      <div className="flex gap-3">
                        <Brain className={`shrink-0 mt-1 ${result.classification === 'Negative' ? 'text-emerald-400' : 'text-rose-400'}`} size={20} />
                        <p className="text-slate-300 leading-relaxed">
                          {result.explanation}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-1/3 bg-black/30 rounded-xl p-6 border border-white/10">
                     <h4 className="text-sm font-semibold text-white mb-4">Risk Probability</h4>
                     <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-300">Alzheimer's Probability</span>
                            <span className={`font-bold ${result.classification === 'Negative' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {result.confidence}%
                            </span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                result.classification === 'Negative' ? 'bg-emerald-500' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
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
              </div>
            </div>
          </section>
        )}

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
