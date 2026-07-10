import { useState, useEffect, useRef } from 'react';
import { Beaker, Activity, AlertCircle, CheckCircle2, ChevronRight, UploadCloud, FileText } from 'lucide-react';

// --- 3D Protein Viewer Component ---
// This safely injects 3Dmol.js and renders the protein based on the PDB ID or uploaded PDB file
const ProteinViewer = ({ pdbId, file }) => {
  const viewerRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    // Dynamically load the 3Dmol.js library from CDN
    const scriptId = '3dmol-script';
    let script = document.getElementById(scriptId);

    const initViewer = () => {
      if (!window.$3Dmol || !viewerRef.current) return;
      
      // Do not clear the viewer if there is no file and the PDB ID is not exactly 4 characters.
      // This prevents the "black screen" while the user is typing or if the input is incomplete.
      if (!file && (!pdbId || pdbId.length !== 4)) {
        return;
      }

      // Clear previous viewer if it exists
      viewerRef.current.innerHTML = '';
      
      const config = { backgroundColor: '#111827' }; // matches Tailwind gray-900
      const viewer = window.$3Dmol.createViewer(viewerRef.current, config);

      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (isCancelled || !event.target?.result) return;

          viewer.addModel(event.target.result, 'pdb');
          viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
          viewer.zoomTo();
          viewer.render();
        };
        reader.readAsText(file);
        return;
      }

      if (pdbId && pdbId.length === 4) {
        // Download directly from RCSB Protein Data Bank
        window.$3Dmol.download(`pdb:${pdbId.toLowerCase()}`, viewer, {}, () => {
          if (isCancelled) return;
          viewer.setStyle({}, { cartoon: { color: 'spectrum' } });
          viewer.zoomTo();
          viewer.render();
          viewer.zoom(1.2, 1000);
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://3Dmol.org/build/3Dmol-min.js';
      script.onload = initViewer;
      document.body.appendChild(script);
    } else {
      initViewer();
    }

    return () => {
      isCancelled = true;
      if (viewerRef.current) viewerRef.current.innerHTML = '';
    };
  }, [pdbId, file]);

  return (
    <div 
      ref={viewerRef} 
      className="w-full h-full relative"
      style={{ minHeight: '400px', minWidth: '300px' }}
    />
  );
};

// --- Main Dashboard Application ---
export default function App() {
  const [inputMode, setInputMode] = useState('id');
  const [pdbId, setPdbId] = useState('1AAR'); // Default example
  const [mutation, setMutation] = useState('A12G');
  const [file, setFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handlePredict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();

      if (inputMode === 'file') {
        if (!file) {
          throw new Error('Please upload a .pdb file before running the assay.');
        }

        formData.append('pdb_file', file);
      } else {
        const id = pdbId.trim();
        if (!id || id.length !== 4) {
          throw new Error('Please enter a valid 4-letter PDB ID before running the assay.');
        }

        formData.append('pdb_id', id.toUpperCase());
      }

      const mut = mutation.trim();
      if (!/^[a-zA-Z]\d+[a-zA-Z]$/.test(mut)) {
        throw new Error('Invalid mutation format. Please use Wildcard-Position-Mutant format (e.g., A12G).');
      }

      formData.append('mutation', mut);

      const response = await fetch('http://127.0.0.1:8000/api/predict-stability/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'The prediction gateway returned an error.');
      }

      if (data.success) {
        setResult(parseFloat(data.delta_delta_g));
      } else {
        const errorMsg = data.error 
          ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
          : 'The prediction service could not complete the assay.';
        setError(errorMsg);
      }
    } catch (err) {
      setError(typeof err.message === 'string' ? err.message : 'Failed to connect to the prediction gateway.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">BioGraph AI</h1>
            <p className="text-xs text-gray-500 font-medium">ESM-2 / 3D-GNN Stability Predictor</p>
          </div>
        </div>
        <div className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">
          Status: <span className="text-green-600 font-bold">API Online</span>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Controls and Results (4 columns wide) */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* Input Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Beaker className="w-5 h-5 mr-2 text-indigo-600" />
              Assay Configuration
            </h2>
            
            <form onSubmit={handlePredict} className="space-y-5">
              
              {/* Data Source Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Target Structure</label>
                <div className="flex bg-gray-100 p-1 rounded-lg mb-2">
                  <button 
                    type="button" 
                    onClick={() => setInputMode('id')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${inputMode === 'id' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    PDB ID
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setInputMode('file')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${inputMode === 'file' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    Upload File
                  </button>
                </div>
                {inputMode === 'id' ? (
                  <input 
                    type="text" 
                    value={pdbId}
                    onChange={(e) => setPdbId(e.target.value)}
                    placeholder="e.g., 1AAR"
                    maxLength={4}
                    className="w-full uppercase px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    required
                  />
                ) : (
                  <input 
                    type="file" 
                    accept=".pdb"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    required
                  />
                )}
              </div>

              {/* Mutation Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Point Mutation</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={mutation}
                    onChange={(e) => setMutation(e.target.value)}
                    placeholder="e.g., A12G"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    required
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-400 text-sm">Wild/Res/Mut</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-2.5 rounded-lg font-semibold text-white transition-all flex justify-center items-center ${
                  loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Running GNN Pipeline...
                  </>
                ) : (
                  <>
                    Calculate Stability <ChevronRight className="w-5 h-5 ml-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Panel */}
          {(result !== null || error) && (
            <div className={`rounded-xl border p-6 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 ${
              error ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200 shadow-lg'
            }`}>
              
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Prediction Results</h2>
              
              {error ? (
                <div className="flex items-start text-red-700">
                  <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{String(error)}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Predicted ΔΔG</p>
                      <div className="flex items-baseline">
                        <span className="text-4xl font-black text-gray-900">
                          {typeof result === 'number' && !isNaN(result) 
                            ? (result > 0 ? '+' : '') + result.toFixed(2) 
                            : 'Error'}
                        </span>
                        <span className="ml-1 text-sm text-gray-500">kcal/mol</span>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border flex items-start ${
                    result < 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}>
                    {result < 0 ? (
                      <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <div>
                      <p className="text-sm font-bold">
                        {typeof result === 'number' && !isNaN(result)
                          ? (result < 0 ? 'Stabilizing Mutation' : 'Destabilizing Mutation')
                          : 'Unknown Effect'}
                      </p>
                      <p className="text-xs mt-0.5 opacity-80">
                        {typeof result === 'number' && !isNaN(result)
                          ? (result < 0 
                              ? 'This mutation is predicted to improve structural stability.'
                              : 'This mutation likely disrupts folding or binding affinity.')
                          : 'The predicted effect could not be calculated.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: 3D Visualization (8 columns wide) */}
        <div className="lg:col-span-8 bg-gray-900 rounded-xl shadow-inner border border-gray-800 overflow-hidden relative flex flex-col">
          
          {/* Overlay Toolbar */}
          <div className="absolute top-4 left-4 z-10 bg-gray-800/80 backdrop-blur-sm border border-gray-700 p-2 rounded-lg flex items-center space-x-3 text-white">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium tracking-widest uppercase">
              {inputMode === 'file' ? (file ? file.name : 'Upload File') : pdbId}
            </span>
          </div>

          <div className="absolute bottom-4 right-4 z-10 text-xs font-mono text-gray-500">
            Powered by 3Dmol.js
          </div>

          {/* Empty/Invalid State Overlays */}
          {inputMode === 'id' && (!pdbId || pdbId.length !== 4) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 font-medium bg-gray-900/80 px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-700">
                Enter a 4-letter PDB ID to view structure
              </p>
            </div>
          )}
          
          {inputMode === 'file' && !file && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 font-medium bg-gray-900/80 px-4 py-2 rounded-lg backdrop-blur-sm border border-gray-700">
                Upload a .pdb file to view structure
              </p>
            </div>
          )}

          {/* 3D Canvas */}
          <div className="flex-1 w-full relative cursor-move">
            <ProteinViewer 
              pdbId={inputMode === 'id' ? pdbId : null} 
              file={inputMode === 'file' ? file : null} 
            />
          </div>
        </div>

      </main>
    </div>
  );
}
