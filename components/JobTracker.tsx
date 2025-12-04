import React, { useState, useEffect } from 'react';
import { JobApplication, User, InterviewDetails } from '../types';
import { getApplications, saveApplication, deleteApplication } from '../services/storage';

interface JobTrackerProps {
  user: User;
}

export const JobTracker: React.FC<JobTrackerProps> = ({ user }) => {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  
  // Drag State
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);

  // Modal State for Interview Details
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [pendingInterviewAppId, setPendingInterviewAppId] = useState<string | null>(null);
  const [interviewForm, setInterviewForm] = useState<InterviewDetails>({
    type: 'Video',
    date: '',
    time: '',
    locationLink: ''
  });

  // Add Form State
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<'Saved' | 'Applied' | 'Interview' | 'Offer'>('Saved');

  useEffect(() => {
    setApplications(getApplications(user.id));
  }, [user.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newApp: JobApplication = {
      id: crypto.randomUUID(),
      userId: user.id,
      companyName: company,
      jobTitle: title,
      status: status,
      notes: '',
      dateApplied: new Date().toISOString().split('T')[0]
    };
    saveApplication(newApp);
    setApplications(getApplications(user.id));
    setIsAdding(false);
    resetForm();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteApplication(id);
    setApplications(getApplications(user.id));
  };

  const resetForm = () => {
    setCompany('');
    setTitle('');
    setStatus('Saved');
  };

  // --- DND HANDLERS ---
  const handleDragStart = (id: string) => {
    setDraggedAppId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetStatus: 'Saved' | 'Applied' | 'Interview' | 'Offer') => {
    if (!draggedAppId) return;

    const app = applications.find(a => a.id === draggedAppId);
    if (app && app.status !== targetStatus) {
      if (targetStatus === 'Interview') {
        // Trigger modal flow
        setPendingInterviewAppId(app.id);
        setShowInterviewModal(true);
      } else {
        // Just move
        const updated = { ...app, status: targetStatus };
        saveApplication(updated);
        setApplications(getApplications(user.id));
      }
    }
    setDraggedAppId(null);
  };

  const handleSaveInterviewDetails = () => {
    if (!pendingInterviewAppId) return;
    const app = applications.find(a => a.id === pendingInterviewAppId);
    if (app) {
      const updated: JobApplication = {
        ...app,
        status: 'Interview',
        interviewDetails: interviewForm
      };
      saveApplication(updated);
      setApplications(getApplications(user.id));
    }
    setShowInterviewModal(false);
    setPendingInterviewAppId(null);
    setInterviewForm({ type: 'Video', date: '', time: '', locationLink: '' });
  };

  const columns: { id: 'Saved' | 'Applied' | 'Interview' | 'Offer', label: string, color: string }[] = [
    { id: 'Saved', label: 'Saved', color: 'bg-slate-100 border-slate-200' },
    { id: 'Applied', label: 'Applied', color: 'bg-blue-50 border-blue-100' },
    { id: 'Interview', label: 'Interview', color: 'bg-indigo-50 border-indigo-100' },
    { id: 'Offer', label: 'Offer', color: 'bg-emerald-50 border-emerald-100' }
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Job Tracker</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          + Add Job
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-fade-in">
          <form onSubmit={handleSubmit} className="flex gap-4 items-center flex-wrap">
            <input type="text" placeholder="Company" required value={company} onChange={e => setCompany(e.target.value)} className="p-2 border rounded-lg text-sm flex-grow" />
            <input type="text" placeholder="Job Title" required value={title} onChange={e => setTitle(e.target.value)} className="p-2 border rounded-lg text-sm flex-grow" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
              <button type="submit" className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">Save</button>
            </div>
          </form>
        </div>
      )}

      {/* KANBAN BOARD */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden">
        {columns.map(col => (
          <div 
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(col.id)}
            className={`flex flex-col h-full rounded-xl border-2 ${col.color} transition-colors min-h-[300px]`}
          >
            <div className="p-3 border-b border-inherit bg-white/50 backdrop-blur-sm rounded-t-lg flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{col.label}</h3>
              <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm">
                {applications.filter(a => a.status === col.id).length}
              </span>
            </div>
            
            <div className="flex-grow p-3 space-y-3 overflow-y-auto custom-scrollbar">
              {applications.filter(a => a.status === col.id).map(app => (
                <div 
                  key={app.id}
                  draggable
                  onDragStart={() => handleDragStart(app.id)}
                  className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md cursor-grab active:cursor-grabbing relative group transition-all"
                >
                  <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{app.companyName}</h4>
                  <p className="text-xs text-slate-500 mb-2">{app.jobTitle}</p>
                  
                  {app.status === 'Interview' && app.interviewDetails && (
                    <div className="mb-2 p-2 bg-indigo-50 rounded text-[10px] text-indigo-700 border border-indigo-100">
                      <div className="font-bold flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {app.interviewDetails.date} @ {app.interviewDetails.time}
                      </div>
                      <div className="mt-1">{app.interviewDetails.type}</div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400">{new Date(app.dateApplied).toLocaleDateString()}</span>
                    <button 
                      onClick={(e) => handleDelete(app.id, e)}
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              ))}
              {applications.filter(a => a.status === col.id).length === 0 && (
                <div className="text-center py-10 text-slate-400 text-xs italic">Drop items here</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* INTERVIEW DETAILS MODAL */}
      {showInterviewModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowInterviewModal(false)} />
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden relative animate-fade-in z-10">
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <h3 className="font-bold">New Interview</h3>
              <button onClick={() => setShowInterviewModal(false)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
                   <input 
                     type="date" 
                     className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                     value={interviewForm.date}
                     onChange={e => setInterviewForm({...interviewForm, date: e.target.value})} 
                   />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-600 mb-1">Time</label>
                   <input 
                     type="time" 
                     className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                     value={interviewForm.time}
                     onChange={e => setInterviewForm({...interviewForm, time: e.target.value})} 
                   />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Interview Type</label>
                <select 
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  value={interviewForm.type}
                  onChange={e => setInterviewForm({...interviewForm, type: e.target.value as any})}
                >
                  <option value="Video">Video Call (Zoom/Teams)</option>
                  <option value="Phone">Phone Screen</option>
                  <option value="Onsite">Onsite / In-Person</option>
                  <option value="Technical">Technical Assessment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Meeting Link / Location</label>
                <input 
                  type="text" 
                  placeholder="zoom.us/j/12345..." 
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                  value={interviewForm.locationLink}
                  onChange={e => setInterviewForm({...interviewForm, locationLink: e.target.value})} 
                />
              </div>

              <button 
                onClick={handleSaveInterviewDetails}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors mt-2"
              >
                Save Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};