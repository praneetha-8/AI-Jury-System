import React from 'react';
import { motion } from 'motion/react';
import { Scale, Search, ShieldAlert, HeartHandshake, User, Trophy, BarChart3, Gavel } from 'lucide-react';
import { JUDGES, JudgeId } from '../types';
import { cn } from '../lib/utils';

const iconMap = {
  Scale,
  Search,
  ShieldAlert,
  HeartHandshake
};

export const JudgeCard = ({ 
  judgeId, 
  score, 
  justification, 
  delay = 0 
}: { 
  key?: string | number;
  judgeId: JudgeId; 
  score?: number; 
  justification?: string;
  delay?: number;
}) => {
  const persona = JUDGES.find(j => j.id === judgeId)!;
  const Icon = iconMap[persona.icon as keyof typeof iconMap];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.4 }}
      className={cn(
        "p-4 border border-zinc-800 rounded-lg bg-zinc-900/50 flex flex-col gap-2 relative overflow-hidden group",
        score ? "border-opacity-100" : "opacity-50"
      )}
    >
      <div className={cn(
        "absolute top-0 right-0 w-16 h-16 -mr-8 -mt-8 rounded-full blur-2xl opacity-20",
        persona.color === 'blue' && "bg-blue-500",
        persona.color === 'emerald' && "bg-emerald-500",
        persona.color === 'rose' && "bg-rose-500",
        persona.color === 'amber' && "bg-amber-500"
      )} />

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-md",
            persona.color === 'blue' && "bg-blue-500/10 text-blue-400",
            persona.color === 'emerald' && "bg-emerald-500/10 text-emerald-400",
            persona.color === 'rose' && "bg-rose-500/10 text-rose-400",
            persona.color === 'amber' && "bg-amber-500/10 text-amber-400"
          )}>
            <Icon size={18} />
          </div>
          <span className="text-xs font-mono font-medium text-zinc-400 tracking-wider uppercase">
            {persona.name}
          </span>
        </div>
        {score !== undefined && (
          <div className="text-xl font-mono font-bold text-white">
            {score.toFixed(1)}
          </div>
        )}
      </div>

      <p className="text-sm text-zinc-300 line-clamp-3 italic">
        {justification || "Awaiting evaluation..."}
      </p>
    </motion.div>
  );
};
