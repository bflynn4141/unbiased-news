'use client';

import { StoryVelocity } from '@/types/story';

interface VelocityIndicatorProps {
  velocity: StoryVelocity;
  score: number; // Now represents number of new articles
}

export function VelocityIndicator({ velocity, score }: VelocityIndicatorProps) {
  const getVelocityConfig = () => {
    switch (velocity) {
      case 'fast':
        return {
          label: '🔥 BREAKING',
          color: 'bg-red-500',
          animation: 'velocity-fast',
          description: `${score} new articles in last hour`,
        };
      case 'medium':
        return {
          label: '📈 Developing',
          color: 'bg-yellow-500',
          animation: 'velocity-medium',
          description: `${score} new articles today`,
        };
      case 'slow':
        return {
          label: '📰 Stable',
          color: 'bg-blue-400',
          animation: '',
          description: 'No major updates',
        };
    }
  };

  const config = getVelocityConfig();

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.animation}`}>
        <span className={`w-2 h-2 rounded-full ${config.color}`} />
        <span className="text-xs font-bold tracking-wide">{config.label}</span>
      </div>
      <span className="text-xs text-gray-500">{config.description}</span>
    </div>
  );
}
