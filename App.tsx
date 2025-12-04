import React, { useState, useEffect } from 'react';
import { AppStatus, AnalysisResult, UploadedFileState, User, HistoryItem, BotConfig } from './types';
import { analyzeResume } from './services/geminiService';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { GlobalChatbot } from './components/GlobalChatbot';
import { login, logout, signup, getCurrentUser, saveHistory, getHistory, deleteHistory, saveUser, saveBotConfig, getBotConfig } from './services/storage';
import { JobTracker } from './components/JobTracker';

const App: React.FC = () => {
  // Navigation & Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard' | 'history' | 'settings' | 'tracker'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // App Logic State
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [uploadedResume, setUploadedResume] = useState<UploadedFileState>({ file: null, previewUrl: null, type: 'pdf' });
  const [jobDescription, setJobDescription] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // History State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  // Settings State
  const [settingsTab, setSettingsTab] = useState<'account' | 'ai'>('account');
  const [outreachConfig, setOutreachConfig] = useState<BotConfig>(getBotConfig('outreach'));
  const [interviewConfig, setInterviewConfig] = useState<BotConfig>(getBotConfig('interview'));

  // Auth Inputs
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authName, setAuthName] = useState('');

  // Sidebar Mobile Toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Check Session
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setView('dashboard');
    }
  }, []);

  // Load history when entering history view
  useEffect(() => {
    if (view === 'history' && currentUser) {
      setHistoryItems(getHistory(currentUser.id));
    }
  }, [view, currentUser]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        const user = login(authEmail, authPass);
        if (user) {
          setCurrentUser(user);
          setView('dashboard');
        } else {
          alert('Invalid credentials');
        }
      } else {
        const user = signup(authName, authEmail, authPass);
        setCurrentUser(user);
        setView('dashboard');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setView('landing');
    handleReset();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedResume({
        file,
        previewUrl: file.type === 'application/pdf' ? URL.createObjectURL(file) : null,
        type: file.type === 'application/pdf' ? 'pdf' : 'docx'
      });
    }
  };

  const handleAnalyze = async () => {
    if (!uploadedResume.file || !jobDescription.trim()) {
      setErrorMessage("Please upload a resume and provide a job description.");
      return;
    }

    setStatus(AppStatus.ANALYZING);
    setErrorMessage('');

    try {
      const result = await analyzeResume(uploadedResume.file, jobDescription);
      setAnalysisResult(result);
      setStatus(AppStatus.SUCCESS);
      
      // Auto-save to history if logged in
      if (currentUser) {
        saveHistory(currentUser.id, result.jobTitleDetected, jobDescription, result);
      }
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || "Something went wrong during analysis.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleReset = () => {
    setStatus(AppStatus.IDLE);
    setUploadedResume({ file: null, previewUrl: null, type: 'pdf' });
    setJobDescription('');
    setAnalysisResult(null);
    setErrorMessage('');
  };

  const handleLoadHistory = (item: HistoryItem) => {
     setJobDescription(item.fullJobDescription);
     setAnalysisResult(item.result);
     setStatus(AppStatus.SUCCESS);
     // Note: Resume file is missing, features needing it will require re-upload
     setView('dashboard');
  };

  const handleSaveAIConfig = () => {
    saveBotConfig(outreachConfig);
    saveBotConfig(interviewConfig);
    alert('AI Personalization Saved Successfully!');
  };

  // --- VIEWS ---

  if (view === 'landing') {
     return (
       <div className="min-h-screen bg-white flex flex-col font-sans">
         <header className="px-6 py-4 flex justify-between items-center max-w-7xl mx-auto w-full border-b border-slate-100">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15h6"/><path d="M9 12h6"/><path d="M9 9h6"/></svg>
              </span>
              Udyoga
            </h1>
            <div className="flex gap-4">
               <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="text-slate-600 font-medium hover:text-blue-600 px-4 py-2">Log In</button>
               <button onClick={() => { setAuthMode('signup'); setView('auth'); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">Sign Up</button>
            </div>
         </header>
         
         <main className="flex-grow">
           {/* Hero Section - Reference Jobscan style */}
           <div className="flex flex-col items-center justify-center text-center px-4 py-24 bg-white">
              <h2 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight max-w-4xl leading-tight">
                Optimize your resume to get <br/> <span className="text-blue-600">more interviews.</span>
              </h2>
              <p className="text-lg text-slate-600 max-w-2xl mb-12 leading-relaxed">
                Udyoga helps you optimize your resume for any job, highlighting the key experience and skills recruiters need to see.
              </p>
              
              <div className="bg-slate-50 border border-slate-200 p-2 rounded-full flex items-center gap-4 pl-6 shadow-lg max-w-lg w-full mb-8">
                 <span className="text-slate-400">Scan your resume for free</span>
                 <button onClick={() => { setAuthMode('signup'); setView('auth'); }} className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold transition-all">
                   Scan Now
                 </button>
              </div>

              <div className="flex items-center gap-8 opacity-60 grayscale mt-8">
                 <span className="font-bold text-xl">amazon</span>
                 <span className="font-bold text-xl">Google</span>
                 <span className="font-bold text-xl">Uber</span>
                 <span className="font-bold text-xl">IBM</span>
              </div>
           </div>

           {/* Steps */}
           <div className="max-w-4xl mx-auto px-6 py-10 pb-20">
             <div className="flex justify-between relative">
                <div className="absolute top-6 left-0 w-full h-0.5 bg-slate-200 -z-10"></div>
                <div className="flex flex-col items-center gap-3 bg-white px-4">
                   <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
                   <span className="font-bold text-slate-800">Upload Resume</span>
                </div>
                <div className="flex flex-col items-center gap-3 bg-white px-4">
                   <div className="w-12 h-12 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-lg">2</div>
                   <span className="font-bold text-slate-800">Add Job</span>
                </div>
                <div className="flex flex-col items-center gap-3 bg-white px-4">
                   <div className="w-12 h-12 bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-bold text-lg">3</div>
                   <span className="font-bold text-slate-800">View Results</span>
                </div>
             </div>
           </div>
         </main>
         <GlobalChatbot />
       </div>
     );
  }

  // AUTH VIEW (unchanged essentially, just layout tweaks)
  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md relative border border-slate-200">
          <button onClick={() => setView('landing')} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
          
          <div className="text-center mb-8 mt-4">
             <h1 className="text-3xl font-bold text-slate-900 mb-2">Udyoga</h1>
             <p className="text-slate-500">{authMode === 'login' ? 'Welcome back to your career coach' : 'Start optimizing your career'}</p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === 'signup' && (
              <input 
                type="text" 
                placeholder="Full Name" 
                required 
                value={authName}
                onChange={e => setAuthName(e.target.value)}
                className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <input 
              type="email" 
              placeholder="Email Address" 
              required 
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input 
              type="password" 
              placeholder="Password" 
              required 
              value={authPass}
              onChange={e => setAuthPass(e.target.value)}
              className="w-full p-3 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
              {authMode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-blue-600 hover:underline font-medium">
              {authMode === 'login' ? "New to Udyoga? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- DASHBOARD LAYOUT (SIDEBAR) ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
         <div className="h-16 flex items-center px-6 border-b border-slate-100">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white">
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
              </span>
              Udyoga
            </h1>
         </div>
         
         <nav className="p-4 space-y-1">
           <button 
             onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
           >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
             Dashboard
           </button>
           <button 
             onClick={() => { setView('tracker'); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'tracker' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
           >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
             Job Tracker
           </button>
           <button 
             onClick={() => { setView('history'); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'history' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
           >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
             Scan History
           </button>
           <button 
             onClick={() => { setView('settings'); setIsSidebarOpen(false); }}
             className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${view === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
           >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
             Settings
           </button>
         </nav>
         
         <div className="absolute bottom-4 left-4 right-4">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
               Sign Out
            </button>
         </div>
      </aside>

      {/* OVERLAY for Mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-grow lg:ml-64 p-4 lg:p-8">
        
        {/* Mobile Header Toggle */}
        <div className="lg:hidden mb-6 flex items-center justify-between">
           <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-600">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
           </button>
           <span className="font-bold text-slate-800">Udyoga</span>
           <div className="w-8"></div>
        </div>

        {view === 'tracker' && currentUser && (
          <JobTracker user={currentUser} />
        )}

        {view === 'history' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Scan History</h2>
            {historyItems.length === 0 ? (
              <div className="text-center py-20 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-200">No history found. Start analyzing!</div>
            ) : (
              <div className="space-y-4">
                {historyItems.map(item => (
                  <div key={item.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">{item.jobTitle}</h3>
                      <p className="text-xs text-slate-400 mb-2">{new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString()}</p>
                      <p className="text-sm text-slate-600 truncate max-w-lg">{item.jobDescriptionSummary}</p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                       <button onClick={() => handleLoadHistory(item)} className="flex-1 sm:flex-none px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100">View Report</button>
                       <button onClick={() => { deleteHistory(item.id); setHistoryItems(prev => prev.filter(i => i.id !== item.id)); }} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 rounded-lg">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'settings' && currentUser && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Settings</h2>
            
            <div className="flex gap-4 mb-6 border-b border-slate-200">
               <button 
                 onClick={() => setSettingsTab('account')}
                 className={`pb-3 text-sm font-medium transition-colors border-b-2 ${settingsTab === 'account' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
               >
                 Account
               </button>
               <button 
                 onClick={() => setSettingsTab('ai')}
                 className={`pb-3 text-sm font-medium transition-colors border-b-2 ${settingsTab === 'ai' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
               >
                 AI Personalization
               </button>
            </div>

            {settingsTab === 'account' && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6 animate-fade-in">
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                   <input type="text" value={currentUser.name} disabled className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500" />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                   <input type="text" value={currentUser.email} disabled className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500" />
                 </div>
                 <div className="pt-4 border-t border-slate-100">
                   <h3 className="font-semibold text-slate-800 mb-4">Change Password</h3>
                   <form onSubmit={(e) => {
                      e.preventDefault();
                      const newPass = (e.currentTarget.elements.namedItem('newPass') as HTMLInputElement).value;
                      if(newPass) {
                        saveUser({...currentUser, password: newPass});
                        alert('Password updated');
                      }
                   }}>
                     <input name="newPass" type="password" placeholder="New Password" className="w-full p-3 bg-white border border-slate-200 rounded-xl mb-4" />
                     <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700">Update Password</button>
                   </form>
                 </div>
              </div>
            )}

            {settingsTab === 'ai' && (
              <div className="space-y-6 animate-fade-in">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg text-slate-800 mb-1">Outreach Writer Bot</h3>
                    <p className="text-sm text-slate-500 mb-4">Customize how the AI writes your emails and messages.</p>
                    
                    <label className="block text-xs font-bold text-slate-600 mb-1">System Prompt</label>
                    <textarea 
                      className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={outreachConfig.systemPrompt}
                      onChange={(e) => setOutreachConfig({...outreachConfig, systemPrompt: e.target.value})}
                    />
                    
                    <label className="block text-xs font-bold text-slate-600 mb-1">Creativity (Temperature): {outreachConfig.temperature}</label>
                    <input 
                      type="range" min="0" max="2" step="0.1"
                      value={outreachConfig.temperature}
                      onChange={(e) => setOutreachConfig({...outreachConfig, temperature: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                 </div>

                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-lg text-slate-800 mb-1">Interview Coach Bot</h3>
                    <p className="text-sm text-slate-500 mb-4">Customize the personality and strictness of your interview coach.</p>
                    
                    <label className="block text-xs font-bold text-slate-600 mb-1">System Prompt</label>
                    <textarea 
                      className="w-full h-32 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={interviewConfig.systemPrompt}
                      onChange={(e) => setInterviewConfig({...interviewConfig, systemPrompt: e.target.value})}
                    />
                    
                    <label className="block text-xs font-bold text-slate-600 mb-1">Creativity (Temperature): {interviewConfig.temperature}</label>
                    <input 
                      type="range" min="0" max="2" step="0.1"
                      value={interviewConfig.temperature}
                      onChange={(e) => setInterviewConfig({...interviewConfig, temperature: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                 </div>

                 <div className="flex justify-end">
                    <button onClick={handleSaveAIConfig} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md">
                      Save Changes
                    </button>
                 </div>
              </div>
            )}
          </div>
        )}

        {view === 'dashboard' && (
          <>
            {status === AppStatus.IDLE || status === AppStatus.ERROR ? (
              <div className="max-w-4xl mx-auto space-y-8">
                
                <div className="text-center space-y-4">
                  <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                    Dashboard
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* Input 1: Resume */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">1</div>
                      <h3 className="font-semibold text-lg">Upload Resume</h3>
                    </div>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors relative cursor-pointer group">
                      <input 
                        type="file" 
                        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="space-y-2">
                        <svg className="w-10 h-10 mx-auto text-slate-400 group-hover:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                        <p className="text-sm text-slate-600 font-medium truncate px-4">
                          {uploadedResume.file ? uploadedResume.file.name : "Click to Upload PDF or DOCX"}
                        </p>
                        <p className="text-xs text-slate-400">Supported formats: PDF, DOCX</p>
                      </div>
                    </div>
                  </div>

                  {/* Input 2: Job Description */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 hover:border-blue-300 transition-colors h-full">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">2</div>
                      <h3 className="font-semibold text-lg">Job Description</h3>
                    </div>
                    <textarea
                      className="w-full h-48 p-4 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                      placeholder="Paste the full job description here..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </div>

                </div>

                {errorMessage && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-center text-sm font-medium">
                    {errorMessage}
                  </div>
                )}

                <div className="text-center">
                  <button
                    onClick={handleAnalyze}
                    disabled={!uploadedResume.file || !jobDescription.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 px-12 rounded-full shadow-lg shadow-blue-200 transition-all transform hover:scale-105 active:scale-95 text-lg"
                  >
                    Scan & Optimize
                  </button>
                </div>

              </div>
            ) : status === AppStatus.ANALYZING ? (
              <div className="flex flex-col items-center justify-center h-[60vh]">
                {/* SCANNER ANIMATION */}
                <div className="relative w-64 h-80 bg-white border-2 border-slate-200 rounded-lg shadow-xl scanner-container flex flex-col p-4 space-y-3">
                   <div className="scanner-line z-10"></div>
                   <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                   <div className="h-4 bg-slate-100 rounded w-full"></div>
                   <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                   <div className="h-32 bg-slate-50 rounded w-full mt-4"></div>
                   <div className="h-4 bg-slate-100 rounded w-1/2 mt-4"></div>
                </div>
                
                <div className="text-center space-y-2 mt-8">
                  <h3 className="text-xl font-semibold text-slate-800">Scanning your profile...</h3>
                  <p className="text-slate-500">Checking keywords, formatting, and relevance...</p>
                </div>
              </div>
            ) : (
              analysisResult && uploadedResume.file && (
                <AnalysisDashboard 
                  result={analysisResult} 
                  resumeFile={uploadedResume.file} 
                  jobDescription={jobDescription}
                  onReset={handleReset} 
                />
              )
            )}
          </>
        )}

        <GlobalChatbot />
      </div>
    </div>
  );
};

export default App;