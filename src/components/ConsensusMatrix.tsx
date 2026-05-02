import React from 'react';
import { motion } from 'motion/react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { JUDGES, ResponseData } from '../types';

export const ConsensusMatrix = ({ responses }: { responses: ResponseData[] }) => {
  if (responses.length < 2) return null;

  // Prepare data for the comparison radar
  const radarData = JUDGES.map(judge => {
    const dataPoint: any = { subject: judge.name };
    responses.forEach(res => {
      const eval_ = res.evaluations.find(e => e.judgeId === judge.id);
      dataPoint[res.modelId] = eval_?.score || 0;
    });
    return dataPoint;
  });

  const COLORS = ["#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#a855f7"];

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight uppercase font-mono">Consensus Vector</h3>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Multidimensional Score Distribution</p>
        </div>
      </div>
      
      <div className="flex-grow min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke="#27272a" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10, fontWeight: 500 }} />
            {responses.map((res, idx) => (
              <Radar
                key={res.id}
                name={res.modelId}
                dataKey={res.modelId}
                stroke={COLORS[idx % COLORS.length]}
                fill={COLORS[idx % COLORS.length]}
                fillOpacity={0.2}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap justify-center gap-6">
        {responses.map((res, idx) => (
          <div key={res.id} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
            />
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">{res.modelId}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
