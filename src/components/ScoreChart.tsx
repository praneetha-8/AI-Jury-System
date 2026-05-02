import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';

type Score = {
  name: string;
  score: number;
  color: string;
};

export const ScoreChart = ({ scores }: { scores: Score[] }) => {
  
  // ✅ Prevent crash if no data
  if (!scores || scores.length === 0) {
    return (
      <div className="w-full mt-4 text-center text-zinc-500 text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full mt-4" style={{ minHeight: 300 }}>
      
      {/* ✅ Fixed height to avoid Recharts crash */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart 
          data={scores} 
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#27272a" 
          />

          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#71717a', fontSize: 12 }}
            dy={10}
          />

          <YAxis 
            domain={[0, 10]} 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#71717a', fontSize: 12 }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '8px'
            }}
            itemStyle={{ color: '#fff' }}
            cursor={{ fill: '#27272a' }}
          />

          <Bar 
            dataKey="score" 
            radius={[6, 6, 0, 0]} 
            barSize={40}
          >
            {scores.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>

        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
