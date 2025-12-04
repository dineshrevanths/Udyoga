import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, OutreachContent, InterviewState } from '../types';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { generateOutreachMessages, createInterviewChat } from '../services/geminiService';
import { MarkdownRenderer } from './MarkdownRenderer';

ChartJS.register(ArcElement, Tooltip, Legend);

interface AnalysisDashboardProps {
  result: AnalysisResult;
  resumeFile: File;
  jobDescription: string;
  onReset: () => void;
  onSaveToHistory?: () => void;
}

const ScoreChart = ({ score }: { score: number }) => {
  const data = {
    labels: ['Match', 'Gap'],
    datasets: [
      {
        data: [score, 100 - score],
        backgroundColor: [
          score > 75 ? '#10b981' : score > 50 ? '#f59e0b' : '#ef4444',
          '#e2e8f0',
        ],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    cutout: '75%',
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
  };

  return (
    <div className="relative w-24 h-24 mx-auto md:w-32 md:h-32">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-2xl md:text-3xl font-bold text-slate-800">{score}%</span>
        <span className="text-[10px] md:text-xs text-slate-500 uppercase tracking-wide">Match</span>
      </div>
    </div>
  );
};

export const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ result, resumeFile, jobDescription, onReset }) => {
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [outreachData, setOutreachData] = useState<OutreachContent | null>(null);
  const [outreachLoading, setOutreachLoading] = useState(false);

  const [interviewState, setInterviewState] = useState<InterviewState>({
    isOpen: false,
    tellMeAboutYourself: '',
    chatSession: null,
    messages: [],
    isLoading: false
  });
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleGenerateOutreach = async () => {
    setOutreachOpen(true);
    if (!outreachData) {
      setOutreachLoading(true);
      try {
        const data = await generateOutreachMessages(resumeFile, jobDescription);
        setOutreachData(data);
      } catch (e) {
        console.error(e);
      } finally {
        setOutreachLoading(false);
      }
    }
  };

  const handleOpenInterview = async () => {
    setInterviewState(prev => ({ ...prev, isOpen: true }));
    if (!interviewState.chatSession) {
      setInterviewState(prev => ({ ...prev, isLoading: true }));
      try {
        const { chat, tellMeAboutYourself } = await createInterviewChat(resumeFile, jobDescription);
        setInterviewState(prev => ({
          ...prev,
          chatSession: chat,
          tellMeAboutYourself,
          isLoading: false
        }));
      } catch (e) {
        console.error(e);
        setInterviewState(prev => ({ ...prev, isLoading: false }));
      }
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !interviewState.chatSession) return;

    const userMsg = chatInput;
    setChatInput('');
    setInterviewState(prev => ({
      ...prev,
      messages: [...prev.messages, { role: 'user', text: userMsg }]
    }));

    try {
      const response = await interviewState.chatSession.sendMessage({ message: userMsg });
      setInterviewState(prev => ({
        ...prev,
        messages: [...prev.messages, { role: 'model', text: response.text || "Error generating response." }]
      }));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interviewState.messages]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in pb-20">
      
      {/* SIDEBAR ACTIONS (Desktop) / TOPBAR (Mobile) */}
      <div className="lg:w-64 flex flex-col gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <ScoreChart score={result.matchScore} />
           <div className="mt-4 text-center">
             <div className="font-bold text-slate-800">{result.jobTitleDetected}</div>
             <p className="text-xs text-slate-500 mt-1">Analysis Completed</p>
           </div>
           <button 
            onClick={onReset}
            className="w-full mt-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            New Analysis
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3">
          <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide px-2">Tools</h4>
          <button 
            onClick={handleGenerateOutreach}
            className="flex items-center gap-3 w-full text-left px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-medium transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Outreach Writer
          </button>
          <button 
            onClick={handleOpenInterview}
            className="flex items-center gap-3 w-full text-left px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Interview Coach
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-grow space-y-8">
        
        {/* Executive Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col gap-4">
            <p className="text-slate-600 leading-relaxed text-lg">{result.executiveSummary}</p>
            <div className="flex flex-wrap gap-2">
               {result.foundKeywords.slice(0, 8).map(k => (
                  <span key={k} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-md border border-emerald-100 font-medium">
                    ✓ {k}
                  </span>
               ))}
               {result.missingKeywords.slice(0, 5).map(k => (
                  <span key={k} className="px-2 py-1 bg-rose-50 text-rose-700 text-xs rounded-md border border-rose-100 font-medium">
                    ⚠ {k}
                  </span>
               ))}
            </div>
          </div>
        </div>

        {/* 3-Column Optimization */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* Column 1: Personal Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100 bg-indigo-50/50 rounded-t-xl">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center text-xs">1</span>
                Summary Pitch
              </h4>
            </div>
            <div className="p-5 flex-grow overflow-y-auto custom-scrollbar">
              <p className="text-sm text-slate-500 mb-3 font-medium">Core Narrative:</p>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm text-slate-700 leading-relaxed mb-6">
                {result.suggestedResume.personalSummary}
              </div>
              <p className="text-sm text-slate-500 mb-3 font-medium">Power Extensions:</p>
              <ul className="space-y-3">
                {result.suggestedResume.summaryExtensionPoints?.map((point, idx) => (
                  <li key={idx} className="text-xs text-slate-600 border-l-2 border-indigo-200 pl-3">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Column 2: Categorized Skills */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100 bg-emerald-50/50 rounded-t-xl">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded flex items-center justify-center text-xs">2</span>
                Skills Hierarchy
              </h4>
            </div>
            <div className="p-5 flex-grow overflow-y-auto custom-scrollbar space-y-5">
               {result.suggestedResume.coreSkills.map((cat, idx) => (
                 <div key={idx}>
                   <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-100 pb-1">{cat.category}</h5>
                   <div className="flex flex-wrap gap-2">
                     {cat.skills.map((skill, sIdx) => (
                       <span key={sIdx} className="px-2.5 py-1 bg-white border border-slate-200 rounded text-xs font-semibold text-slate-700 shadow-sm">
                         {skill}
                       </span>
                     ))}
                   </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Column 3: Removals */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100 bg-rose-50/50 rounded-t-xl">
              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                <span className="w-6 h-6 bg-rose-100 text-rose-600 rounded flex items-center justify-center text-xs">3</span>
                Cuts & Fixes
              </h4>
            </div>
            <div className="p-5 flex-grow overflow-y-auto custom-scrollbar space-y-3">
               {result.removals.length > 0 ? result.removals.map((rem, idx) => (
                 <div key={idx} className="bg-rose-50/50 p-3 rounded border border-rose-100">
                   <div className="text-sm font-medium text-slate-800 line-through decoration-rose-400 opacity-70 mb-1">{rem.text}</div>
                   <div className="text-rose-600 text-[10px] font-medium uppercase tracking-wide">{rem.reason}</div>
                 </div>
               )) : (
                 <p className="text-sm text-slate-400 italic text-center mt-10">No major irrelevant content found. Good job!</p>
               )}
            </div>
          </div>
        </div>

        {/* Experience Section */}
        <div className="space-y-6">
          <h4 className="text-2xl font-bold text-slate-800">Experience Optimization Library</h4>
          <div className="grid grid-cols-1 gap-8">
            {result.suggestedResume.experience.map((exp, idx) => (
              <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <h5 className="font-bold text-lg text-slate-800">{exp.companyAndRole}</h5>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">
                    {exp.suggestedBulletPoints.length} Points
                  </span>
                </div>
                <div className="p-6">
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                    {exp.suggestedBulletPoints.map((point, pIdx) => (
                      <li key={pIdx} className="flex items-start gap-3 text-sm text-slate-700 hover:bg-slate-50 p-2 rounded transition-colors">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></span>
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL: Outreach Messages */}
      {outreachOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setOutreachOpen(false)} />
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-fade-in">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Recruiter Outreach Messages</h3>
              <button onClick={() => setOutreachOpen(false)} className="text-slate-400 hover:text-slate-600 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {outreachLoading ? (
                <div className="text-center py-12">
                   <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                   <p className="text-slate-500 font-medium">Crafting perfect emails...</p>
                </div>
              ) : outreachData && (
                <>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Cold Email
                      </h4>
                      <button 
                        onClick={() => navigator.clipboard.writeText(`Subject: ${outreachData.emailSubject}\n\n${outreachData.emailBody}`)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-600 font-medium transition-colors"
                      >
                        Copy Text
                      </button>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap font-sans">
                      <strong className="block mb-2 text-slate-900">Subject: {outreachData.emailSubject}</strong>
                      {outreachData.emailBody}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                         <span className="w-2 h-2 rounded-full bg-blue-500"></span> LinkedIn Note
                      </h4>
                      <button 
                        onClick={() => navigator.clipboard.writeText(outreachData.linkedinMessage)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-slate-600 font-medium transition-colors"
                      >
                        Copy Text
                      </button>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 whitespace-pre-wrap font-sans">
                      {outreachData.linkedinMessage}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Interview Helper */}
      {interviewState.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setInterviewState(prev => ({ ...prev, isOpen: false }))} />
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative animate-fade-in">
            <div className="p-4 border-b border-indigo-700 flex justify-between items-center bg-indigo-600 text-white shadow-md z-10">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Interview Coach
              </h3>
              <button onClick={() => setInterviewState(prev => ({ ...prev, isOpen: false }))} className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            
            <div className="flex flex-col md:flex-row h-full overflow-hidden bg-slate-50">
              
              {/* Left Panel: Introduction */}
              <div className="md:w-[35%] bg-white border-r border-slate-200 overflow-y-auto p-6 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-0">
                <h4 className="font-bold text-slate-800 mb-4 uppercase text-xs tracking-wider border-b border-slate-100 pb-2">"Tell Me About Yourself"</h4>
                {interviewState.isLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                    <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-100 rounded w-4/6"></div>
                  </div>
                ) : (
                  <div className="text-slate-600 text-sm leading-relaxed">
                    <MarkdownRenderer content={interviewState.tellMeAboutYourself} />
                  </div>
                )}
              </div>

              {/* Right Panel: Chat */}
              <div className="md:w-[65%] flex flex-col bg-slate-50">
                <div className="flex-grow p-6 overflow-y-auto space-y-4">
                  {interviewState.messages.length === 0 && (
                    <div className="text-center text-slate-400 text-sm my-10 px-10">
                      <p>Try asking: <strong>"Why should we hire you?"</strong> or <strong>"Explain your experience with React."</strong></p>
                      <p className="mt-2 text-xs">I will give you the exact words to say.</p>
                    </div>
                  )}
                  
                  {interviewState.messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-5 py-3 text-sm shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-slate-800 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                      }`}>
                         <MarkdownRenderer content={msg.text} />
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSubmit} className="p-4 bg-white border-t border-slate-200">
                  <div className="relative flex gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask a tough interview question..."
                      className="flex-grow pl-4 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!chatInput.trim() || interviewState.isLoading}
                      className="px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};