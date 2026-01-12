import React from 'react';

export const ArchitectureInfo: React.FC = () => {
  return (
    <div className="mt-12 p-6 bg-dark-900 border border-slate-800 rounded-xl">
        <h3 className="text-lg font-bold text-white mb-4">
            <i className="fas fa-server mr-2 text-brand-500"></i>
            Production Architecture Plan (Rollout)
        </h3>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-slate-400">
            <div>
                <h4 className="text-slate-200 font-semibold mb-2">Backend (FastAPI)</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Endpoints: <code>/api/v1/generate</code> (Proxy to Horde)</li>
                    <li>Worker Auth: <code>/api/v1/nodes/register</code></li>
                    <li>Queue: Redis + Celery/RQ</li>
                    <li>DB: PostgreSQL (User Accounts, Credits)</li>
                    <li>Monitoring: Prometheus + Grafana</li>
                </ul>
            </div>
            <div>
                <h4 className="text-slate-200 font-semibold mb-2">Workers (Docker/NVIDIA)</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Runtime: <code>nvidia-container-toolkit</code></li>
                    <li>Protocol: Poll <code>/v2/generate/pop</code></li>
                    <li>Security: Short-lived tokens, non-root user</li>
                    <li>Auto-scale: Systemd service + Provisioning scripts</li>
                </ul>
            </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-800">
            <h4 className="text-slate-200 font-semibold mb-2">30/60/90 Day Rollout</h4>
            <div className="flex space-x-4 overflow-x-auto pb-2">
                <div className="min-w-[200px] p-3 bg-dark-800 rounded border border-slate-700">
                    <div className="text-brand-500 font-bold">Day 30</div>
                    <div className="text-xs mt-1">Core Platform, Stripe Integration, 5 Rented GPUs</div>
                </div>
                <div className="min-w-[200px] p-3 bg-dark-800 rounded border border-slate-700">
                    <div className="text-brand-500 font-bold">Day 60</div>
                    <div className="text-xs mt-1">User Accounts, Private Models, 20 Rented GPUs</div>
                </div>
                <div className="min-w-[200px] p-3 bg-dark-800 rounded border border-slate-700">
                    <div className="text-brand-500 font-bold">Day 90</div>
                    <div className="text-xs mt-1">Video Gen, Mobile App, 50+ GPU Cluster</div>
                </div>
            </div>
        </div>
    </div>
  );
}