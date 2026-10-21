import React from 'react';
import {
  Play,
  Bookmark,
  BookmarkCheck,
  Clock,
  Sparkles,
  Award,
  BookOpen,
  FileText,
  Terminal,
  ListVideo,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { ProgressBar } from '../common/ProgressBar';
import type { LearningResource } from './types';

interface ResourceCardProps {
  resource: LearningResource;
  onOpenVideo?: (resource: LearningResource) => void;
  onOpenDetail?: (resource: LearningResource) => void;
  onToggleBookmark: (resource: LearningResource) => void;
  onAddToPassport: (resource: LearningResource) => void;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({
  resource,
  onOpenVideo,
  onOpenDetail,
  onToggleBookmark,
  onAddToPassport,
}) => {
  const isVideoOrPlaylist = resource.resourceType === 'video' || resource.resourceType === 'playlist';

  const getFormatIcon = () => {
    switch (resource.resourceType) {
      case 'video':
        return <Play className="w-3.5 h-3.5 text-red-400" />;
      case 'playlist':
        return <ListVideo className="w-3.5 h-3.5 text-indigo-400" />;
      case 'interactive':
        return <Terminal className="w-3.5 h-3.5 text-emerald-400" />;
      case 'handbook':
        return <BookOpen className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <FileText className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const handleCardClick = () => {
    if (isVideoOrPlaylist && onOpenVideo) {
      onOpenVideo(resource);
    } else if (onOpenDetail) {
      onOpenDetail(resource);
    }
  };

  const banner = (() => {
    switch (resource.domain) {
      case 'dom-frontend':
        return {
          bg: 'bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-purple-50/80',
          badge: 'bg-white text-[#087BFA] border-blue-100 shadow-xs',
        };
      case 'dom-backend':
        return {
          bg: 'bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-cyan-50/80',
          badge: 'bg-white text-[#16A34A] border-emerald-100 shadow-xs',
        };
      case 'dom-aiml':
        return {
          bg: 'bg-gradient-to-br from-purple-50/90 via-pink-50/40 to-indigo-50/80',
          badge: 'bg-white text-[#603DF5] border-purple-100 shadow-xs',
        };
      case 'dom-clouddevops':
        return {
          bg: 'bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-yellow-50/80',
          badge: 'bg-white text-[#D97706] border-amber-100 shadow-xs',
        };
      case 'dom-cybersecurity':
        return {
          bg: 'bg-gradient-to-br from-rose-50/90 via-red-50/40 to-slate-50/80',
          badge: 'bg-white text-[#DC2626] border-rose-100 shadow-xs',
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/40',
          badge: 'bg-white text-[#603DF5] border-slate-200 shadow-xs',
        };
    }
  })();

  return (
    <Card className="flex flex-col h-full bg-white border border-[#E0E7F2] hover:border-[#603DF5]/40 transition-all duration-300 overflow-hidden shadow-xs hover:shadow-lg group">
      {/* Thumbnail or Header Banner */}
      <div
        className="relative w-full aspect-video bg-slate-100 overflow-hidden cursor-pointer border-b border-[#E0E7F2]"
        onClick={handleCardClick}
      >
        {resource.thumbnailUrl && isVideoOrPlaylist ? (
          <>
            <img
              src={resource.thumbnailUrl}
              alt={resource.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B1B43]/75 via-[#0B1B43]/15 to-transparent" />
          </>
        ) : (
          <div className={`w-full h-full ${banner.bg} flex items-center justify-center p-4 relative`}>
            <div className="p-3.5 rounded-2xl bg-white shadow-xs border border-[#E0E7F2] transform group-hover:scale-110 transition-transform duration-300 flex items-center justify-center">
              {resource.thumbnailUrl ? (
                <img
                  src={resource.thumbnailUrl}
                  alt={resource.title}
                  loading="lazy"
                  className="w-9 h-9 object-contain"
                />
              ) : (
                <BookOpen className="w-7 h-7 text-[#603DF5]" />
              )}
            </div>
          </div>
        )}

        {/* Video Play Overlay */}
        {isVideoOrPlaylist && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-11 h-11 rounded-full bg-[#603DF5]/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-[#603DF5] transition-all">
              <Play className="w-5 h-5 fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Format Badge Top Left */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 backdrop-blur-md border border-[#E0E7F2] text-[11px] font-semibold text-[#0B1B43] shadow-xs capitalize">
          {getFormatIcon()}
          <span>{resource.resourceType || resource.type}</span>
        </div>

        {/* Duration Badge Bottom Right */}
        {resource.duration && (
          <div
            className={`absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium shadow-xs ${
              resource.thumbnailUrl
                ? 'bg-[#0B1B43]/85 text-white backdrop-blur-xs'
                : 'bg-white/95 text-[#0B1B43] border border-[#E0E7F2]'
            }`}
          >
            <Clock className={`w-3 h-3 ${resource.thumbnailUrl ? 'text-slate-300' : 'text-[#405B8B]'}`} />
            <span>{resource.duration}</span>
          </div>
        )}

        {/* Bookmark Button Top Right */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(resource);
          }}
          title={resource.isBookmarked ? 'Remove bookmark' : 'Bookmark resource'}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/95 backdrop-blur-md hover:bg-white text-[#405B8B] hover:text-[#603DF5] transition-colors border border-[#E0E7F2] shadow-xs cursor-pointer"
        >
          {resource.isBookmarked ? (
            <BookmarkCheck className="w-4 h-4 text-[#603DF5] fill-[#603DF5]" />
          ) : (
            <Bookmark className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Recommendation Banner */}
          {resource.recommendationReason && (
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-900 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-600 fill-amber-500/20" />
              <span className="truncate">{resource.recommendationReason}</span>
            </div>
          )}

          {/* Provider / Channel & Level */}
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="truncate font-semibold text-[#405B8B]">
              {resource.channelName || resource.provider}
            </span>
            <Badge variant="gray" className="shrink-0 text-[10px] uppercase font-bold tracking-wider">
              {resource.level}
            </Badge>
          </div>

          {/* Title */}
          <h3
            onClick={handleCardClick}
            className="text-sm font-bold text-[#0B1B43] line-clamp-2 hover:text-[#603DF5] cursor-pointer transition-colors leading-snug"
          >
            {resource.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-[#405B8B] line-clamp-2 leading-relaxed">
            {resource.description}
          </p>

          {/* Skill Tags */}
          <div className="flex flex-wrap gap-1 pt-1">
            {resource.skillTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md bg-[#F4F7FC] border border-[#E0E7F2] text-[#405B8B] font-medium"
              >
                {tag}
              </span>
            ))}
            {resource.skillTags.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F4F7FC] border border-[#E0E7F2] text-[#405B8B]/70 font-medium">
                +{resource.skillTags.length - 3}
              </span>
            )}
          </div>
        </div>

        {/* Footer Area */}
        <div className="pt-3 border-t border-[#E0E7F2] space-y-2.5">
          {resource.progressStatus !== 'not_started' && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#405B8B] capitalize font-medium">
                  {resource.progressStatus.replace('_', ' ')}
                </span>
                <span className="font-bold text-[#0B1B43]">
                  {resource.percentComplete || 0}%
                </span>
              </div>
              <ProgressBar progress={resource.percentComplete || 0} size="sm" />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-1">
            {isVideoOrPlaylist ? (
              <Button
                variant="purple"
                size="sm"
                onClick={() => onOpenVideo?.(resource)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 font-semibold shadow-xs"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                {resource.progressStatus === 'completed'
                  ? 'Rewatch Video'
                  : resource.progressStatus === 'in_progress'
                  ? 'Resume Video'
                  : 'Watch Video'}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenDetail?.(resource)}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 font-semibold text-[#0B1B43] hover:text-[#603DF5] hover:border-[#603DF5]/30 border-[#E0E7F2]"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#405B8B]" />
                View Details
              </Button>
            )}

            {resource.progressStatus === 'completed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddToPassport(resource)}
                title="Add verified learning evidence to Skill Passport"
                className="px-2.5 text-[#603DF5] border-purple-200 hover:bg-purple-50"
              >
                <Award className="w-3.5 h-3.5 text-[#603DF5]" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
