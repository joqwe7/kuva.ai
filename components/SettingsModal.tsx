import React, { useState, useEffect } from 'react';
import { AppSettings, DEFAULT_HORDE_API_KEY } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [showHordeKey, setShowHordeKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
        setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-dark-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white"><i className="fas fa-cog mr-2 text-brand-500"></i>Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              AI Horde API Key
            </label>
            <div className="relative">
                <input
                type={showHordeKey ? "text" : "password"}
                value={localSettings.hordeApiKey}
                onChange={(e) => setLocalSettings(prev => ({ ...prev, hordeApiKey: e.target.value }))}
                className="w-full bg-dark-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                placeholder={DEFAULT_HORDE_API_KEY}
                />
                <button 
                    type="button"
                    onClick={() => setShowHordeKey(!showHordeKey)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                    <i className={`fas ${showHordeKey ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Use default for anonymous (low priority) or your own for higher priority.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
                onSave(localSettings);
                onClose();
            }}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors shadow-lg shadow-brand-900/50"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};