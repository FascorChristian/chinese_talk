import React, { useMemo } from 'react';
import { getPinyinChars, getToneColor } from '../../utils/pinyinUtils.js';

interface HanziWithPinyinProps {
  text: string;
  showPinyin: boolean;
  className?: string;
  onWordClick?: (char: string, pinyin: string) => void;
}

export const HanziWithPinyin: React.FC<HanziWithPinyinProps> = ({
  text,
  showPinyin,
  className = 'text-xl sm:text-2xl',
  onWordClick,
}) => {
  const chars = useMemo(() => getPinyinChars(text), [text]);

  return (
    <div className={`flex flex-wrap items-end gap-y-2 leading-relaxed tracking-normal select-text ${className}`}>
      {chars.map((item, idx) => {
        if (!item.isZh) {
          return (
            <span
              key={`non-zh-${idx}-${item.origin}`}
              className="inline-block text-slate-300 font-sans px-0.5 whitespace-pre"
            >
              {item.origin}
            </span>
          );
        }

        const toneColor = getToneColor(item.tone);

        return (
          <ruby
            key={`zh-${idx}-${item.origin}`}
            onClick={() => onWordClick?.(item.origin, item.pinyin)}
            className="group relative inline-flex flex-col-reverse items-center justify-end mx-[1.5px] cursor-pointer hover:bg-slate-800/40 rounded transition-colors px-0.5"
            title={`${item.origin} (${item.pinyin}) - Tono ${item.tone || 'Neutro'}`}
          >
            {/* Hanzi Character */}
            <span className="font-medium text-slate-100 group-hover:text-rose-300 transition-colors">
              {item.origin}
            </span>

            {/* Pinyin with tonal mark */}
            {showPinyin && (
              <rt
                className={`text-[11px] sm:text-xs font-semibold ${toneColor} transition-all font-mono tracking-tight pb-0.5`}
              >
                {item.pinyin || ' '}
              </rt>
            )}
          </ruby>
        );
      })}
    </div>
  );
};

