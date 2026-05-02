import React from 'react';
import { motion } from 'motion/react';
import { Trophy, AlertTriangle, Target, Fingerprint, Cpu, Scale } from 'lucide-react';
import { ResponseData, JUDGES } from '../types';
import { cn } from '../lib/utils';

export const VerdictDisplay = ({ winner, responses }: { winner: ResponseData | null, responses: ResponseData[] }) => {
  if (!winner) return null;

  const avgScore = winner.evaluations.reduce((acc, curr) => acc + curr.score, 0) / winner.evaluations.length;
  const otherResponses = responses
    .filter(r => r.id !== winner.id)
    .map(r => ({
      ...r,
      avg: r.evaluations.length > 0 
        ? r.evaluations.reduce((acc, curr) => acc + curr.score, 0) / r.evaluations.length 
        : 0
    }))
    .sort((a, b) => b.avg - a.avg);
  
  const runnerUp = otherResponses[0];
  const margin = runnerUp ? avgScore - runnerUp.avg : 0;

  // Determine strengths
  const strengths = winner.evaluations
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(e => JUDGES.find(j => j.id === e.judgeId)?.name);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid md:grid-cols-3 gap-6"
    >
      {/* Primary Badge */}
      <div className="md:col-span-2 bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -mr-32 -mt-32" />
        
        <div className="flex items-start justify-between mb-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-500 font-mono text-[10px] tracking-widest uppercase">
              <Trophy size={14} /> Official Platform Verdict
            </div>
            <h3 className="text-4xl font-bold text-white tracking-tighter italic italic">
              {winner.modelId} <span className="text-zinc-600 font-light">Elected</span>
            </h3>
          </div>
          <div className="text-right">
            <p className="text-5xl font-mono font-bold text-white tracking-tighter">{avgScore.toFixed(1)}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Consolidated Index</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
            <Target size={18} className="text-blue-500 mb-2" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Precision</p>
            <p className="text-sm font-bold text-white">94.2%</p>
          </div>
          <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
            <Scale size={18} className="text-emerald-500 mb-2" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Stability</p>
            <p className="text-sm font-bold text-white">High</p>
          </div>
          <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
            <Fingerprint size={18} className="text-rose-500 mb-2" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Uniqueness</p>
            <p className="text-sm font-bold text-white">Authentic</p>
          </div>
          <div className="p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
            <Cpu size={18} className="text-amber-500 mb-2" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono mb-1">Response Latency</p>
            <p className="text-sm font-bold text-white">1.2s</p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
          <p className="text-xs text-blue-300 leading-relaxed italic">
            "Agent elected due to superior performance in {strengths.join(' and ')}. 
            Verification successful with a {margin.toFixed(1)} point margin over competitors."
          </p>
        </div>
      </div>

      {/* Analysis Panel */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div>
            <h4 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest mb-4">Risk Assessment</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Hallucination Risk</span>
                <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[15%]" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Bias Probability</span>
                <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[30%]" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Context Drift</span>
                <div className="w-24 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[10%]" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest mb-4">Top Judge Consensus</h4>
            <div className="flex -space-x-2">
              {winner.evaluations.sort((a,b) => b.score - a.score).slice(0,3).map((e, idx) => (
                <div 
                  key={idx}
                  className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-[10px] font-bold text-blue-400"
                >
                  {e.score}
                </div>
              ))}
              <div className="w-8 h-8 rounded-full bg-zinc-900 border-2 border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                +1
              </div>
            </div>
          </div>
        </div>

        <button className="w-full mt-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all flex items-center justify-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" /> Report Anomaly
        </button>
      </div>
    </motion.div>
  );
};
