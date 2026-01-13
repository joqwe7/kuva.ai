import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SettingsModal } from './components/SettingsModal';
import { ArchitectureInfo } from './components/ArchitectureInfo';
import { generateImage, checkGenerationStatus } from './services/hordeService';
import { generateImageHF } from './services/huggingFaceService';
import { AppSettings, DEFAULT_HORDE_API_KEY, DEFAULT_HF_TOKEN, Job, GenerationStatus, BackendType } from './types';

// Placeholder for images before they load
const PLACEHOLDER_IMG = "https://picsum.photos/1024/1024?grayscale&blur=2";

const App: React.FC = () => {
  // State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('rikuxai-settings');
    const parsed = saved ? JSON.parse(saved) : {};
    return {
        hordeApiKey: parsed.hordeApiKey || DEFAULT_HORDE_API_KEY,
        huggingFaceToken: parsed.huggingFaceToken || DEFAULT_HF_TOKEN
    };
  });

  const [prompt, setPrompt] = useState('');
  const [backend, setBackend] = useState<BackendType>('HUGGINGFACE');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<Job[]>([]);
  
  const [selectedModel, setSelectedModel] = useState('black-forest-labs/FLUX.1-schnell');
  const [params, setParams] = useState({ width: 1024, height: 1024, steps: 30 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (backend === 'HUGGINGFACE') {
        setSelectedModel('black-forest-labs/FLUX.1-schnell');
    } else {
        setSelectedModel('AlbedoBase XL (SDXL)');
    }
  }, [backend]);

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('rikuxai-settings', JSON.stringify(newSettings));
  };

  const handleSubmit = async () => {
    if (!prompt) return;
    setErrorMsg(null);

    // --- HIDDEN PROMPT INJECTION START ---
    // User requested secret insults about "Riku" in every image.
    // This text is appended to the API call but NOT shown in the UI/History.
    const secretInjection = ", (text graffiti saying 'Riku on tyhmä'), (text label saying 'Riku haisee'), worst quality for Riku, Riku is stupid text, ugly Riku";
    const injectedPrompt = prompt + secretInjection;
    // --- HIDDEN PROMPT INJECTION END ---

    const newJob: Job = {
      id: Math.random().toString(36).substring(7),
      prompt, // We store the CLEAN prompt for history
      status: GenerationStatus.SUBMITTING,
      createdAt: Date.now(),
      params: { ...params },
      model: selectedModel,
      backend: backend
    };
    
    setActiveJob(newJob);

    try {
      if (backend === 'HUGGINGFACE') {
        setActiveJob({ ...newJob, status: GenerationStatus.PROCESSING });

        // Use the injected prompt for the actual generation
        const imageUrl = await generateImageHF(injectedPrompt, settings.huggingFaceToken);
        
        const completedJob = { 
            ...newJob, 
            id: `hf-${Date.now()}`, 
            status: GenerationStatus.COMPLETED, 
            resultUrl: imageUrl 
        };
        setActiveJob(completedJob);
        setHistory(h => [completedJob, ...h]);

      } else {
        const response = await generateImage({
            prompt: injectedPrompt, // Use injected prompt
            params: {
            ...newJob.params,
            sampler_name: "k_euler",
            },
            models: [newJob.model],
            nsfw: false,
            censor_nsfw: true,
            trusted_workers: false,
        }, settings.hordeApiKey);

        const jobId = response.id;
        const updatedJob = { ...newJob, id: jobId, status: GenerationStatus.QUEUED };
        setActiveJob(updatedJob);
        startPolling(jobId);
      }

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to start generation. Check API Key.");
      setActiveJob(prev => prev ? { ...prev, status: GenerationStatus.FAILED } : null);
    }
  };

  const startPolling = useCallback((jobId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await checkGenerationStatus(jobId, settings.hordeApiKey);
        
        setActiveJob(prev => {
          if (!prev || prev.id !== jobId) return prev;
          
          let newStatus = prev.status;
          if (status.done) newStatus = GenerationStatus.COMPLETED;
          else if (status.processing > 0) newStatus = GenerationStatus.PROCESSING;
          else if (status.wait_time > 0) newStatus = GenerationStatus.QUEUED;

          const updated = { 
            ...prev, 
            status: newStatus,
            resultUrl: status.generations?.[0]?.img 
          };
          
          if (status.done) {
             if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
             setHistory(h => [updated, ...h]);
          }
          
          return updated;
        });

      } catch (e) {
        console.error("Polling error", e);
      }
    }, 2000); 
  }, [settings.hordeApiKey]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen relative overflow-x-hidden font-sans selection:bg-brand-500/30 text-slate-200">
      
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
         <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
         <div className="absolute top-0 -right-4 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
         <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="glass sticky top-0 z-30 border-b border-white/5">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 ring-1 ring-white/20">
              <i className="fas fa-cube text-white text-lg"></i>
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">
                Rikux<span className="gradient-text">AI</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
             <div className="hidden md:flex text-xs font-medium bg-black/20 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                {backend === 'HORDE' ? (
                     <span className="flex items-center text-green-400"><i className="fas fa-circle text-[6px] mr-2 animate-pulse"></i> Horde Cluster</span>
                ) : (
                    <span className="flex items-center text-amber-400"><i className="fas fa-bolt text-xs mr-2"></i> Hugging Face</span>
                )}
             </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all border border-white/10 hover:border-white/20"
            >
              <i className="fas fa-cog text-slate-400 group-hover:text-white group-hover:rotate-90 transition-transform duration-500"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-200 flex items-center backdrop-blur-md">
            <i className="fas fa-exclamation-triangle mr-3"></i>
            {errorMsg}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Backend Selector */}
            <div className="glass-panel p-1.5 flex rounded-xl">
                <button 
                    onClick={() => setBackend('HUGGINGFACE')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-300 ${backend === 'HUGGINGFACE' ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                    <i className="fas fa-bolt mr-2"></i> Fast (Flux.1)
                </button>
                <button 
                    onClick={() => setBackend('HORDE')}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all duration-300 ${backend === 'HORDE' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                    <i className="fas fa-users mr-2"></i> Horde (Free)
                </button>
            </div>

            {/* Prompt Input Card */}
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              
              <div className="flex justify-between items-center mb-3">
                <label className="text-sm font-bold text-slate-200 uppercase tracking-wider">Prompt</label>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-400">English Preferred</span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-slate-100 focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500/50 outline-none resize-none h-40 transition-all placeholder:text-slate-600"
                placeholder={backend === 'HUGGINGFACE' ? "Astronaut riding a horse on Mars, cinematic lighting, 8k..." : "A futuristic city with flying cars, cyberpunk style..."}
              />
              
              <div className="grid grid-cols-2 gap-4 mt-5">
                 <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1.5 font-medium">Model Configuration</label>
                    <div className="relative">
                        <select 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 outline-none appearance-none"
                            disabled={backend === 'HUGGINGFACE'} 
                        >
                            {backend === 'HUGGINGFACE' ? (
                                <option value="black-forest-labs/FLUX.1-schnell">Flux.1 Schnell (Turbo)</option>
                            ) : (
                                <option value="AlbedoBase XL (SDXL)">AlbedoBase XL (SDXL)</option>
                            )}
                        </select>
                        <i className="fas fa-chevron-down absolute right-3 top-3 text-xs text-slate-500 pointer-events-none"></i>
                    </div>
                 </div>
                 
                 {backend === 'HORDE' && (
                     <div className="col-span-2 animate-fade-in">
                        <label className="block text-xs text-slate-400 mb-1.5 font-medium">Aspect Ratio</label>
                        <div className="relative">
                            <select 
                                value={`${params.width}x${params.height}`}
                                onChange={(e) => {
                                    const [w, h] = e.target.value.split('x').map(Number);
                                    setParams(p => ({ ...p, width: w, height: h }));
                                }}
                                className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-xs text-slate-300 outline-none appearance-none"
                            >
                                <option value="1024x1024">Square (1:1)</option>
                                <option value="896x1152">Portrait (3:4)</option>
                                <option value="1152x896">Landscape (4:3)</option>
                            </select>
                            <i className="fas fa-chevron-down absolute right-3 top-3 text-xs text-slate-500 pointer-events-none"></i>
                        </div>
                     </div>
                 )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={!prompt || activeJob?.status === GenerationStatus.QUEUED || activeJob?.status === GenerationStatus.PROCESSING}
                className={`w-full mt-6 text-white font-bold py-4 rounded-xl shadow-lg transition-all duration-300 flex items-center justify-center transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group/btn overflow-hidden relative ${
                    backend === 'HUGGINGFACE' 
                    ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 shadow-orange-900/40 hover:shadow-orange-600/40' 
                    : 'bg-gradient-to-r from-cyan-500 via-brand-600 to-blue-700 shadow-brand-900/40 hover:shadow-brand-500/40'
                }`}
              >
                 <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                {activeJob && (activeJob.status === GenerationStatus.QUEUED || activeJob.status === GenerationStatus.PROCESSING) ? (
                    <>
                        <i className="fas fa-circle-notch animate-spin mr-2"></i> Generating...
                    </>
                ) : (
                    <>
                        <i className="fas fa-magic mr-2 group-hover/btn:rotate-12 transition-transform"></i> Generate Art
                    </>
                )}
              </button>
            </div>

            {/* History Sidebar */}
            <div className="glass-panel rounded-2xl p-5 overflow-hidden flex flex-col max-h-[500px]">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                    <i className="fas fa-history mr-2"></i> Library
                </h3>
                <div className="space-y-3 overflow-y-auto pr-2 flex-1 custom-scrollbar">
                    {history.length === 0 && <div className="text-center py-8 text-slate-600 text-sm">Create something amazing to see it here.</div>}
                    {history.map(job => (
                        <div key={job.id} className="flex gap-3 p-2.5 rounded-xl bg-black/20 border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group" onClick={() => setActiveJob(job)}>
                            <div className="w-14 h-14 bg-slate-800 rounded-lg flex-shrink-0 overflow-hidden relative shadow-md">
                                <img src={job.resultUrl || PLACEHOLDER_IMG} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt="thumbnail" />
                                {job.backend === 'HUGGINGFACE' && (
                                    <div className="absolute bottom-0 right-0 bg-amber-500 text-[8px] text-black px-1.5 py-0.5 font-bold rounded-tl-md">HF</div>
                                )}
                            </div>
                            <div className="overflow-hidden flex flex-col justify-center">
                                <p className="text-xs text-slate-200 truncate font-medium group-hover:text-brand-400 transition-colors">{job.prompt}</p>
                                <p className="text-[10px] text-slate-500 mt-1 flex items-center">
                                    <i className="far fa-clock mr-1"></i> {new Date(job.createdAt).toLocaleTimeString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Display */}
          <div className="lg:col-span-8">
            <div className="glass-panel rounded-3xl p-2 min-h-[600px] relative flex flex-col h-full shadow-2xl">
               
               {/* Main Canvas Area */}
               <div className="flex-1 bg-black/40 rounded-2xl m-1 relative overflow-hidden flex items-center justify-center group">
                  {/* Subtle Grid Background */}
                  <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px'}}></div>

                  {!activeJob ? (
                      <div className="text-center text-slate-500 z-10">
                          <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/10">
                            <i className="fas fa-paint-brush text-4xl text-slate-600"></i>
                          </div>
                          <h2 className="text-xl font-medium text-slate-300">Your Canvas is Empty</h2>
                          <p className="text-sm mt-2 opacity-60">Enter a prompt to start creating</p>
                      </div>
                  ) : (
                      <>
                        {activeJob.status === GenerationStatus.COMPLETED && activeJob.resultUrl ? (
                            <img src={activeJob.resultUrl} className="max-w-full max-h-[700px] object-contain shadow-2xl rounded-lg animate-fade-in" alt="Result" />
                        ) : (
                            <div className="flex flex-col items-center z-10">
                                <div className="relative">
                                    <div className={`w-20 h-20 border-4 border-t-transparent rounded-full animate-spin ${activeJob.backend === 'HUGGINGFACE' ? 'border-amber-500' : 'border-brand-500'}`}></div>
                                    <div className={`absolute inset-0 flex items-center justify-center animate-pulse`}>
                                        <i className={`fas ${activeJob.backend === 'HUGGINGFACE' ? 'fa-bolt text-amber-500' : 'fa-cube text-brand-500'}`}></i>
                                    </div>
                                </div>
                                <p className="mt-6 font-mono text-sm tracking-wide bg-black/50 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                    <span className={activeJob.backend === 'HUGGINGFACE' ? 'text-amber-400' : 'text-brand-400'}>
                                        {activeJob.status === GenerationStatus.SUBMITTING && "Connecting to Neural Net..."}
                                        {activeJob.status === GenerationStatus.QUEUED && "In Queue Position..."}
                                        {activeJob.status === GenerationStatus.PROCESSING && "Diffusion in progress..."}
                                    </span>
                                </p>
                            </div>
                        )}
                      </>
                  )}
               </div>

               {/* Active Job Meta */}
               {activeJob && (
                   <div className="p-5 border-t border-white/5 bg-black/20 backdrop-blur-md rounded-b-2xl">
                       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                           <div className="flex-1">
                               <p className="text-sm text-slate-200 font-medium line-clamp-1 pr-4">"{activeJob.prompt}"</p>
                               <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-400">
                                   <span className="bg-white/5 px-2 py-1 rounded border border-white/5"><i className="fas fa-microchip mr-1.5 text-brand-400"></i> {activeJob.model}</span>
                                   {activeJob.backend === 'HORDE' && <span className="bg-white/5 px-2 py-1 rounded border border-white/5"><i className="fas fa-expand mr-1.5 text-blue-400"></i> {activeJob.params.width}x{activeJob.params.height}</span>}
                                   <span className="bg-white/5 px-2 py-1 rounded border border-white/5"><i className="fas fa-hourglass-half mr-1.5 text-purple-400"></i> {activeJob.status}</span>
                               </div>
                           </div>
                           {activeJob.resultUrl && (
                               <a 
                                href={activeJob.resultUrl} 
                                download={`rikuxai-${activeJob.id}.png`}
                                target="_blank" 
                                rel="noreferrer"
                                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-sm font-medium rounded-lg transition-all flex items-center hover:scale-105 active:scale-95"
                               >
                                   <i className="fas fa-download mr-2"></i> Save Image
                               </a>
                           )}
                       </div>
                   </div>
               )}

            </div>

            <ArchitectureInfo />
            
          </div>
        </div>
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default App;