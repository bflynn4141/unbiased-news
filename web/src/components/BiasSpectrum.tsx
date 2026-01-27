'use client';

interface BiasSpectrumProps {
  coverageBalance: {
    left: number;
    center: number;
    right: number;
  };
}

export function BiasSpectrum({ coverageBalance }: BiasSpectrumProps) {
  const total = coverageBalance.left + coverageBalance.center + coverageBalance.right;
  const leftPct = Math.round((coverageBalance.left / total) * 100);
  const centerPct = Math.round((coverageBalance.center / total) * 100);
  const rightPct = Math.round((coverageBalance.right / total) * 100);

  return (
    <div className="w-full">
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-bold">Coverage Balance</span>
      </div>

      {/* Spectrum bar */}
      <div className="flex h-3 w-full rounded-full overflow-hidden border-2 border-black">
        <div
          className="bg-gray-300 transition-all"
          style={{ width: `${leftPct}%` }}
          title={`Left: ${leftPct}%`}
        />
        <div
          className="bg-gray-500 transition-all"
          style={{ width: `${centerPct}%` }}
          title={`Center: ${centerPct}%`}
        />
        <div
          className="bg-black transition-all"
          style={{ width: `${rightPct}%` }}
          title={`Right: ${rightPct}%`}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[10px] mt-1 text-gray-600">
        <span>← Left ({leftPct}%)</span>
        <span>Center ({centerPct}%)</span>
        <span>Right ({rightPct}%) →</span>
      </div>
    </div>
  );
}
