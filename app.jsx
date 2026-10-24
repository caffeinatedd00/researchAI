import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  BookOpen, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Plus, 
  Search, 
  LogIn, 
  Save, 
  CheckCircle, 
  Loader
} from 'lucide-react';

// Replace with your Google Cloud Console OAuth 2.0 Client ID (Web Application type)
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';

export default function App() {
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  
  // Google Auth & Sync State
  const [tokenClient, setTokenClient] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  // Notes state
  const [notes, setNotes] = useState([
    { 
      id: 1, 
      title: 'Gemma 4 Architecture Notes', 
      content: 'Compare parameter efficiency and scaling factors against competing open-weight models.' 
    }
  ]);
  const [activeNote, setActiveNote] = useState(notes[0]);

  // Suggested sources state
  const [searchQuery, setSearchQuery] = useState('');
  const [sources] = useState([
    {
      id: 1,
      title: 'Gemma: Open Models Based on Gemini Research',
      authors: 'Google DeepMind (2024)',
      abstract: 'Introduces Gemma, a family of lightweight, state-of-the-art open models built from Gemini technology.'
    },
    {
      id: 2,
      title: 'Attention Is All You Need',
      authors: 'Vaswani et al. (2017)',
      abstract: 'The core Transformer architecture underlying modern large language models.'
    }
  ]);

  // Initialize Google GIS Token Client on load
  useEffect(() => {
    /* global google */
    if (window.google) {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (tokenResponse) => {
          if (tokenResponse.access_token) {
            setAccessToken(tokenResponse.access_token);
            await fetchUserProfile(tokenResponse.access_token);
          }
        },
      });
      setTokenClient(client);
    }
  }, []);

  const fetchUserProfile = async (token) => {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const profile = await res.json();
      setUser(profile);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  };

  const handleGoogleSignIn = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    } else {
      alert('Google Identity script is still loading. Please try again in a moment.');
    }
  };

  const addNewNote = () => {
    const newNote = { id: Date.now(), title: 'New Research Note', content: '' };
    setNotes([...notes, newNote]);
    setActiveNote(newNote);
  };

  // Create and save document directly to user's Google Drive / Docs
  const handleSaveToGoogleDocs = async () => {
    if (!accessToken) {
      handleGoogleSignIn();
      return;
    }

    setIsSaving(true);
    setSaveStatus(null);

    try {
      // 1. Create a blank Google Doc
      const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: 'Open-Weight Gemma 4 Research Paper' })
      });
      const docData = await createRes.json();
      const documentId = docData.documentId;

      // 2. Insert text content into the newly created document
      await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: "Open-Weight Gemma 4 Research Paper\n\nAbstract:\nThis paper explores automated literature synthesis using open-weight architectures."
              }
            }
          ]
        })
      });

      setSaveStatus({ 
        success: true, 
        url: `https://docs.google.com/document/d/${documentId}/edit` 
      });
    } catch (err) {
      console.error('Error saving to Google Docs:', err);
      setSaveStatus({ success: false });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] overflow-hidden font-sans relative">
      
      {/* ================= GOOGLE DOCS HEADER ================= */}
      <header className="absolute top-0 w-full bg-white border-b border-gray-200 z-10 flex flex-col">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-[#4285F4] rounded text-white flex items-center justify-center font-bold mr-3 shadow-sm">
              <FileText size={24} />
            </div>
            <div className="flex flex-col">
              <span className="text-gray-800 text-lg px-1 hover:border-gray-300 border border-transparent rounded cursor-pointer transition-colors w-fit font-medium">
                Open-Source AI Research Paper
              </span>
              <nav className="flex space-x-1 text-sm text-gray-600 mt-0.5">
                {['File', 'Edit', 'View', 'Insert', 'Format', 'Tools'].map((item) => (
                  <span key={item} className="px-2 py-0.5 hover:bg-gray-100 rounded cursor-pointer transition-colors">
                    {item}
                  </span>
                ))}
              </nav>
            </div>
          </div>

          {/* Google Auth & Save Controls */}
          <div className="flex items-center gap-3">
            {!user ? (
              <button 
                onClick={handleGoogleSignIn}
                className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              >
                <LogIn size={16} className="text-blue-600" />
                Sign in with Google
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg">
                  <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full border" />
                  <span className="text-xs font-medium text-gray-700">{user.email}</span>
                </div>
                <button 
                  onClick={handleSaveToGoogleDocs}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                  Save to Google Docs
                </button>
              </div>
            )}
          </div>
        </div>

        {saveStatus?.success && (
          <div className="bg-green-50 border-t border-green-200 px-4 py-1 text-xs text-green-700 flex justify-between items-center">
            <span>Document created and saved to your Google Drive successfully!</span>
            <a href={saveStatus.url} target="_blank" rel="noreferrer" className="underline font-semibold flex items-center gap-1">
              <CheckCircle size={12} /> Open in Google Docs
            </a>
          </div>
        )}
        
        {/* Formatting Bar */}
        <div className="h-10 border-t border-gray-200 flex items-center px-4 space-x-4 text-gray-600 text-sm bg-gray-50 rounded-full mx-4 mb-2 shadow-sm">
          <button className="font-bold hover:bg-gray-200 px-2 rounded">B</button>
          <button className="italic hover:bg-gray-200 px-2 rounded">I</button>
          <button className="underline hover:bg-gray-200 px-2 rounded">U</button>
          <div className="w-px h-4 bg-gray-300"></div>
          <span className="hover:bg-gray-200 px-2 rounded cursor-pointer">Normal text</span>
          <div className="w-px h-4 bg-gray-300"></div>
          <span className="hover:bg-gray-200 px-2 rounded cursor-pointer">Arial</span>
          <div className="w-px h-4 bg-gray-300"></div>
          <span className="hover:bg-gray-200 px-2 rounded cursor-pointer">11</span>
        </div>
      </header>

      {/* ================= LEFT TAB / SIDEBAR: NOTES ================= */}
      {!isNotesOpen && (
        <button 
          onClick={() => setIsNotesOpen(true)}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow-md border border-gray-200 rounded-r-lg p-2 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition-colors z-20"
        >
          <ChevronRight size={16} />
          <span className="font-medium text-sm py-2" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            Notes
          </span>
        </button>
      )}

      <aside className={`absolute left-0 top-[120px] bottom-4 w-80 bg-white shadow-2xl rounded-tr-xl rounded-br-xl transition-transform duration-300 z-30 border border-gray-200 flex flex-col ${isNotesOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white rounded-tr-xl">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <FileText size={18} /> Research Notes
          </h2>
          <button onClick={() => setIsNotesOpen(false)} className="text-blue-100 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-grow overflow-y-auto">
          <button 
            onClick={addNewNote} 
            className="w-full mb-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center justify-center gap-2 font-medium transition-colors shadow-sm"
          >
            <Plus size={16} /> New Note
          </button>
          
          <div className="space-y-3">
            {notes.map(note => (
              <div 
                key={note.id} 
                onClick={() => setActiveNote(note)}
                className={`p-3 border rounded-lg cursor-pointer transition-all ${
                  activeNote?.id === note.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-semibold text-sm mb-1 text-gray-800">{note.title}</div>
                <div className="text-xs text-gray-500 truncate">{note.content || 'Empty note content...'}</div>
              </div>
            ))}
          </div>
        </div>
        
        {activeNote && (
          <div className="h-[40%] border-t border-gray-200 p-4 bg-amber-50/40 flex flex-col rounded-br-xl">
            <input 
              className="font-bold bg-transparent border-none outline-none mb-2 text-gray-800 placeholder-gray-400 text-sm" 
              value={activeNote.title} 
              placeholder="Note Title"
              onChange={(e) => {
                const updated = { ...activeNote, title: e.target.value };
                setActiveNote(updated);
                setNotes(notes.map(n => n.id === updated.id ? updated : n));
              }}
            />
            <textarea 
              className="w-full flex-grow bg-transparent border-none outline-none resize-none text-xs text-gray-700 placeholder-gray-400 leading-relaxed" 
              placeholder="Type research notes here..."
              value={activeNote.content}
              onChange={(e) => {
                const updated = { ...activeNote, content: e.target.value };
                setActiveNote(updated);
                setNotes(notes.map(n => n.id === updated.id ? updated : n));
              }}
            />
          </div>
        )}
      </aside>

      {/* ================= GOOGLE DOCS CANVAS ================= */}
      <main className="flex-grow pt-36 pb-8 overflow-y-auto flex justify-center w-full z-0 px-12">
        <article 
          className="w-[816px] min-h-[1056px] bg-white shadow-md border border-gray-300 p-[96px] outline-none mb-12 rounded-sm" 
          contentEditable 
          suppressContentEditableWarning
        >
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
            Open-Weight Gemma 4 Research Paper
          </h1>
          
          <h2 className="text-xl font-bold mb-2 mt-8 text-gray-800 border-b pb-1">Abstract</h2>
          <p className="mb-4 text-gray-700 leading-relaxed">
            Begin editing your abstract here. Sign in with your Gmail account to sync and save directly to your Google Docs.
          </p>
          
          <h2 className="text-xl font-bold mb-2 mt-8 text-gray-800 border-b pb-1">1. Introduction</h2>
          <p className="mb-4 text-gray-700 leading-relaxed">
            Outline your open-weight model framework and benchmarks here...
          </p>
        </article>
      </main>

      {/* ================= RIGHT TAB / SIDEBAR: SUGGESTED SOURCES ================= */}
      {!isSourcesOpen && (
        <button 
          onClick={() => setIsSourcesOpen(true)}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow-md border border-gray-200 rounded-l-lg p-2 flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 transition-colors z-20"
        >
          <span className="font-medium text-sm py-2" style={{ writingMode: 'vertical-rl' }}>
            Suggested Sources
          </span>
          <ChevronLeft size={16} />
        </button>
      )}

      <aside className={`absolute right-0 top-[120px] bottom-4 w-80 bg-white shadow-2xl rounded-tl-xl rounded-bl-xl transition-transform duration-300 z-30 border border-gray-200 flex flex-col ${isSourcesOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-emerald-700 text-white rounded-tl-xl">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <BookOpen size={18} /> Suggested Sources
          </h2>
          <button onClick={() => setIsSourcesOpen(false)} className="text-emerald-100 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-3 border-b border-gray-100 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Search similar papers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-grow bg-gray-50/50">
          {sources.map(paper => (
            <div key={paper.id} className="p-3 border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer bg-white group">
              <h4 className="font-semibold text-sm text-emerald-800 leading-tight mb-1 group-hover:underline">
                {paper.title}
              </h4>
              <p className="text-xs text-gray-500 mb-2">{paper.authors}</p>
              <p className="text-xs text-gray-700 line-clamp-3 mb-3 leading-relaxed">
                {paper.abstract}
              </p>
              <button className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-medium rounded-md text-xs hover:bg-emerald-100 w-full transition-colors">
                Cite Source
              </button>
            </div>
          ))}
        </div>
      </aside>

    </div>
  );
}
