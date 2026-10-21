import React from 'react';
import { CheckCircle2, Circle, Play, ListVideo } from 'lucide-react';
import type { PlaylistItem } from './types';

interface PlaylistDrawerProps {
  items: PlaylistItem[];
  activeVideoId: string;
  completedItemIds: string[];
  onSelectItem: (item: PlaylistItem) => void;
}

export const PlaylistDrawer: React.FC<PlaylistDrawerProps> = ({
  items,
  activeVideoId,
  completedItemIds,
  onSelectItem,
}) => {
  const completedSet = new Set(completedItemIds);
  const completedCount = items.filter(item => completedSet.has(item.id) || completedSet.has(item.videoId)).length;

  return (
    <div className="flex flex-col h-full bg-white border border-[#E0E7F2] rounded-2xl overflow-hidden shadow-2xs">
      <div className="p-3.5 border-b border-[#E0E7F2] bg-[#F4F7FC]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListVideo className="w-4 h-4 text-[#603DF5]" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#0B1B43]">
            Course Playlist
          </h4>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-[#603DF5] border border-purple-200">
          {completedCount} / {items.length} Done
        </span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-[#E0E7F2]/60 p-2 space-y-1">
        {items.map((item, index) => {
          const isActive = item.videoId === activeVideoId;
          const isDone = completedSet.has(item.id) || completedSet.has(item.videoId);

          return (
            <button
              key={item.id || item.videoId}
              type="button"
              onClick={() => onSelectItem(item)}
              className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-all cursor-pointer ${
                isActive
                  ? 'bg-purple-50/80 text-[#603DF5] border border-purple-200 font-semibold shadow-2xs'
                  : 'hover:bg-[#F4F7FC] text-[#405B8B] hover:text-[#0B1B43]'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : isActive ? (
                  <Play className="w-4 h-4 text-[#603DF5] fill-[#603DF5]" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-mono font-medium text-[#405B8B]">
                    #{index + 1}
                  </span>
                  {item.durationMinutes > 0 && (
                    <span className="text-[10px] text-[#405B8B]">
                      • {item.durationMinutes}m
                    </span>
                  )}
                </div>
                <p className="text-xs leading-snug truncate">
                  {item.title}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
