import React, { useState, useRef } from 'react';
import LiquidEther from './LiquidEther';
import GradientText from './GradientText';
import TrueFocus from './TrueFocus';
import Threads from './Threads';
import { 
  Brain, 
  Upload, 
  Activity, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  ChevronRight,
  Loader2
} from 'lucide-react';

function App() {
  const [formData, setFormData] = useState({
    age: '',
    gender: 'female',
    mmse: '',
  });
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  const awarenessRef = useRef(null);

  const scrollToAwareness = () => {
    awarenessRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    } else {
      setFormData({
        ...formData,
        [e.target.name]: e.target.value
      });
    }
  };

  const handleAnalyze = () => {
    if (!file) return;
    
    setAnalyzing(true);
    setResult(null);

    // Simulate API call
    setTimeout(() => {
      setAnalyzing(false);
      setResult({
        classification: 'Very Mild Demented',
        confidence: 88.5,
        explanation: 'Analysis detects slight hippocampal atrophy consistent with early-stage progression. Clinical correlation recommended.',
        severity: 'low' // low, medium, high
      });
    }, 2500);
  };

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
              <button className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold border border-white hover:bg-slate-100 transition-colors">
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

        <div className="max-w-5xl mx-auto px-6 space-y-32">
          {/* Awareness Section */}
          <section ref={awarenessRef} className="py-32 border-b border-white/10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-white tracking-tight">
                  Understanding Alzheimer's Disease
                </h2>
                <div className="space-y-4 text-slate-400 leading-relaxed">
                  <p>
                    Alzheimer's disease is a progressive neurologic disorder that causes the brain to shrink (atrophy) and brain cells to die. It is the most common cause of dementia — a continuous decline in thinking, behavioral and social skills that affects a person's ability to function independently.
                  </p>
                  <p>
                    Early detection is crucial. Identifying the disease in its prodromal or mild stages allows for interventions that can significantly slow progression, manage symptoms, and improve the quality of life for patients and their families.
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-2xl font-bold text-brand-400">50M+</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Global Cases</span>
                  </div>
                  <div className="w-px h-12 bg-white/10 mx-4"></div>
                  <div className="flex flex-col gap-1">
                    <span className="text-2xl font-bold text-brand-400">1 in 3</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Seniors Affected</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/20 to-purple-600/20 rounded-2xl blur-2xl"></div>
                <div className="relative bg-white/5 border border-white/10 p-8 rounded-2xl backdrop-blur-sm space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-brand-500/20 text-brand-400">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">Why Early Screening Matters?</h3>
                      <p className="text-sm text-slate-400">
                        Current treatments cannot stop Alzheimer's from progressing, but they can temporarily slow the worsening of dementia symptoms and improve quality of life for those with Alzheimer's and their caregivers.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400">
                      <Brain size={24} />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">Our AI Approach</h3>
                      <p className="text-sm text-slate-400">
                        Utilizing advanced Convolutional Neural Networks (CNN) to analyze MRI scans with high precision, detecting subtle patterns of atrophy often missed by the human eye in early stages.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Input Section - Full Width */}
        <div className="relative w-full py-16 mt-64">
          <div className="absolute inset-0 z-0 opacity-50">
            <Threads
              amplitude={3}
              distance={0}
              enableMouseInteraction
            />
          </div>
          <section className="relative z-10 flex flex-col gap-8 max-w-2xl mx-auto px-6">
            
            {/* Clinical Data Form */}
            <div className="space-y-6">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <FileText size={20} className="text-brand-400"/>
                Clinical Data
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Age</label>
                  <input 
                    type="number" 
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="e.g. 72"
                    className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Gender</label>
                  <select 
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                  >
                    <option value="female" className="bg-slate-900">Female</option>
                    <option value="male" className="bg-slate-900">Male</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">MMSE Score</label>
                  <input 
                    type="number" 
                    name="mmse"
                    value={formData.mmse}
                    onChange={handleChange}
                    placeholder="0-30"
                    className="w-full px-4 py-2 rounded-lg bg-black/50 border border-white/10 text-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder:text-slate-600"
                  />
                  <p className="text-xs text-slate-500 mt-1">Mini-Mental State Examination</p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload & Action */}
          <div className="space-y-6 flex flex-col">
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm flex-1 flex flex-col">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <Upload size={20} className="text-brand-400"/>
                MRI Scan Upload
              </h2>

              <div 
                className={`flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-8 transition-all ${
                  dragActive 
                    ? 'border-brand-500 bg-brand-500/10' 
                    : file 
                      ? 'border-brand-500/50 bg-brand-500/10' 
                      : 'border-white/20 hover:border-brand-400 hover:bg-white/5'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  id="file-upload" 
                  className="hidden" 
                  onChange={handleChange}
                  accept="image/*,.dcm"
                />
                
                {file ? (
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle size={24} />
                    </div>
                    <p className="text-sm font-medium text-white">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button 
                      onClick={() => setFile(null)}
                      className="text-xs text-red-400 hover:text-red-300 mt-3 font-medium underline decoration-red-400/30 underline-offset-2"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <label htmlFor="file-upload" className="cursor-pointer text-center">
                    <div className="w-12 h-12 bg-brand-500/20 text-brand-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-medium text-white">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-400 mt-1">DICOM, PNG, JPG up to 50MB</p>
                  </label>
                )}
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!file || analyzing}
              className={`w-full py-4 rounded-xl font-semibold text-lg shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${
                !file || analyzing
                  ? 'bg-white/5 text-slate-500 cursor-not-allowed shadow-none border border-white/5'
                  : 'bg-brand-600 hover:bg-brand-500 text-white'
              }`}
            >
              {analyzing ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Processing Scan...
                </>
              ) : (
                <>
                  Analyze Data <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
          </section>
        </div>

        <div className="max-w-5xl mx-auto px-6 space-y-16">
        {/* Result Section */}        {result && (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-200">
              <div className="p-1 bg-gradient-to-r from-brand-500 via-purple-500 to-brand-500 opacity-20"></div>
              <div className="p-8 md:p-10">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  
                  <div className="flex-1 space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Analysis Result</h3>
                      <div className="flex items-center gap-3">
                        <h2 className="text-3xl font-bold text-slate-900">{result.classification}</h2>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          result.classification.includes('Non') 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {result.confidence}% Confidence
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="flex gap-3">
                        <Brain className="text-brand-600 shrink-0 mt-1" size={20} />
                        <p className="text-slate-700 leading-relaxed">
                          {result.explanation}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-1/3 bg-slate-50 rounded-xl p-6 border border-slate-100">
                     <h4 className="text-sm font-semibold text-slate-900 mb-4">Confidence Metric</h4>
                     <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">Non-Demented</span>
                            <span className="text-slate-500">10%</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-400 rounded-full" style={{ width: '10%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-900">Very Mild</span>
                            <span className="text-brand-600 font-bold">88.5%</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: '88.5%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-700">Mild</span>
                            <span className="text-slate-500">1.5%</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-400 rounded-full" style={{ width: '1.5%' }}></div>
                          </div>
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
