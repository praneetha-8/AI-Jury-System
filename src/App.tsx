import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Send, 
  Gavel, 
  History, 
  LayoutDashboard, 
  LogOut, 
  LogIn, 
  Terminal, 
  Cpu,
  Trophy,
  AlertCircle,
  CheckCircle2,
  Zap,
  RefreshCw,
  MoreVertical,
  ShieldAlert,
  BarChart3,
  Scale,
  Search,
  Activity,
  Layers,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { auth, db, loginWithGoogle, logout, onAuthStateChanged, collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc, setDoc, handleFirestoreError, OperationType, Timestamp, serverTimestamp, User } from './lib/firebase';
import { generateAIResponses, judgeResponse } from './lib/gemini';
import { JUDGES, JudgeId, Session, ResponseData, Evaluation } from './types';
import { JudgeCard } from './components/JudgeCard';
import { ScoreChart } from './components/ScoreChart';
import { VerdictDisplay } from './components/VerdictDisplay';
import { ConsensusMatrix } from './components/ConsensusMatrix';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'landing' | 'arena' | 'history'>('landing');
  const [evaluationProgress, setEvaluationProgress] = useState(0);

  // Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      if (usr) {
        const q = query(collection(db, 'sessions'), where('userId', '==', usr.uid), orderBy('createdAt', 'desc'));
        return onSnapshot(q, (snapshot) => {
          setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'sessions'));
      } else {
        setSessions([]);
        setView('landing');
      }
    });
  }, []);

  // Responses Listener
  useEffect(() => {
    if (currentSession) {
      const q = collection(db, 'sessions', currentSession.id, 'responses');
      const unsubscribeResponses = onSnapshot(q, (snapshot) => {
        const responseData: ResponseData[] = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          evaluations: [] 
        } as ResponseData));
        
        responseData.forEach((res) => {
          const evalsQ = collection(db, 'sessions', currentSession.id!, 'responses', res.id, 'evaluations');
          onSnapshot(evalsQ, (evalsSnap) => {
            const evals = evalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Evaluation));
            setResponses(prev => {
              const next = [...prev];
              const targetIdx = next.findIndex(r => r.id === res.id);
              if (targetIdx !== -1) {
                next[targetIdx] = { ...next[targetIdx], evaluations: evals };
              }
              return next;
            });
          }, (err) => handleFirestoreError(err, OperationType.LIST, `sessions/${currentSession.id}/responses/${res.id}/evaluations`));
        });
        
        setResponses(responseData);
      }, (err) => handleFirestoreError(err, OperationType.LIST, `sessions/${currentSession.id}/responses`));
      return () => unsubscribeResponses();
    }
  }, [currentSession?.id]);

  const handleStartSession = async () => {
    if (!prompt.trim() || !user) return;
    setLoading(true);
    setView('arena');
    setEvaluationProgress(10);

    try {
      const sessionPath = 'sessions';
      const sessionData = {
        prompt,
        createdAt: serverTimestamp(),
        status: 'generating',
        userId: user.uid
      };
      
      let sessionRef;
      try {
        sessionRef = await addDoc(collection(db, sessionPath), sessionData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, sessionPath);
        return;
      }
      
      const session: Session = { 
        id: sessionRef.id, 
        prompt, 
        createdAt: Timestamp.now(), // Local approx for immediate UI
        status: 'generating' 
      };
      setCurrentSession(session);

      setEvaluationProgress(30);
      const generatedTexts = await generateAIResponses(prompt);
      
      const responseIds: string[] = [];
      for (let i = 0; i < generatedTexts.length; i++) {
        const responsePath = `sessions/${sessionRef.id}/responses`;
        try {
          const resRef = await addDoc(collection(db, responsePath), {
            text: generatedTexts[i],
            modelId: `Agent-${String.fromCharCode(65 + i)}`,
            finalScore: 0
          });
          responseIds.push(resRef.id);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, responsePath);
          return;
        }
      }

      setEvaluationProgress(50);
      try {
        await updateDoc(sessionRef, { status: 'evaluating' });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `sessions/${sessionRef.id}`);
        return;
      }

      for (let i = 0; i < responseIds.length; i++) {
        for (const judge of JUDGES) {
          const evalResult = await judgeResponse(prompt, generatedTexts[i], judge.id);
          const evalPath = `sessions/${sessionRef.id}/responses/${responseIds[i]}/evaluations`;
          try {
            await addDoc(collection(db, evalPath), {
              judgeId: judge.id,
              ...evalResult
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, evalPath);
            return;
          }
          setEvaluationProgress(prev => Math.min(prev + 5, 95));
        }
      }

      try {
        await updateDoc(sessionRef, { status: 'completed' });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `sessions/${sessionRef.id}`);
        return;
      }
      
      setEvaluationProgress(100);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b']
      });
    } catch (error) {
      console.error("Evaluation flow failed", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinalScore = (res: ResponseData) => {
    if (res.evaluations.length === 0) return 0;
    const sum = res.evaluations.reduce((acc, curr) => acc + curr.score, 0);
    return sum / res.evaluations.length;
  };

  const winner = responses.length > 0 ? [...responses].sort((a, b) => calculateFinalScore(b) - calculateFinalScore(a))[0] : null;

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Grid Pattern Background */}
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-20" />
      <div className="fixed inset-0 bg-gradient-to-t from-black via-transparent to-transparent pointer-events-none" />
      
      {/* Decorative Elements */}
      <div className="fixed top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent z-[60]" />
      <div className="fixed top-0 right-0 h-screen w-[1px] bg-gradient-to-b from-transparent via-zinc-800 to-transparent z-[60]" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/60 backdrop-blur-xl px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-zinc-900 border border-zinc-700 p-2.5 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] cursor-pointer"
            onClick={() => setView('landing')}
          >
            <Scale className="text-blue-500" size={22} />
          </motion.div>
          <div>
            <h1 className="text-xl font-mono font-black tracking-tighter flex items-center gap-2 text-white">
              AI TRIBUNAL <span className="bg-blue-600 text-[10px] px-1.5 py-0.5 rounded text-white font-bold ml-1">EVAL</span>
            </h1>
            <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-mono tracking-[0.2em] uppercase">
              <span className="flex h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
              Secure Evaluation Protocol Activated
            </div>
          </div>
        </div>

        <nav className="hidden lg:flex items-center gap-8">
          <button 
            onClick={() => setView('landing')}
            className={cn("text-[11px] font-mono font-bold uppercase tracking-widest transition-all hover:text-white", view === 'landing' ? "text-white border-b-2 border-blue-500 pb-1" : "text-zinc-500")}
          >
            Terminal
          </button>
          <button 
            onClick={() => setView('arena')}
            className={cn("text-[11px] font-mono font-bold uppercase tracking-widest transition-all hover:text-white", view === 'arena' ? "text-white border-b-2 border-blue-500 pb-1" : "text-zinc-500")}
          >
            Arena
          </button>
          <button 
            onClick={() => setView('history')}
            className={cn("text-[11px] font-mono font-bold uppercase tracking-widest transition-all hover:text-white", view === 'history' ? "text-white border-b-2 border-blue-500 pb-1" : "text-zinc-500")}
          >
            Archive
          </button>
        </nav>

        <div className="flex items-center gap-6">
          {user ? (
            <div className="flex items-center gap-4 border-l border-zinc-800 pl-6">
              <div className="text-right hidden sm:block">
                <p className="text-[11px] font-bold text-white uppercase tracking-wider">{user.displayName}</p>
                <p className="text-[9px] text-zinc-500 font-mono">AUTHORIZED PERSONNEL</p>
              </div>
              <button onClick={logout} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-rose-500 hover:border-rose-500/30 transition-all">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={loginWithGoogle}
              className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
            >
              <LogIn size={16} /> AUTHENTICATE
            </button>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-8 py-16">
        <AnimatePresence mode="wait">
          {view === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid lg:grid-cols-5 gap-16 items-center"
            >
              {/* Hero Left */}
              <div className="lg:col-span-3 space-y-10">
                <div className="space-y-6">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] font-mono tracking-widest uppercase"
                  >
                    <Activity size={12} className="text-blue-500" /> System Ready // Cluster: Asia-Southeast-1
                  </motion.div>
                  <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] text-white italic">
                    BENCHMARK <br/>
                    <span className="text-zinc-800 text-outline-1">WITHOUT</span> <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500">MERCY.</span>
                  </h2>
                  <p className="text-zinc-500 text-xl max-w-xl leading-relaxed font-light">
                    An iron-clad evaluation architecture powered by specialized neuro-personas. Detect bias, verify logic, and find the winner objectively.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <div className="px-6 py-4 rounded-2xl bg-zinc-950 border border-zinc-900 flex items-center gap-4 group hover:border-blue-500/30 transition-all">
                    <div className="text-3xl font-mono font-bold text-zinc-800 group-hover:text-blue-500 transition-colors">01</div>
                    <div>
                      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Methodology</p>
                      <p className="text-sm font-bold text-zinc-400">Persona Analysis</p>
                    </div>
                  </div>
                  <div className="px-6 py-4 rounded-2xl bg-zinc-950 border border-zinc-900 flex items-center gap-4 group hover:border-emerald-500/30 transition-all">
                    <div className="text-3xl font-mono font-bold text-zinc-800 group-hover:text-emerald-500 transition-colors">02</div>
                    <div>
                      <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Consistency</p>
                      <p className="text-sm font-bold text-zinc-400">Cross-Referencing</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Right */}
              <div className="lg:col-span-2">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-black/40 border border-zinc-800 p-1 rounded-[2rem] shadow-2xl relative group"
                >
                  <div className="absolute inset-0 bg-blue-500/5 blur-[40px] -z-10 group-hover:bg-blue-500/10 transition-colors" />
                  
                  <div className="bg-zinc-900/80 backdrop-blur-md rounded-[1.8rem] overflow-hidden">
                    <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal size={14} className="text-blue-500" />
                        <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Command Interface</span>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                      </div>
                    </div>

                    <div className="p-8 space-y-6">
                      <div className="space-y-4">
                        <label className="text-[10px] font-mono font-bold text-zinc-600 uppercase tracking-widest">System Prompt</label>
                        <textarea 
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          placeholder="What would you like the tribunal to analyze today? Enter a complex task or query..."
                          className="w-full h-48 bg-black/40 border border-zinc-800 rounded-2xl p-4 text-zinc-300 placeholder:text-zinc-800 focus:border-blue-500/50 outline-none transition-all resize-none shadow-inner"
                        />
                      </div>

                      <button 
                        disabled={!prompt.trim() || loading || !user}
                        onClick={handleStartSession}
                        className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm tracking-tighter uppercase flex items-center justify-center gap-3 hover:bg-zinc-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                      >
                        {loading ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                        Initiate Protocol
                      </button>

                      <p className="text-[9px] text-zinc-600 text-center font-mono uppercase tracking-[0.2em] pt-2">
                        Requires Authorization Level 4
                      </p>
                    </div>
                  </div>
                </motion.div>
                
                {!user && (
                    <motion.div 
                      key="auth-required"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10"
                    >
                        <AlertCircle className="text-amber-500" size={18} />
                        <p className="text-xs text-amber-500/80 font-medium italic">Identification required. Please sign in to proceed.</p>
                    </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'arena' && (
            <motion.div 
              key="arena"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {currentSession ? (
                <>
                  {/* Arena Header */}
                  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 border-b border-zinc-800">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-mono font-bold tracking-widest uppercase border",
                          loading ? "bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        )}>
                          <span className="flex items-center gap-2">
                            <Layers size={10} /> Status: {loading ? "Active Evaluation" : "Analysis Complete"}
                          </span>
                        </div>
                        <span className="text-zinc-600 font-mono text-[9px]">DOC_ID: {currentSession.id}</span>
                      </div>
                      <h2 className="text-4xl font-black text-white italic tracking-tighter leading-tight max-w-4xl">{currentSession.prompt}</h2>
                    </div>

                    {loading && (
                      <div className="w-full lg:w-80 space-y-3">
                        <div className="flex justify-between text-[10px] font-mono text-zinc-500 px-1 uppercase tracking-widest font-bold">
                          <span>Neutralizing Bias</span>
                          <span>{evaluationProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden shadow-inner">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${evaluationProgress}%` }}
                            className="h-full bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-500 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                          />
                        </div>
                        <p className="text-[10px] text-zinc-600 italic font-mono text-center">Consulting Tribunal Personas...</p>
                      </div>
                    )}
                  </div>

                  {/* High Level Verdict */}
                  <VerdictDisplay winner={winner} responses={responses} />

                  {/* Agents Comparison Grid */}
                  <div className="grid lg:grid-cols-2 gap-12 pt-8">
                    {responses.map((res, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.2 }}
                        key={res.id} 
                        className={cn(
                          "flex flex-col rounded-[2.5rem] border transition-all overflow-hidden bg-zinc-950/40 relative",
                          winner?.id === res.id ? "border-blue-500/30 ring-1 ring-blue-500/10" : "border-zinc-800"
                        )}
                      >
                        {winner?.id === res.id && (
                          <div className="absolute top-0 right-0 p-8 text-blue-500 opacity-20 pointer-events-none">
                            <Trophy size={120} strokeWidth={1} />
                          </div>
                        )}

                        <div className="p-8 border-b border-zinc-900 bg-zinc-900/20 flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-lg border-2 shadow-lg",
                              idx === 0 ? "bg-blue-600/10 text-blue-400 border-blue-500/20" : 
                              idx === 1 ? "bg-rose-600/10 text-rose-400 border-rose-500/20" :
                              idx === 2 ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/20" :
                              idx === 3 ? "bg-amber-600/10 text-amber-400 border-amber-500/20" :
                              "bg-purple-600/10 text-purple-400 border-purple-500/20"
                            )}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <div>
                              <h3 className="font-mono font-black text-md text-white uppercase tracking-tighter">{res.modelId}</h3>
                              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-mono">Cognitive Matrix Agent</p>
                            </div>
                          </div>
                          <div className="text-right">
                             <div className="text-3xl font-mono font-black text-white italic tracking-tighter">
                                {calculateFinalScore(res).toFixed(1)}
                             </div>
                             <div className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase">Bench Score</div>
                          </div>
                        </div>

                        <div className="p-8 prose prose-invert max-w-none text-zinc-400 font-light leading-relaxed min-h-[180px] bg-zinc-950/20">
                          {res.text}
                        </div>

                        {/* Sub-Tribunal Breakdowns */}
                        <div className="p-6 grid grid-cols-2 gap-4 bg-black/60 relative z-10">
                          {JUDGES.map((persona) => {
                            const eval_ = res.evaluations.find(e => e.judgeId === persona.id);
                            return (
                              <JudgeCard 
                                key={persona.id}
                                judgeId={persona.id}
                                score={eval_?.score}
                                justification={eval_?.justification}
                              />
                            );
                          })}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Deep Analytics Matrix */}
                  {!loading && responses.length >= 2 && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="grid lg:grid-cols-3 gap-8 pt-8"
                    >
                        <div className="lg:col-span-2">
                           <ConsensusMatrix responses={responses} />
                        </div>
                        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between">
                            <div className="space-y-8">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-blue-500 font-mono text-[10px] uppercase font-bold tracking-widest">
                                    <Activity size={14} /> Deviation Analysis
                                  </div>
                                  <h4 className="text-xl font-bold text-white tracking-tight">Tribunal Consensus</h4>
                                </div>
                                
                                <div className="space-y-6">
                                    {JUDGES.map(judge => {
                                        const scores = responses.map(r => r.evaluations.find(e => e.judgeId === judge.id)?.score || 0);
                                        const maxScore = Math.max(...scores);
                                        const minScore = Math.min(...scores);
                                        const diff = maxScore - minScore;
                                        const COLORS = ["bg-blue-500", "bg-rose-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];
                                        
                                        return (
                                            <div key={judge.id} className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-mono">
                                                   <span className="text-zinc-500 uppercase">{judge.name}</span>
                                                   <span className={cn("px-1.5 py-0.5 rounded text-[8px]", diff > 3 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500")}>
                                                       {diff > 3 ? "DISAGREEMENT" : "ALIGNED"}
                                                   </span>
                                                </div>
                                                <div className="h-1 bg-zinc-800 rounded-full flex gap-1 overflow-hidden">
                                                    {scores.map((s, sIdx) => (
                                                        <div 
                                                            key={sIdx} 
                                                            className={cn("h-full", COLORS[sIdx % COLORS.length])} 
                                                            style={{ width: `${s * 10 / scores.length}%` }} 
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            
                            <div className="mt-12 p-5 bg-black/40 border border-zinc-800 rounded-2xl">
                                <div className="flex items-center gap-3 mb-3">
                                    <Search size={16} className="text-zinc-500" />
                                    <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Bias Identified</span>
                                </div>
                                <p className="text-xs text-zinc-500 leading-relaxed italic">
                                    High consensus in logic persists, while clarity vectors show significant model departure.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-6">
                    <div className="p-8 rounded-full bg-zinc-900/50 border border-zinc-800">
                        <Terminal size={48} className="text-zinc-700" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-white">No Active Session</h3>
                        <p className="text-zinc-500 text-sm max-w-xs mx-auto">Return to terminal to initiate a new evaluation cluster.</p>
                    </div>
                    <button onClick={() => setView('landing')} className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest">
                        Return to Hub
                    </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-zinc-800">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-mono tracking-widest uppercase">
                    <History size={12} /> Archival Intelligence Vault
                  </div>
                  <h2 className="text-5xl font-black text-white tracking-tighter italic italic">THE VAULT.</h2>
                </div>
                <p className="text-zinc-500 max-w-sm text-sm font-light">Immutable records of past tribunals and performance benchmarks across the system lifetime.</p>
              </div>

              <div className="grid gap-6">
                {sessions.length === 0 ? (
                  <div className="text-center py-32 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-3xl">
                    <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest">Cold Storage Empty</p>
                  </div>
                ) : (
                  sessions.map((session, i) => (
                    <motion.div 
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => { setCurrentSession(session); setView('arena'); }}
                      className="group relative p-8 rounded-[2rem] border border-zinc-800 bg-zinc-900/20 hover:bg-zinc-900/40 hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 group-hover:scale-150 transition-transform" />
                            <h3 className="text-xl font-bold text-zinc-300 group-hover:text-white transition-colors tracking-tight">{session.prompt}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] font-bold">
                          <span>{session.createdAt?.toDate?.().toLocaleDateString() || "Unknown"}</span>
                          <span className="text-zinc-800">|</span>
                          <span>SIG: {session.id.slice(0, 12)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-mono font-black tracking-[0.2em] uppercase border transition-colors",
                          session.status === 'completed' ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500/10" : "bg-blue-500/5 border-blue-500/20 text-blue-500"
                        )}>
                          {session.status}
                        </div>
                        <div className="p-2 border border-zinc-800 rounded-xl group-hover:border-zinc-600 group-hover:bg-zinc-950 transition-all">
                             <ChevronRight className="text-zinc-600 group-hover:text-white" size={20} />
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Details */}
      <footer className="footer-details bottom-0 w-full px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-6 text-zinc-600 border-t border-zinc-900/50 mt-32 relative z-10 bg-black/40">
        <div className="flex items-center gap-8">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-700 font-bold">Latency</span>
                <span className="text-xs text-zinc-500">Avg 142ms</span>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-700 font-bold">Uptime</span>
                <span className="text-xs text-zinc-500">99.98%</span>
            </div>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-[0.4em] text-zinc-800 font-bold">
            © 2026 AI TRIBUNAL // CORE PROTOCOL V1.0.4
        </div>
        <div className="flex gap-4">
            <div className="w-8 h-1 bg-zinc-900 rounded-full" />
            <div className="w-8 h-1 bg-zinc-900 rounded-full" />
            <div className="w-8 h-1 bg-zinc-900 rounded-full" />
        </div>
      </footer>

      {/* Background Glow */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none -z-10 translate-y-1/2 opacity-50" />
    </div>
  );
}
