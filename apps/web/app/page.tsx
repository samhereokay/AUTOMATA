"use client";

import { useState } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [plan, setPlan] = useState(null);

  const handleAutomate = async () => {
    try {
      const res = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      if (data.success) {
        setPlan(data.plan);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecute = async () => {
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, inputData: { prompt } })
      });
      const data = await res.json();
      if (data.success) {
        alert('Job Started! Job ID: ' + data.jobId);
        setPlan(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-zinc-100">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-center">AUTOMATA</h1>
        
        <div className="flex flex-col gap-4 border border-zinc-800 p-6 rounded-lg bg-zinc-900">
          <p className="text-lg">What do you want to automate?</p>
          <textarea 
            className="w-full h-32 p-4 bg-zinc-800 rounded-md text-white border border-zinc-700" 
            placeholder="Research AI cybersecurity and create a presentation..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleAutomate}
          >
            [ AUTOMATE ]
          </button>
        </div>

        {plan && (
          <div className="mt-8 border border-zinc-800 p-6 rounded-lg bg-zinc-900">
            <h2 className="text-2xl font-bold mb-4">Execution Plan</h2>
            <pre className="bg-zinc-800 p-4 rounded text-xs mb-4">
              {JSON.stringify(plan, null, 2)}
            </pre>
            <button 
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
              onClick={handleExecute}
            >
              [ EXECUTE PLAN ]
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
