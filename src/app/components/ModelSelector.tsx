"use client";

import { useState } from 'react';

const models = ['gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash-8b'];

interface ModelSelectorProps {
  videoUrl: string;
}

export default function ModelSelector({ videoUrl }: ModelSelectorProps) {
  const [model, setModel] = useState(models[0]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult('');

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, query, videoUrl }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze');
      }

      setResult(data.response || 'No response received');
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <select
        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white"
        value={model}
        onChange={(e) => setModel(e.target.value)}
      >
        {models.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>

      <textarea
        className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-zinc-500"
        placeholder="Enter your analysis prompt..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        rows={4}
      />

      <button 
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        onClick={handleSubmit}
        disabled={isLoading || !query.trim()}
      >
        {isLoading ? 'Analyzing...' : 'Analyze'}
      </button>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-white/[0.05] border border-white/[0.1] rounded-lg">
          <h3 className="text-lg font-medium text-zinc-300 mb-2">Analysis Result</h3>
          <div className="text-sm text-zinc-400 whitespace-pre-wrap">{result}</div>
        </div>
      )}
    </div>
  );
}
