import React, { useEffect } from 'react';

const DatacenterAgent = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "https://elevenlabs.io/convai-widget/index.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="mt-6 flex justify-between items-center bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
        </span>
        <span className="font-mono text-xs text-blue-200 uppercase tracking-wider">[LIVE] INTERCEPTAR TELEMETRÍA DEL NODO</span>
      </div>
      <elevenlabs-convai agent-id="agent_3301kqa8h4nfecfajtqerkxf8e89"></elevenlabs-convai>
    </div>
  );
};

export default DatacenterAgent;
