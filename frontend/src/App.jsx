import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  UploadCloud, 
  Atom, 
  Dna, 
  RotateCw, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  Info,
  HelpCircle,
  FileCode
} from 'lucide-react';

// Sub-component for 3D Protein Viewer
function ProteinViewer({ pdbId, file }) {
  const viewerRef = useRef(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadingViewer, setLoadingViewer] = useState(false);
  const [viewerError, setViewerError] = useState(null);
  const viewerInstance = useRef(null);

  // Dynamically load 3Dmol.js
  useEffect(() => {
    if (window.$3Dmol) {
      setScriptLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://3Dmol.org/build/3Dmol-min.js";
    script.async = true;
    script.onload = () => {
      setScriptLoaded(true);
    };
    script.onerror = () => {
      setViewerError("Failed to load 3D protein viewer library (3Dmol.js).");
    };
    document.head.appendChild(script);
  }, []);

  // Update viewer when script loads, or file/pdbId changes
  useEffect(() => {
    if (!scriptLoaded || !viewerRef.current || !window.$3Dmol) return;

    // Reset error state
    setViewerError(null);

    // If neither is provided, clear viewer container and return
    if (!file && !pdbId) {
      viewerRef.current.innerHTML = "";
      viewerInstance.current = null;
      return;
    }

    setLoadingViewer(true);
    try {
      // Clear previous viewer instance and elements
      viewerRef.current.innerHTML = "";
      
      const viewer = window.$3Dmol.createViewer(viewerRef.current, {
        backgroundColor: '#090a10',
      });
      viewerInstance.current = viewer;

      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = e.target.result;
            viewer.addModel(data, "pdb");
            viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
            viewer.zoomTo();
            viewer.render();
            setLoadingViewer(false);
          } catch (err) {
            setViewerError("Failed to parse the uploaded PDB file in 3D viewer.");
            setLoadingViewer(false);
          }
        };
        reader.onerror = () => {
          setViewerError("Failed to read the PDB file.");
          setLoadingViewer(false);
        };
        reader.readAsText(file);
      } else if (pdbId && pdbId.length === 4) {
        const formattedId = pdbId.toUpperCase();
        window.$3Dmol.download(`pdb:${formattedId}`, viewer, {}, function() {
          try {
            viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
            viewer.zoomTo();
            viewer.render();
            setLoadingViewer(false);
          } catch (err) {
            setViewerError(`Failed to load PDB ID ${formattedId} in 3D viewer.`);
            setLoadingViewer(false);
          }
        }, function(err) {
          setViewerError(`Could not find structure for PDB ID ${formattedId}.`);
          setLoadingViewer(false);
        });
      } else {
        setLoadingViewer(false);
      }
    } catch (err) {
      setViewerError("An error occurred initializing the 3D viewer: " + err.message);
      setLoadingViewer(false);
    }

    return () => {
      // Clean up viewer on unmount/re-render
      if (viewerInstance.current) {
        try {
          viewerInstance.current.clear();
        } catch (e) {}
      }
    };
  }, [scriptLoaded, pdbId, file]);

  return (
    <div className="w-full h-full min-h-[500px] lg:min-h-[600px] rounded-2xl glass-panel relative flex flex-col overflow-hidden border border-white/5">
      {/* Header Bar */}
      <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <Atom className="w-5 h-5 text-biotech-accent animate-spin-slow" />
          <span className="font-semibold text-sm tracking-wider uppercase text-white/90">
            3D Molecular Viewport
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pdbId && (
            <span className="px-2 py-0.5 rounded bg-biotech-accent/10 border border-biotech-accent/20 text-xs font-mono text-biotech-accent uppercase">
              PDB: {pdbId}
            </span>
          )}
          {file && (
            <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-300 truncate max-w-[150px]">
              File: {file.name}
            </span>
          )}
          {!pdbId && !file && (
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-xs text-white/40">
              No Molecule Loaded
            </span>
          )}
        </div>
      </div>

      {/* Render Area */}
      <div className="flex-1 w-full h-full relative bg-[#070913]">
        {/* Loading Indicator */}
        {loadingViewer && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070913]/80 backdrop-blur-sm">
            <RotateCw className="w-8 h-8 text-biotech-accent animate-spin mb-2" />
            <span className="text-xs text-white/60 font-mono">Rendering structure...</span>
          </div>
        )}

        {/* Error Overlay */}
        {viewerError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#070913]/90 px-8 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <p className="text-sm font-semibold text-white/90 mb-1">Viewer Error</p>
            <p className="text-xs text-white/50 max-w-sm">{viewerError}</p>
          </div>
        )}

        {/* Viewport container */}
        <div ref={viewerRef} className="w-full h-full absolute inset-0 z-0" />

        {/* Instructions Overlay */}
        {(pdbId || file) && !loadingViewer && !viewerError && (
          <div className="absolute bottom-4 left-4 right-4 z-10 glass-panel border border-white/5 px-4 py-2 rounded-lg pointer-events-none flex items-center justify-between text-[10px] text-white/40 font-mono">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-biotech-accent" />
              <span>Left-Click + Drag: Rotate | Right-Click + Drag: Pan | Scroll: Zoom</span>
            </div>
            <div className="hidden sm:block">
              <span>Renderer: 3Dmol.js</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!pdbId && !file && !loadingViewer && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
              <Atom className="w-8 h-8 text-white/20" />
            </div>
            <p className="text-sm font-semibold text-white/70 mb-1">No Structure Selected</p>
            <p className="text-xs text-white/40 max-w-xs leading-relaxed">
              Upload a .pdb file or enter a valid PDB ID to visualize the 3D protein structure.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [inputMode, setInputMode] = useState('id'); // 'id' | 'file'
  const [pdbId, setPdbId] = useState('');
  const [file, setFile] = useState(null);
  const [mutation, setMutation] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Track the active parameters that are currently loaded in the 3D Viewer
  const [viewerPdbId, setViewerPdbId] = useState('');
  const [viewerFile, setViewerFile] = useState(null);

  // Synchronize 3D Viewer input on form field updates
  useEffect(() => {
    if (inputMode === 'id') {
      setViewerFile(null);
      if (pdbId.length === 4) {
        setViewerPdbId(pdbId.toUpperCase());
      } else {
        setViewerPdbId('');
      }
    } else {
      setViewerPdbId('');
      setViewerFile(file);
    }
  }, [inputMode, pdbId, file]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.pdb')) {
        setError("Invalid file format. Please upload a file with the '.pdb' extension.");
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.pdb')) {
        setError("Invalid file format. Please upload a file with the '.pdb' extension.");
        setFile(null);
        return;
      }
      setFile(droppedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    let fileToSend = file;

    // Phase 1: Obtain the PDB file from RCSB if user inputted PDB ID
    if (inputMode === 'id') {
      const cleanPdbId = pdbId.trim().toUpperCase();
      if (!cleanPdbId || cleanPdbId.length !== 4) {
        setError("Please enter a valid 4-character Protein Data Bank (PDB) ID.");
        setLoading(false);
        return;
      }
      
      try {
        const response = await fetch(`https://files.rcsb.org/download/${cleanPdbId}.pdb`);
        if (!response.ok) {
          throw new Error(`Failed to retrieve PDB file for "${cleanPdbId}" from RCSB server.`);
        }
        const text = await response.text();
        // Create file object for sending
        fileToSend = new File([text], `${cleanPdbId}.pdb`, { type: "text/plain" });
      } catch (err) {
        setError(`PDB Download Error: ${err.message}`);
        setLoading(false);
        return;
      }
    }

    if (!fileToSend) {
      setError("Please select a PDB file to assay.");
      setLoading(false);
      return;
    }

    const cleanMutation = mutation.trim();
    if (!cleanMutation) {
      setError("Please specify a point mutation (e.g. 'A12G').");
      setLoading(false);
      return;
    }

    // Phase 2: Post to Django Rest API Gateway
    const formData = new FormData();
    formData.append('pdb_file', fileToSend);
    formData.append('mutation', cleanMutation);

    const apiBaseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

    try {
      const res = await fetch(`${apiBaseUrl}/api/predict-stability/`, {
        method: "POST",
        body: formData,
      });

      const responseData = await res.json();
      if (res.ok && responseData.success) {
        setResult(responseData.delta_delta_g);
      } else {
        setError(responseData.error || "The pre-synthesis prediction failed.");
      }
    } catch (err) {
      setError(`API Communication Failure: ${err.message}. Verify that the Django backend is running at ${apiBaseUrl}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col justify-between overflow-x-hidden">
      {/* Decorative Glow Backgrounds */}
      <div className="glow-bg-cyan top-[10%] -left-[10%]"></div>
      <div className="glow-bg-violet bottom-[15%] -right-[10%]"></div>

      {/* Navigation Header */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between border-b border-white/5 relative z-10 bg-biotech-dark/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-biotech-accent to-biotech-glow flex items-center justify-center shadow-glow-accent">
            <Dna className="w-5 h-5 text-biotech-dark" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white m-0 leading-none">
              BioGraph AI
            </h1>
            <span className="text-[10px] text-biotech-accent tracking-widest uppercase font-semibold font-mono block mt-1">
              Computational Bio-Assay
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-mono text-white/50">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Gateway API: Online</span>
          </div>
          <span className="text-white/10">|</span>
          <span className="text-white/40">Model: Siamese ESM-2 GNN</span>
        </div>
      </header>

      {/* Main Panel */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - Controls & Predictions (4/12 wide) */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-biotech-accent" />
              Pre-Synthesis Assay
            </h2>
            <p className="text-xs text-white/40 leading-relaxed mb-6">
              Estimate thermodynamic stability changes (ΔΔG) due to single-point mutations using a Siamese 1D ESM-2 + 3D GNN model.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Input Mode Selector Toggle */}
              <div>
                <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block mb-2">
                  PDB Input Mode
                </label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.03] border border-white/5 rounded-lg">
                  <button
                    id="input-mode-pdb-id"
                    type="button"
                    onClick={() => setInputMode('id')}
                    className={`py-2 text-xs font-medium rounded-md transition-all ${
                      inputMode === 'id' 
                        ? 'bg-biotech-accent/15 text-biotech-accent border border-biotech-accent/20' 
                        : 'text-white/40 hover:text-white/60 border border-transparent'
                    }`}
                  >
                    PDB ID
                  </button>
                  <button
                    id="input-mode-file-upload"
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`py-2 text-xs font-medium rounded-md transition-all ${
                      inputMode === 'file' 
                        ? 'bg-biotech-accent/15 text-biotech-accent border border-biotech-accent/20' 
                        : 'text-white/40 hover:text-white/60 border border-transparent'
                    }`}
                  >
                    Upload PDB File
                  </button>
                </div>
              </div>

              {/* Mode-Specific Inputs */}
              {inputMode === 'id' ? (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pdbId" className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                    4-Letter PDB Identifier
                  </label>
                  <div className="relative">
                    <input
                      id="pdbId"
                      type="text"
                      maxLength={4}
                      value={pdbId}
                      onChange={(e) => setPdbId(e.target.value.toUpperCase())}
                      placeholder="e.g. 1A2B"
                      className="w-full bg-white/[0.02] border border-white/5 focus:border-biotech-accent/40 focus:ring-1 focus:ring-biotech-accent/20 text-white rounded-lg px-3.5 py-2.5 text-sm font-mono tracking-widest placeholder:text-white/20 transition-all outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-white/30 leading-snug">
                    Loads protein layout directly from RCSB server dynamically.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                    Upload Structure
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`border border-dashed rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      file 
                        ? 'border-biotech-accent/40 bg-biotech-accent/[0.02]' 
                        : 'border-white/10 hover:border-white/20 bg-white/[0.01]'
                    }`}
                  >
                    <input
                      type="file"
                      id="pdb-file-upload"
                      accept=".pdb"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="pdb-file-upload" className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                      <UploadCloud className={`w-8 h-8 mb-2 ${file ? 'text-biotech-accent' : 'text-white/30'}`} />
                      {file ? (
                        <div className="text-center w-full">
                          <p className="text-xs text-white font-medium truncate max-w-[200px] mx-auto">
                            {file.name}
                          </p>
                          <p className="text-[10px] text-white/40 mt-1 font-mono">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-xs text-white/70 font-medium">Click or drag PDB file here</p>
                          <p className="text-[10px] text-white/30 mt-1">Accepts only .pdb files</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Point Mutation String */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="mutation" className="text-[11px] font-bold text-white/50 uppercase tracking-wider block">
                    Point Mutation String
                  </label>
                  <span className="text-[10px] text-biotech-accent/60 font-mono">Format: A12G</span>
                </div>
                <input
                  id="mutation"
                  type="text"
                  value={mutation}
                  onChange={(e) => setMutation(e.target.value)}
                  placeholder="e.g. A12G"
                  className="w-full bg-white/[0.02] border border-white/5 focus:border-biotech-accent/40 focus:ring-1 focus:ring-biotech-accent/20 text-white rounded-lg px-3.5 py-2.5 text-sm font-mono tracking-wider placeholder:text-white/20 transition-all outline-none"
                />
                <span className="text-[10px] text-white/30 leading-snug">
                  Provide mutation where first letter represents original residue, number represents position, and last letter represents variant.
                </span>
              </div>

              {/* Submit Assay Button */}
              <button
                id="submit-assay-btn"
                type="submit"
                disabled={loading}
                className="w-full mt-2 relative py-3 px-4 rounded-lg bg-gradient-to-r from-biotech-accent to-biotech-glow hover:opacity-95 text-biotech-dark font-bold text-sm shadow-glow-accent transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-biotech-dark" />
                    <span>Processing Assay...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4 text-biotech-dark" />
                    <span>Run Mutation Assay</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Card */}
          {result !== null && (() => {
            const parseResult = (res) => {
              if (res === null || res === undefined) return null;
              
              // If it's already an object
              if (typeof res === 'object') {
                return res;
              }
              
              // If it's a JSON string
              try {
                const parsed = JSON.parse(res);
                if (parsed && typeof parsed === 'object') {
                  return parsed;
                }
              } catch (e) {}
              
              // If it's a plain string, parse it using regex
              const str = String(res).trim();
              const directFloat = parseFloat(str);
              if (!isNaN(directFloat) && /^[-+]?\d+(\.\d+)?$/.test(str)) {
                return { delta_delta_g: directFloat, success: true };
              }
              
              const match = str.match(/Predicted\s*(?:ΔΔG|ΔΔg|DDG):\s*(-?\d+(?:\.\d+)?)/i);
              const stabilityMatch = str.match(/Structural\s*Impact:\s*([^\n]+)/i);
              const nodesMatch = str.match(/Graph\s*Nodes\s*Analyzed:\s*(\d+)/i);
              const residueMatch = str.match(/Validated\s*([^\n]+)\s*at\s*Position\s*(\d+)/i);
              
              return {
                success: true,
                delta_delta_g: match ? parseFloat(match[1]) : 0,
                stability: stabilityMatch ? stabilityMatch[1].trim() : null,
                nodes_analyzed: nodesMatch ? parseInt(nodesMatch[1]) : null,
                validated_residue: residueMatch ? residueMatch[1].trim() : null,
                position: residueMatch ? parseInt(residueMatch[2]) : null,
                raw_text: str
              };
            };

            const parsedData = parseResult(result);
            if (!parsedData) return null;

            const numericResult = parsedData.delta_delta_g;
            const isStabilizing = numericResult !== null && numericResult < 0;
            const stabilityText = parsedData.stability || (isStabilizing ? "Stabilizing" : "Destabilizing (Clash/Misfold)");

            return (
              <div id="assay-result-card" className={`glass-panel p-6 rounded-2xl border transition-all duration-500 animate-float ${
                isStabilizing 
                  ? 'border-emerald-500/20 bg-emerald-500/[0.02] shadow-glow-green' 
                  : 'border-red-500/20 bg-red-500/[0.02] shadow-glow-red'
              }`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-white/50 tracking-wider uppercase">
                      Assay Thermodynamic Result
                    </h3>
                    <p className="text-[10px] font-mono text-white/30 mt-0.5">
                      ESM-2 / GNN Mutation Profiler
                    </p>
                  </div>
                  {isStabilizing ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wide">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Stabilizing
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-wide">
                      <AlertCircle className="w-3 h-3 text-red-400" />
                      Destabilizing
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className={`text-4xl font-extrabold tracking-tight ${
                    isStabilizing ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {numericResult !== null 
                      ? (numericResult > 0 ? `+${numericResult.toFixed(4)}` : numericResult.toFixed(4)) 
                      : '0.0000'}
                  </span>
                  <span className="text-sm font-semibold text-white/50 font-mono">
                    kcal/mol
                  </span>
                </div>

                {/* Metadata Grid */}
                <div className="border-t border-white/5 pt-4 flex flex-col gap-2.5 text-xs">
                  {parsedData.validated_residue && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/40">Validated Residue</span>
                      <span className="font-mono text-white/80 font-medium">{parsedData.validated_residue}</span>
                    </div>
                  )}
                  {parsedData.position && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/40">Sequence Position</span>
                      <span className="font-mono text-white/80 font-medium">Residue #{parsedData.position}</span>
                    </div>
                  )}
                  {parsedData.nodes_analyzed && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/40">Graph Nodes Analyzed</span>
                      <span className="font-mono text-white/80 font-medium">{parsedData.nodes_analyzed} residues</span>
                    </div>
                  )}
                  {stabilityText && (
                    <div className="flex justify-between items-center">
                      <span className="text-white/40">Structural Impact</span>
                      <span className={`font-mono font-medium ${isStabilizing ? 'text-emerald-400' : 'text-red-400'}`}>
                        {stabilityText}
                      </span>
                    </div>
                  )}
                </div>

                {/* Raw log option */}
                {parsedData.raw_text && (
                  <div className="border-t border-white/5 pt-3.5 mt-3.5">
                    <span className="text-[10px] text-white/30 uppercase font-bold tracking-wider block mb-1.5">Raw Inference Log</span>
                    <pre className="text-[10px] font-mono text-white/50 whitespace-pre-wrap text-left bg-black/30 p-2.5 rounded border border-white/5 max-h-[120px] overflow-y-auto custom-scrollbar">
                      {parsedData.raw_text}
                    </pre>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Error Message Card */}
          {error && (
            <div id="assay-error-card" className="glass-panel p-5 rounded-2xl border border-red-500/20 bg-red-500/[0.02] flex gap-3.5 items-start">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">
                  Assay Error
                </h4>
                <p className="text-xs text-white/60 leading-relaxed font-mono break-words">
                  {error}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Right Column - 3D Protein Viewport (8/12 wide) */}
        <section className="lg:col-span-8">
          <ProteinViewer pdbId={viewerPdbId} file={viewerFile} />
        </section>
      </main>

      {/* Footer bar */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/5 relative z-10 bg-biotech-dark/40 backdrop-blur-md flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/30 font-mono">
        <div>
          <span>© 2026 BioGraph AI Technologies Inc. All rights reserved.</span>
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-biotech-accent transition-colors flex items-center gap-1">
            <FileCode className="w-3.5 h-3.5" />
            <span>Developer Docs</span>
          </a>
          <span>•</span>
          <a href="https://huggingface.co/spaces/estside/3D-GNN-Stability-Predictor" target="_blank" rel="noopener noreferrer" className="hover:text-biotech-accent transition-colors">
            <span>HF Space</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
