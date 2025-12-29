
import React, { useState } from 'react';
import { DEFAULT_CONFIG, LevelConfig } from '../types';
import { generateLevelConfig } from '../services/geminiService';

interface Props {
  onConfigChange: (config: LevelConfig) => void;
}

export const GameConfigEditor: React.FC<Props> = ({ onConfigChange }) => {
  const [jsonStr, setJsonStr] = useState(JSON.stringify(DEFAULT_CONFIG, null, 2));
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApply = () => {
    try {
      const config = JSON.parse(jsonStr);
      onConfigChange(config);
      setError('');
    } catch (e) {
      setError('Invalid JSON');
    }
  };

  const handleGeminiGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    const newConfig = await generateLevelConfig(prompt);
    setJsonStr(JSON.stringify(newConfig, null, 2));
    onConfigChange(newConfig);
    setLoading(false);
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg shadow-lg text-slate-200 flex flex-col gap-4 h-full">
      <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
        Level Configuration
      </h2>
      
      {/* AI Section */}
      <div className="bg-slate-700/50 p-3 rounded-md border border-slate-600">
        <label className="text-xs font-semibold text-cyan-300 uppercase mb-2 block">
          AI Level Designer
        </label>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g. 'A hard level with Magic items 🌈 and lots of Ice 🧊'"
            className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
          />
          <button 
            onClick={handleGeminiGenerate}
            disabled={loading}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50 transition-all"
          >
            {loading ? 'Thinking...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* JSON Editor */}
      <div className="flex-1 flex flex-col">
        <label className="text-xs font-semibold text-slate-400 uppercase mb-2 block">JSON Config</label>
        <textarea
          value={jsonStr}
          onChange={(e) => setJsonStr(e.target.value)}
          className="flex-1 w-full bg-slate-900 font-mono text-xs p-3 rounded border border-slate-700 focus:outline-none focus:border-cyan-500 resize-none"
          spellCheck={false}
        />
        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>

      <button 
        onClick={handleApply}
        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 rounded font-bold transition-colors"
      >
        Apply Configuration
      </button>
    </div>
  );
};
