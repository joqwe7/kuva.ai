import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SettingsModal } from './components/SettingsModal';
import { ArchitectureInfo } from './components/ArchitectureInfo';
import { generateImage, checkGenerationStatus } from './services/hordeService';
import { AppSettings, DEFAULT_HORDE_API_KEY, Job, GenerationStatus } from './types';

// Placeholder for images before they load
const PLACEHOLDER_IMG = "https://picsum.photos/1024/1024?grayscale&blur=2";

const App: React.FC = () => {
  // State
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('hordegen-settings');
    return saved ? JSON.parse(saved) : { hordeApiKey: DEFAULT_HORDE_API_KEY };
  });

  const [prompt, setPrompt] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [history, setHistory] = useState<Job[]>([]);
  
  // Hardcoded single model as requested
  const [selectedModel, setSelectedModel] = useState('AlbedoBase XL (SDXL)');
  
  // Default to 1024x1024 for SDXL
  const [params, setParams] = useState({ width: 1024, height: 1024, steps: 30 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Polling ref
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Save Settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('hordegen-settings', JSON.stringify(newSettings));
  };

  // Submit Job
  const handleSubmit = async () => {
    if (!prompt) return;
    setErrorMsg(null);

    const newJob: Job = {
      id: '',
      prompt,
      status: GenerationStatus.SUBMITTING,
      createdAt: Date.now(),
      params: { ...params },
      model: selectedModel
    };
    
    // Optimistic UI
    setActiveJob(newJob);

    try {
      const response = await generateImage({
        prompt: newJob.prompt,
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
      
      // Start Polling
      startPolling(jobId);

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to start generation");
      setActiveJob(null);
    }
  };

  // Polling Logic
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
        // Don't stop polling on transient network errors, but maybe log it
      }
    }, 2000); // Poll every 2s
  }, [settings.hordeApiKey]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 text-slate-200 font-sans selection:bg-brand-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-dark-800/50 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-brand-600 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/20">
              <i className="fas fa-cube text-white text-sm"></i>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Horde<span className="text-brand-500">Gen</span></span>
          </div>
          <div className="flex items-center space-x-4">
             <div className="hidden md:flex text-xs text-slate-500 space-x-4">
                <span className="flex items-center"><i className="fas fa-check-circle mr-1 text-green-500"></i> AI Horde Connected</span>
                <span className="flex items-center"><i className="fas fa-microchip mr-1 text-purple-500"></i> Workers Active</span>
             </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors border border-slate-700"
            >
              <i className="fas fa-cog text-slate-400"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        
        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-200 flex items-center animate-pulse">
            <i className="fas fa-exclamation-triangle mr-3"></i>
            {errorMsg}
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Prompt Input Card */}
            <div className="bg-dark-800 rounded-xl border border-slate-700 p-5 shadow-xl">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-300">Prompt</label>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none h-32"
                placeholder="A futuristic city with flying cars, cyberpunk style..."
              />
              
              {/* Settings Grid */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                 <div>
                    <label className="block text-xs text-slate-400 mb-1">Model</label>
                    <select 
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full bg-dark-900 border border-slate-700 rounded p-2 text-xs text-slate-300 outline-none opacity-70 cursor-not-allowed"
                        disabled
                    >
                        <option value="AlbedoBase XL (SDXL)">AlbedoBase XL (SDXL)</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs text-slate-400 mb-1">Dimensions</label>
                    <select 
                        value={`${params.width}x${params.height}`}
                        onChange={(e) => {
                            const [w, h] = e.target.value.split('x').map(Number);
                            setParams(p => ({ ...p, width: w, height: h }));
                        }}
                        className="w-full bg-dark-900 border border-slate-700 rounded p-2 text-xs text-slate-300 outline-none"
                    >
                        <option value="1024x1024">Square (1024x1024)</option>
                        <option value="896x1152">Portrait (896x1152)</option>
                        <option value="1152x896">Landscape (1152x896)</option>
                        <option value="1024x1536">Tall (1024x1536)</option>
                    </select>
                 </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!prompt || activeJob?.status === GenerationStatus.QUEUED || activeJob?.status === GenerationStatus.PROCESSING}
                className="w-full mt-6 bg-brand-600 hover:bg-brand-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-lg shadow-brand-900/40 transition-all flex items-center justify-center"
              >
                {activeJob && (activeJob.status === GenerationStatus.QUEUED || activeJob.status === GenerationStatus.PROCESSING) ? (
                    <>
                        <i className="fas fa-circle-notch animate-spin mr-2"></i> Generating...
                    </>
                ) : (
                    <>
                        <i className="fas fa-rocket mr-2"></i> Generate
                    </>
                )}
              </button>
            </div>

            {/* History Sidebar */}
            <div className="bg-dark-800 rounded-xl border border-slate-700 p-5 overflow-hidden">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Recent Generations</h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {history.length === 0 && <p className="text-xs text-slate-500 italic">No history yet.</p>}
                    {history.map(job => (
                        <div key={job.id} className="flex gap-3 p-2 rounded bg-dark-900 border border-slate-800 hover:border-brand-500/30 transition-colors cursor-pointer" onClick={() => setActiveJob(job)}>
                            <div className="w-12 h-12 bg-slate-800 rounded flex-shrink-0 overflow-hidden">
                                <img src={job.resultUrl || PLACEHOLDER_IMG} className="w-full h-full object-cover" alt="thumbnail" />
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs text-slate-300 truncate font-medium">{job.prompt}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{new Date(job.createdAt).toLocaleTimeString()}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Display */}
          <div className="lg:col-span-8">
            <div className="bg-dark-800 rounded-xl border border-slate-700 p-1 min-h-[600px] relative flex flex-col">
               
               {/* Main Canvas Area */}
               <div className="flex-1 bg-dark-900 rounded-lg m-1 relative overflow-hidden flex items-center justify-center group">
                  {!activeJob ? (
                      <div className="text-center text-slate-500">
                          <i className="fas fa-image text-6xl mb-4 opacity-20"></i>
                          <p>Ready to generate.</p>
                      </div>
                  ) : (
                      <>
                        {activeJob.status === GenerationStatus.COMPLETED && activeJob.resultUrl ? (
                            <img src={activeJob.resultUrl} className="max-w-full max-h-[700px] object-contain shadow-2xl" alt="Result" />
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-brand-400 font-mono text-sm animate-pulse">
                                    {activeJob.status === GenerationStatus.SUBMITTING && "Connecting to Horde..."}
                                    {activeJob.status === GenerationStatus.QUEUED && "Waiting in Queue..."}
                                    {activeJob.status === GenerationStatus.PROCESSING && "Processing on Worker GPU..."}
                                </p>
                            </div>
                        )}
                      </>
                  )}
               </div>

               {/* Active Job Meta */}
               {activeJob && (
                   <div className="p-4 border-t border-slate-700 bg-dark-800">
                       <div className="flex justify-between items-start">
                           <div>
                               <p className="text-sm text-slate-300 font-medium line-clamp-2">{activeJob.prompt}</p>
                               <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                   <span><i className="fas fa-layer-group mr-1"></i> {activeJob.model}</span>
                                   <span><i className="fas fa-ruler-combined mr-1"></i> {activeJob.params.width}x{activeJob.params.height}</span>
                                   <span><i className="fas fa-clock mr-1"></i> {activeJob.status}</span>
                               </div>
                           </div>
                           {activeJob.resultUrl && (
                               <a 
                                href={activeJob.resultUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                               >
                                   <i className="fas fa-download mr-1"></i> Download
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