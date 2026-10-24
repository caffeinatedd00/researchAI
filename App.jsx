import React, { useState, useRef, useEffect } from 'react';
import { 
  PanelLeft, 
  PanelRight, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered, 
  Plus, 
  FileText,
  BookOpen,
  ArrowLeft,
  Library,
  Sparkles,
  X,
  ChevronDown,
  Download,
  Upload,
  BarChart2
} from 'lucide-react';

export default function App() {
  // App navigation state
  const [currentView, setCurrentView] = useState('library'); // 'library', 'new-project', 'document'
  const [projectTitle, setProjectTitle] = useState('');
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  
  // Sidebar toggles for the document view
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isAnalyzeOpen, setIsAnalyzeOpen] = useState(false);
  const [isFetchingSources, setIsFetchingSources] = useState(false);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  
  // Data states
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [sources, setSources] = useState([]);
  const [documentContent, setDocumentContent] = useState('');
  const [citationStyle, setCitationStyle] = useState('Harvard');
  
  // Analysis data states
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisFileName, setAnalysisFileName] = useState('');
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const excelInputRef = useRef(null);

  // Sync current project data when it changes
  useEffect(() => {
    if (!currentProjectId) return;
    
    const currentProject = projects.find(p => p.id === currentProjectId);
    if (currentProject) {
      setProjectTitle(currentProject.title);
      setDocumentContent(currentProject.content || '');
      setSources(currentProject.sources || []);
      setNotes(currentProject.notes || []);
      setAnalysisData(currentProject.analysisData || null);
      setAnalysisFileName(currentProject.analysisFileName || '');
      if (editorRef.current && currentProject.content !== editorRef.current.innerHTML) {
         editorRef.current.innerHTML = currentProject.content;
      }
    }
  }, [currentProjectId, projects]);

  // Render chart whenever analysisData changes
  useEffect(() => {
    if (!isAnalyzeOpen || !analysisData || !chartRef.current) return;

    // Load Chart.js dynamically if not present
    const renderChart = async () => {
      if (!window.Chart) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      chartInstanceRef.current = new window.Chart(ctx, {
        type: 'bar',
        data: {
          labels: analysisData.labels,
          datasets: [{
            label: analysisData.datasetLabel || 'Value',
            data: analysisData.values,
            backgroundColor: 'rgba(99, 102, 241, 0.5)',
            borderColor: 'rgb(99, 102, 241)',
            borderWidth: 1,
            borderRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: true }
          }
        }
      });
    };

    renderChart();

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [isAnalyzeOpen, analysisData]);

  // Local state sync helper
  const updateCurrentProject = (updates) => {
    if (!currentProjectId) return;
    setProjects(prevProjects => prevProjects.map(p => 
      p.id === currentProjectId ? { ...p, ...updates, lastEdited: Date.now() } : p
    ));
  };

  // --- Handlers ---
  const handleDocumentBlur = () => {
    if (editorRef.current) {
      updateCurrentProject({ content: editorRef.current.innerHTML });
    }
  };

  const handleSaveSource = (id) => {
    const newSources = sources.map(s => s.id === id ? { ...s, status: 'saved' } : s);
    setSources(newSources);
    updateCurrentProject({ sources: newSources });
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAnalysisFileName(file.name);

    try {
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const data = await file.arrayBuffer();
      const workbook = window.XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (json.length > 1) {
        const headers = json[0];
        const row1 = json[1];
        
        // Find first text/string column for labels and first numeric column for values
        let labelColIdx = 0;
        let valueColIdx = 1;

        for (let i = 0; i < headers.length; i++) {
          if (typeof row1[i] === 'number') {
            valueColIdx = i;
            break;
          }
        }
        if (valueColIdx === labelColIdx) valueColIdx = labelColIdx + 1;

        const labels = [];
        const values = [];

        for (let i = 1; i < Math.min(json.length, 15); i++) {
          if (json[i][labelColIdx] !== undefined && json[i][valueColIdx] !== undefined) {
            labels.push(String(json[i][labelColIdx]));
            values.push(Number(json[i][valueColIdx]) || 0);
          }
        }

        const parsedAnalysis = {
          labels,
          values,
          datasetLabel: headers[valueColIdx] || 'Metric'
        };

        setAnalysisData(parsedAnalysis);
        updateCurrentProject({ analysisData: parsedAnalysis, analysisFileName: file.name });
      }
    } catch (err) {
      console.error("Error reading spreadsheet:", err);
    }

    e.target.value = null;
  };

  const handleCreateProject = async () => {
    if (!projectTitle.trim()) return;
    
    const initialContent = `<h1>${projectTitle}</h1><h2>Abstract</h2><p>Enter your abstract here. Summarize the key points of your research...</p><h2>Introduction</h2><p>Begin your introduction here. Provide context and state the research problem...</p><h2>Methods</h2><p>Describe the methodology and procedures used in this study...</p><h2>Results</h2><p>Detail the findings of your research...</p><h2>Conclusion</h2><p>Summarize the conclusions and potential future work...</p><h2>Sources</h2><div id="document-sources"></div>`;
    const newProjectId = Date.now().toString();

    const newProject = {
      id: newProjectId,
      title: projectTitle,
      lastEdited: Date.now(),
      content: initialContent,
      sources: [],
      notes: [],
      analysisData: null,
      analysisFileName: ''
    };
    
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProjectId);
    setCurrentView('document');
    
    fetchAISources(projectTitle, newProjectId);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const title = file.name.replace(/\.[^/.]+$/, "");
    let formattedContent = "";

    try {
      if (file.name.toLowerCase().endsWith('.docx')) {
        if (!window.mammoth) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.convertToHtml({ arrayBuffer });
        formattedContent = result.value;
      } else {
        const textContent = await file.text();
        formattedContent = textContent.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('');
      }
    } catch (error) {
      console.error("Error reading file:", error);
      formattedContent = "<p><em>Error reading file content.</em></p>";
    }
    
    const initialContent = `<h1>${title}</h1><h2>Imported Document</h2>${formattedContent}<h2>Abstract</h2><p>Enter your abstract here. Summarize the key points of your research...</p><h2>Introduction</h2><p>Begin your introduction here. Provide context and state the research problem...</p><h2>Methods</h2><p>Describe the methodology and procedures used in this study...</p><h2>Results</h2><p>Detail the findings of your research...</p><h2>Conclusion</h2><p>Summarize the conclusions and potential future work...</p><h2>Sources</h2><div id="document-sources"></div>`;
    
    const newProjectId = Date.now().toString();
    const newProject = {
      id: newProjectId,
      title: title,
      lastEdited: Date.now(),
      content: initialContent,
      sources: [],
      notes: [],
      analysisData: null,
      analysisFileName: ''
    };
    
    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProjectId);
    setCurrentView('document');
    
    fetchAISources(title, newProjectId);
    e.target.value = null;
  };

  const openProject = (id) => {
    setCurrentProjectId(id);
    setCurrentView('document');
  };

  const fetchAISources = async (title, projectId) => {
    setIsFetchingSources(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        console.error("Missing VITE_GEMINI_API_KEY. Create a .env file (see SETUP.md) and restart the dev server.");
        return;
      }
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
      
      const payload = {
          contents: [{ parts: [{ text: `Suggest 3-4 academic sources (papers, books) related to the research topic: "${title}". Provide realistic URLs (even if hypothetical) and brief abstracts.` }] }],
          generationConfig: {
              responseMimeType: "application/json",
              responseSchema: {
                  type: "ARRAY",
                  items: {
                      type: "OBJECT",
                      properties: {
                          "id": { "type": "INTEGER" },
                          "title": { "type": "STRING" },
                          "authors": { "type": "STRING" },
                          "year": { "type": "INTEGER" },
                          "abstract": { "type": "STRING" },
                          "url": { "type": "STRING" }
                      },
                      "required": ["id", "title", "authors", "year", "abstract", "url"]
                  }
              }
          }
      };

      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      if (!response.ok) {
        console.error("Gemini API error:", response.status, result?.error?.message || result);
      }
      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content) {
        const jsonText = result.candidates[0].content.parts[0].text;
        const parsedSources = JSON.parse(jsonText);
        const newSources = parsedSources.map((s, index) => ({
          ...s, id: Date.now() + index, status: 'suggested'
        }));
        
        setSources(newSources);
        
        setProjects(prevProjects => prevProjects.map(p => 
          p.id === projectId ? { ...p, sources: newSources } : p
        ));
      }
    } catch (error) {
      console.error("Error fetching sources:", error);
    } finally {
      setIsFetchingSources(false);
    }
  };

  // Notes handlers
  const handleAddNote = () => {
    const newNote = { id: Date.now(), title: 'New Note', content: '' };
    const newNotes = [...notes, newNote];
    setNotes(newNotes);
    setActiveNoteId(newNote.id);
    updateCurrentProject({ notes: newNotes });
  };

  const handleUpdateNote = (id, field, value) => {
    const newNotes = notes.map(note => note.id === id ? { ...note, [field]: value } : note);
    setNotes(newNotes);
    updateCurrentProject({ notes: newNotes });
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  // Document formatting function
  const formatText = (command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
        updateCurrentProject({ content: editorRef.current.innerHTML });
    }
  };

  const formatDate = (ms) => {
    if (!ms) return 'Unknown';
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const exportAsDoc = () => {
    if (!editorRef.current) return;
    
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
    const footer = "</body></html>";
    const html = header + editorRef.current.innerHTML + footer;
    
    const url = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(html);
    const filename = (projectTitle || 'Untitled_Document').replace(/\s+/g, '_') + '.doc';
    
    const downloadLink = document.createElement("a");
    document.body.appendChild(downloadLink);
    downloadLink.href = url;
    downloadLink.download = filename;
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    setIsFileMenuOpen(false);
  };

  const generateCitation = (source, style) => {
    const { authors, year, title, url } = source;
    switch (style) {
      case 'APA':
        return `${authors} (${year}). <i>${title}</i>. Retrieved from ${url}`;
      case 'MLA':
        return `${authors}. "${title}." ${year}. ${url}`;
      case 'Chicago':
        return `${authors}. "${title}." ${year}. ${url}.`;
      case 'Harvard':
      default:
        return `${authors}, ${year}. <i>${title}</i>. [online] Available at: ${url}`;
    }
  };

  const handleCite = (e, source) => {
    e.preventDefault();
    if (!editorRef.current) return;
    
    const sourcesContainer = editorRef.current.querySelector('#document-sources');
    const count = sourcesContainer ? sourcesContainer.querySelectorAll('.citation').length + 1 : 1;
    
    const citationHTML = `<p class="citation" style="margin-bottom: 0.5rem; padding-left: 2.5rem; text-indent: -1.5rem;">${count}. ${generateCitation(source, citationStyle)}</p>`;
    
    if (sourcesContainer) {
      sourcesContainer.innerHTML += citationHTML;
    } else {
      editorRef.current.innerHTML += `<h2>Sources</h2><div id="document-sources">${citationHTML}</div>`;
    }
    
    updateCurrentProject({ content: editorRef.current.innerHTML });
  };

  // --- LIBRARY VIEW ---
  if (currentView === 'library') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 text-white p-2 rounded-lg">
              <Sparkles size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">ResearchAI</h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-600 font-bold">
                U
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Library size={28} className="text-slate-400" />
          <h2 className="text-3xl font-light text-slate-700">Library</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button 
            onClick={() => {
              setProjectTitle('');
              setCurrentView('new-project');
            }}
            className="group h-64 bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <span className="font-semibold text-slate-700 group-hover:text-blue-700">New Project</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="group h-64 bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer shadow-sm"
          >
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload size={32} />
            </div>
            <span className="font-semibold text-slate-700 group-hover:text-indigo-700">Import File</span>
            <span className="text-xs text-slate-400 mt-2">.txt or .docx files</span>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".txt,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
            className="hidden" 
          />

          {projects.map(project => (
            <div 
                key={project.id}
                onClick={() => openProject(project.id)}
                className="group h-64 bg-white border border-slate-200 rounded-xl p-5 flex flex-col hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex-shrink-0"
              >
                <div className="w-10 h-10 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-lg mb-2 text-slate-800 line-clamp-2">{project.title}</h3>
                <div className="mt-auto pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                  Last edited {formatDate(project.lastEdited)}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // --- NEW PROJECT VIEW ---
  if (currentView === 'new-project') {
    return (
      <div className="h-screen w-full bg-white flex flex-col items-center justify-center relative">
        <button 
          onClick={() => setCurrentView('library')}
          className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft size={20} /> Back to Library
        </button>
        <div className="w-full max-w-3xl px-8 flex flex-col items-center gap-6">
          <span className="text-sm font-semibold tracking-widest text-slate-400 uppercase">New Research Project</span>
          <input
            type="text"
            autoFocus
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && projectTitle.trim()) handleCreateProject();
            }}
            placeholder="Enter Project Title..."
            className="w-full text-center text-4xl md:text-5xl font-light text-slate-800 outline-none placeholder-slate-200 border-b-2 border-transparent focus:border-blue-100 pb-4 transition-all"
          />
          <button
            onClick={handleCreateProject}
            disabled={!projectTitle.trim()}
            className="mt-8 px-8 py-3 bg-blue-600 text-white rounded-full font-medium shadow-md hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center gap-2"
          >
            Create Project
          </button>
        </div>
      </div>
    );
  }

  // --- DOCUMENT VIEW ---
  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans overflow-hidden relative">
      <style>{`
        .document-editor h1 { font-size: 2.25rem; font-weight: bold; margin-top: 1.5rem; margin-bottom: 1rem; color: #1e293b; }
        .document-editor h2 { font-size: 1.5rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.75rem; color: #334155; }
        .document-editor p { margin-bottom: 1rem; line-height: 1.7; color: #334155; }
        .document-editor ul { list-style-type: disc; padding-left: 2rem; margin-bottom: 1rem; color: #334155; }
        .document-editor ol { list-style-type: decimal; padding-left: 2rem; margin-bottom: 1rem; color: #334155; }
        .document-editor li { margin-bottom: 0.35rem; }
        .document-editor b, .document-editor strong { font-weight: 700; color: #0f172a; }
        .document-editor i, .document-editor em { font-style: italic; }
        .document-editor u { text-decoration: underline; text-underline-offset: 4px; }
        .document-editor strike { text-decoration: line-through; }
      `}</style>

      {/* Top Navbar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              handleDocumentBlur();
              setCurrentView('library');
            }}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors text-sm font-medium border border-transparent hover:border-slate-200"
          >
            <ArrowLeft size={16} /> Library
          </button>
          
          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <div className="flex items-center gap-2 ml-2">
            <span 
              className="font-semibold text-slate-800 text-lg outline-none px-2 py-1 rounded hover:bg-slate-100" 
              contentEditable 
              suppressContentEditableWarning
              onBlur={(e) => {
                const newTitle = e.target.textContent;
                setProjectTitle(newTitle);
                updateCurrentProject({ title: newTitle });
              }}
            >
              {projectTitle || 'Untitled Document'}
            </span>
          </div>
        </div>
      </header>

      {/* Formatting Toolbar */}
      <div className="h-12 bg-white border-b border-slate-200 flex items-center px-4 shrink-0 z-10 gap-1 shadow-sm">
        <div className="relative">
          <button 
            onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            File <ChevronDown size={14} />
          </button>
          
          {isFileMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsFileMenuOpen(false)}></div>
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
                <button 
                  onClick={exportAsDoc}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                >
                  <Download size={16} /> Download as .doc
                </button>
              </div>
            </>
          )}
        </div>

        <div className="w-px h-6 bg-slate-300 mx-2"></div>

        <div className="flex items-center justify-center flex-1 gap-1 -ml-16">
          <FormatButton icon={Bold} onClick={() => formatText('bold')} label="Bold" />
          <FormatButton icon={Italic} onClick={() => formatText('italic')} label="Italic" />
          <FormatButton icon={Underline} onClick={() => formatText('underline')} label="Underline" />
          <FormatButton icon={Strikethrough} onClick={() => formatText('strikeThrough')} label="Strikethrough" />
          
          <div className="w-px h-6 bg-slate-300 mx-2"></div>
          
          <FormatButton icon={Heading1} onClick={() => formatText('formatBlock', 'H1')} label="Heading 1" />
          <FormatButton icon={Heading2} onClick={() => formatText('formatBlock', 'H2')} label="Heading 2" />
          
          <div className="w-px h-6 bg-slate-300 mx-2"></div>
          
          <FormatButton icon={List} onClick={() => formatText('insertUnorderedList')} label="Bullet List" />
          <FormatButton icon={ListOrdered} onClick={() => formatText('insertOrderedList')} label="Numbered List" />
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left Side Trigger Button: Notes */}
        <button 
          onClick={() => setIsNotesOpen(true)}
          className={`absolute left-0 top-1/2 -translate-y-1/2 bg-white border border-l-0 border-slate-300 rounded-r-xl shadow-md px-2 py-4 flex flex-col items-center gap-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all z-30 ${isNotesOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <PanelLeft size={20} />
          <span className="text-xs font-bold tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>NOTES</span>
        </button>

        {/* Right Side Trigger Button: Sources */}
        <button 
          onClick={() => setIsSourcesOpen(true)}
          className={`absolute right-0 top-1/3 -translate-y-1/2 bg-white border border-r-0 border-slate-300 rounded-l-xl shadow-md px-2 py-4 flex flex-col items-center gap-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all z-30 ${isSourcesOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <PanelRight size={20} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>Sources</span>
        </button>

        {/* Right Side Trigger Button: Analyze */}
        <button 
          onClick={() => setIsAnalyzeOpen(true)}
          className={`absolute right-0 top-2/3 -translate-y-1/2 bg-white border border-r-0 border-slate-300 rounded-l-xl shadow-md px-2 py-4 flex flex-col items-center gap-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-all z-30 ${isAnalyzeOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <BarChart2 size={20} />
          <span className="text-xs font-bold tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>Analyze</span>
        </button>

        {/* Overlay for drawers */}
        {(isNotesOpen || isSourcesOpen || isAnalyzeOpen) && (
          <div 
            className="absolute inset-0 bg-slate-900/10 z-30 transition-opacity"
            onClick={() => { setIsNotesOpen(false); setIsSourcesOpen(false); setIsAnalyzeOpen(false); }}
          ></div>
        )}

        {/* Left Drawer: Notes */}
        <aside className={`absolute top-0 left-0 h-full w-80 bg-white border-r border-slate-200 flex flex-col z-40 shadow-2xl transform transition-transform duration-300 ease-in-out ${isNotesOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <span className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
              <FileText size={16} className="text-blue-500"/> My Notes
            </span>
            <div className="flex gap-2">
              <button 
                onClick={handleAddNote}
                className="p-1.5 bg-white border border-slate-200 text-slate-600 rounded hover:border-blue-300 hover:text-blue-600 shadow-sm transition-all"
                title="New Note"
              >
                <Plus size={16} />
              </button>
              <button 
                onClick={() => setIsNotesOpen(false)}
                className="p-1.5 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-100 shadow-sm transition-all"
                title="Close Notes"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {notes.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-2 text-center mt-4">No notes yet. Click the + button to create one.</p>
            ) : (
              notes.map(note => (
                  <div 
                    key={note.id} 
                    onClick={() => setActiveNoteId(note.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      activeNoteId === note.id 
                        ? 'border-blue-400 bg-blue-50 shadow-sm' 
                        : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    <h4 className="font-medium text-slate-800 text-sm truncate">{note.title || 'Untitled'}</h4>
                    <p className="text-xs text-slate-500 truncate mt-1">{note.content || 'No content...'}</p>
                  </div>
                ))
            )}
          </div>
            
          {activeNote && (
            <div className="h-2/5 border-t border-slate-200 bg-amber-50/30 flex flex-col">
              <input
                type="text"
                value={activeNote.title}
                onChange={(e) => handleUpdateNote(activeNote.id, 'title', e.target.value)}
                className="px-4 py-3 font-semibold text-slate-800 bg-transparent border-b border-amber-100 focus:outline-none placeholder-slate-400 text-sm"
                placeholder="Note Title"
              />
              <textarea
                value={activeNote.content}
                onChange={(e) => handleUpdateNote(activeNote.id, 'content', e.target.value)}
                className="flex-1 p-4 bg-transparent resize-none focus:outline-none text-slate-700 text-sm placeholder-slate-400 leading-relaxed"
                placeholder="Type your notes here..."
              />
            </div>
          )}
        </aside>

        {/* Central Document Canvas */}
        <main className="flex-1 overflow-y-auto bg-[#F3F4F6] flex justify-center py-12 px-4 shadow-inner">
          <div 
            ref={editorRef}
            className="print-area w-[816px] min-h-[1056px] bg-white shadow-xl ring-1 ring-slate-900/5 p-[96px] outline-none document-editor text-slate-800"
            contentEditable={true}
            suppressContentEditableWarning={true}
            onBlur={handleDocumentBlur}
          />
        </main>

        {/* Right Drawer: Sources */}
        <aside className={`absolute top-0 right-0 h-full w-96 bg-white border-l border-slate-200 flex flex-col z-40 shadow-2xl transform transition-transform duration-300 ease-in-out ${isSourcesOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <span className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
              <BookOpen size={16} className="text-indigo-500"/> Sources
            </span>
            <button 
              onClick={() => setIsSourcesOpen(false)}
              className="p-1.5 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-100 shadow-sm transition-all"
              title="Close Sources"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Citation Style</span>
            <select 
              value={citationStyle} 
              onChange={(e) => setCitationStyle(e.target.value)}
              className="text-sm border border-slate-300 rounded px-2 py-1 bg-slate-50 text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="Harvard">Harvard</option>
              <option value="APA">APA</option>
              <option value="MLA">MLA</option>
              <option value="Chicago">Chicago</option>
            </select>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30">
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
                Saved Sources
                <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">{sources.filter(s => s.status === 'saved').length}</span>
              </h3>
              <div className="space-y-3">
                {sources.filter(s => s.status === 'saved').length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No sources saved yet.</p>
                ) : (
                  sources.filter(s => s.status === 'saved').map(source => (
                    <div key={source.id} className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/30 shadow-sm transition-all group">
                      <h4 className="font-medium text-slate-800 text-sm mb-1 leading-tight">{source.title}</h4>
                      <p className="text-xs text-slate-500 mb-3">{source.authors} ({source.year})</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => window.open(source.url, '_blank')}
                          className="flex-1 py-1.5 bg-white text-slate-700 text-xs font-semibold rounded border border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                          View Source
                        </button>
                        <button 
                          onMouseDown={(e) => handleCite(e, source)}
                          className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                          Cite
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2 flex items-center justify-between">
                Suggested Sources
              </h3>
              <div className="space-y-3">
                {isFetchingSources ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                    <span className="text-xs font-medium animate-pulse">Gemma 4 is finding sources...</span>
                  </div>
                ) : sources.filter(s => s.status === 'suggested').length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No suggestions found.</p>
                ) : (
                  sources.filter(s => s.status === 'suggested').map(source => (
                  <div key={source.id} className="p-3 rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md transition-all group">
                    <h4 className="font-medium text-slate-800 text-sm mb-1 leading-tight">{source.title}</h4>
                    <p className="text-xs text-slate-500 mb-2">{source.authors} ({source.year})</p>
                    {source.abstract && (
                      <p className="text-xs text-slate-400 mb-3 line-clamp-3" title={source.abstract}>{source.abstract}</p>
                    )}
                    <div className="flex gap-2">
                      <button 
                        onClick={() => window.open(source.url, '_blank')}
                        className="flex-1 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded hover:bg-slate-200 transition-colors"
                      >
                        View Source
                      </button>
                      <button 
                        onClick={() => handleSaveSource(source.id)}
                        className="flex-1 py-1.5 bg-white border border-indigo-200 text-indigo-600 text-xs font-semibold rounded hover:bg-indigo-50 transition-colors"
                      >
                        Save Source
                      </button>
                    </div>
                  </div>
                ))
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Drawer: Analyze */}
        <aside className={`absolute top-0 right-0 h-full w-96 bg-white border-l border-slate-200 flex flex-col z-40 shadow-2xl transform transition-transform duration-300 ease-in-out ${isAnalyzeOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <span className="font-semibold text-slate-700 flex items-center gap-2 text-sm">
              <BarChart2 size={16} className="text-emerald-500"/> Data & Text Analysis
            </span>
            <button 
              onClick={() => setIsAnalyzeOpen(false)}
              className="p-1.5 bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-100 shadow-sm transition-all"
              title="Close Analyze"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
            {!analysisData ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <BarChart2 size={32} />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">Analyze Dataset</h4>
                <p className="text-xs text-slate-500 mb-6">Upload an Excel (.xlsx) or CSV file to generate charts and explore your data automatically.</p>
                <button
                  onClick={() => excelInputRef.current?.click()}
                  className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  Upload Spreadsheet
                </button>
                <input 
                  type="file" 
                  ref={excelInputRef} 
                  onChange={handleExcelUpload} 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-lg">
                  <div className="truncate text-xs font-semibold text-emerald-800">
                    File: {analysisFileName}
                  </div>
                  <button 
                    onClick={() => excelInputRef.current?.click()}
                    className="text-xs text-emerald-600 hover:text-emerald-800 underline font-medium ml-2 shrink-0"
                  >
                    Change
                  </button>
                  <input 
                    type="file" 
                    ref={excelInputRef} 
                    onChange={handleExcelUpload} 
                    accept=".xlsx, .xls, .csv" 
                    className="hidden" 
                  />
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Generated Visualization</h4>
                  <div className="h-64 w-full">
                    <canvas ref={chartRef}></canvas>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}

function FormatButton({ icon: Icon, onClick, label }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); 
        onClick();
      }}
      title={label}
      className="p-2 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
    >
      <Icon size={18} />
    </button>
  );
}