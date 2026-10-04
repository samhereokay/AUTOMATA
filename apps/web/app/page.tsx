"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [catalog, setCatalog] = useState([]);
  const [recommendedId, setRecommendedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/workflow-library/catalog.json')
      .then(res => res.json())
      .then(data => setCatalog(data))
      .catch(err => console.error("Error loading catalog:", err));
  }, []);

  const handleRoutePrompt = async () => {
    if (!prompt) return;
    setLoading(true);
    setError(null);
    setRecommendedId(null);

    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (!res.ok) {
        throw new Error("Router API returned " + res.status);
      }
      const data = await res.json();
      if (data.workflowId) {
        setRecommendedId(data.workflowId);
      } else {
        setError("Could not find a matching template. Browse the catalog below.");
      }
    } catch (e) {
      console.error(e);
      setError("AI Router is unavailable. Please browse the catalog manually.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'LOCAL READY': return 'bg-green-600 text-white';
      case 'ADAPTABLE': return 'bg-yellow-600 text-white';
      case 'EXTERNAL / CREDENTIAL REQUIRED': return 'bg-red-600 text-white';
      default: return 'bg-zinc-600 text-zinc-300';
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl w-full">
        <h1 className="text-5xl font-bold mb-2 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">AUTOMATA V1</h1>
        <p className="text-center text-zinc-400 mb-10">Intelligent n8n Workflow Library</p>
        
        {/* PROMPT ROUTER */}
        <div className="flex flex-col gap-4 border border-zinc-800 p-6 rounded-xl bg-zinc-900/50 mb-12 shadow-2xl">
          <p className="text-lg font-medium">What do you want to automate?</p>
          <div className="flex gap-2">
            <input 
              className="flex-1 p-4 bg-zinc-800 rounded-lg text-white border border-zinc-700 focus:outline-none focus:border-blue-500 transition-colors" 
              placeholder="e.g. Research today's cybersecurity news and send me a summary on Telegram..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRoutePrompt()}
            />
            <button 
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-lg transition-colors flex items-center justify-center min-w-[140px]"
              onClick={handleRoutePrompt}
              disabled={loading}
            >
              {loading ? 'Thinking...' : 'Automate'}
            </button>
          </div>
          {error && <p className="text-red-400 mt-2">{error}</p>}
        </div>

        {/* CATALOG GRID */}
        <h2 className="text-2xl font-bold mb-6">Workflow Library ({catalog.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {catalog.map(wf => (
            <Link href={`/workflow/${wf.id}`} key={wf.id} 
              className={`block border rounded-xl p-5 bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer flex flex-col h-full
                ${recommendedId === wf.id ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] ring-1 ring-blue-500' : 'border-zinc-800'}
              `}
            >
              <div className="mb-auto">
                {recommendedId === wf.id && (
                  <div className="text-xs font-bold text-blue-400 mb-2 tracking-wider">★ RECOMMENDED MATCH</div>
                )}
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-mono px-2 py-1 bg-zinc-800 rounded text-zinc-400 border border-zinc-700">ID: {wf.id}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{wf.category}</span>
                </div>
                <h3 className="text-lg font-bold mb-3 text-zinc-100 line-clamp-3 leading-snug">{wf.name}</h3>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap gap-2">
                <span className={`text-xs px-2 py-1 font-bold rounded-md ${getStatusBadge(wf.status)}`}>
                  {wf.status}
                </span>
                {wf.credentials && wf.credentials.length > 0 && (
                  <span className="text-xs px-2 py-1 font-medium rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 truncate max-w-full">
                    🔐 {wf.credentials.length} credentials
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
