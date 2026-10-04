"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function WorkflowDetail() {
  const params = useParams();
  const { id } = params;
  const [workflow, setWorkflow] = useState(null);

  useEffect(() => {
    fetch('/workflow-library/catalog.json')
      .then(res => res.json())
      .then(data => {
        const wf = data.find(w => w.id === id);
        if (wf) setWorkflow(wf);
      });
  }, [id]);

  if (!workflow) {
    return <div className="p-8 text-white">Loading...</div>;
  }

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
      <div className="max-w-4xl w-full">
        <Link href="/" className="text-blue-400 hover:underline mb-8 inline-block">&larr; Back to Library</Link>
        
        <div className="border border-zinc-800 p-8 rounded-xl bg-zinc-900 shadow-2xl">
          <div className="flex justify-between items-start mb-6 border-b border-zinc-800 pb-6">
            <div>
              <span className="text-xs font-mono px-2 py-1 bg-zinc-800 rounded text-zinc-400 border border-zinc-700 mb-4 inline-block mr-2">ID: {workflow.id}</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{workflow.category}</span>
              <h1 className="text-3xl font-bold mt-2">{workflow.name}</h1>
            </div>
            <span className={`text-sm px-3 py-1 font-bold rounded-md whitespace-nowrap ${getStatusBadge(workflow.status)}`}>
              {workflow.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold mb-3 text-zinc-400 border-b border-zinc-800 pb-2">Requirements</h3>
              {workflow.requirements && workflow.requirements.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {workflow.requirements.map(req => <li key={req} className="text-sm">{req}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">None</p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold mb-3 text-zinc-400 border-b border-zinc-800 pb-2">Credentials Needed</h3>
              {workflow.credentials && workflow.credentials.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {workflow.credentials.map(cred => <li key={cred} className="text-sm font-mono text-yellow-400">{cred}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-green-500">None</p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-12 pt-8 border-t border-zinc-800">
            <a 
              href={workflow.source_url} 
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 px-6 rounded-lg text-center border border-zinc-700 transition-colors"
            >
              🌐 OPEN ORIGINAL n8n TEMPLATE
            </a>
            <a 
              href={workflow.workflow_json}
              download={`workflow_${workflow.id}.json`}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-lg text-center transition-colors"
            >
              ⬇️ DOWNLOAD JSON
            </a>
          </div>
        </div>

        <div className="mt-8 border border-zinc-800 p-6 rounded-xl bg-zinc-900/50">
          <h3 className="text-lg font-bold mb-2">How to use</h3>
          <ol className="list-decimal list-inside space-y-2 text-zinc-300 text-sm">
            <li>Download the workflow JSON file above.</li>
            <li>Open your self-hosted n8n instance.</li>
            <li>Click "Add Workflow" or open an existing one.</li>
            <li>Use the top-right menu to select "Import from File" and upload the JSON.</li>
            <li>Configure any required credentials highlighted above.</li>
            <li>Activate the workflow!</li>
          </ol>
        </div>
      </div>
    </main>
  );
}
