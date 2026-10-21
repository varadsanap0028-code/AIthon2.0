import React, { useState, useEffect, useCallback } from 'react';
import { ExternalLink, CheckCircle2, Award } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { YouTubeIframe } from './YouTubeIframe';
import { PlaylistDrawer } from './PlaylistDrawer';
import type { LearningResource, PlaylistItem, ProgressUpdatePayload } from './types';
import { apiClient } from '../../services/apiClient';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: LearningResource | null;
  onProgressUpdate: (resourceId: string, payload: ProgressUpdatePayload) => Promise<void>;
  onAddToPassport?: (resource: LearningResource) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  resource,
  onProgressUpdate,
  onAddToPassport,
}) => {
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string>('');
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [progressStatus, setProgressStatus] = useState<string>('not_started');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  useEffect(() => {
    if (!resource) return;

    setProgressStatus(resource.progressStatus || 'not_started');
    setCompletedIds(resource.completedItemIds || []);

    if (resource.resourceType === 'playlist') {
      apiClient
        .get<{ success: boolean; data: PlaylistItem[] }>(`/api/resources/${resource.id}/playlist`)
        .then((res) => {
          if (res?.data && res.data.length > 0) {
            setPlaylistItems(res.data);
            const savedItem = res.data.find(i => (resource.completedItemIds || []).includes(i.id));
            const lastActive = savedItem || res.data[0];
            setActiveVideoId(lastActive.videoId);
          }
        })
        .catch(() => {
          if (resource.youtubeVideoId) setActiveVideoId(resource.youtubeVideoId);
        });
    } else if (resource.youtubeVideoId) {
      setActiveVideoId(resource.youtubeVideoId);
    }
  }, [resource]);

  const handlePlay = useCallback(() => {
    if (!resource) return;
    if (progressStatus === 'not_started') {
      setProgressStatus('in_progress');
      onProgressUpdate(resource.id, {
        status: 'in_progress',
        percentComplete: 25,
      });
    }
  }, [resource, progressStatus, onProgressUpdate]);

  const handlePause = useCallback((seconds: number) => {
    if (!resource) return;
    onProgressUpdate(resource.id, {
      status: 'in_progress',
      lastPositionSeconds: Math.floor(seconds),
    });
  }, [resource, onProgressUpdate]);

  const markCompleted = useCallback(async () => {
    if (!resource) return;
    setIsUpdating(true);
    try {
      setProgressStatus('completed');
      let newCompleted = [...completedIds];
      if (activeVideoId && !newCompleted.includes(activeVideoId)) {
        newCompleted.push(activeVideoId);
        setCompletedIds(newCompleted);
      }
      await onProgressUpdate(resource.id, {
        status: 'completed',
        percentComplete: 100,
        completedItemIds: newCompleted,
      });
    } finally {
      setIsUpdating(false);
    }
  }, [resource, activeVideoId, completedIds, onProgressUpdate]);

  const handleNearEnd = useCallback(() => {
    if (progressStatus !== 'completed') {
      markCompleted();
    }
  }, [progressStatus, markCompleted]);

  const handleEnded = useCallback(() => {
    markCompleted();
    if (playlistItems.length > 0) {
      const currentIndex = playlistItems.findIndex(i => i.videoId === activeVideoId);
      if (currentIndex >= 0 && currentIndex < playlistItems.length - 1) {
        setActiveVideoId(playlistItems[currentIndex + 1].videoId);
      }
    }
  }, [markCompleted, playlistItems, activeVideoId]);

  if (!isOpen || !resource) return null;

  const isPlaylist = resource.resourceType === 'playlist' && playlistItems.length > 0;
  const youtubeUrl = activeVideoId
    ? `https://www.youtube.com/watch?v=${activeVideoId}`
    : resource.url;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resource.title}
      subtitle={resource.channelName || resource.provider}
      maxWidth="5xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                progressStatus === 'completed'
                  ? 'success'
                  : progressStatus === 'in_progress'
                  ? 'warning'
                  : 'gray'
              }
              className="capitalize text-xs font-semibold"
            >
              {progressStatus.replace('_', ' ')}
            </Badge>
            {resource.duration && (
              <span className="text-xs text-[#405B8B] font-medium">
                • {resource.duration}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E0E7F2] bg-white hover:bg-slate-50 text-[#0B1B43] text-xs font-semibold shadow-2xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#405B8B]" />
              Open on YouTube
            </a>
            {onAddToPassport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddToPassport(resource)}
                className="flex items-center gap-1.5 text-xs text-[#603DF5] border-purple-200 hover:bg-purple-50"
              >
                <Award className="w-3.5 h-3.5 text-[#603DF5]" />
                Add to Passport
              </Button>
            )}
            <Button
              variant={progressStatus === 'completed' ? 'outline' : 'purple'}
              size="sm"
              disabled={isUpdating}
              onClick={markCompleted}
              className="flex items-center gap-1.5 text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {progressStatus === 'completed' ? 'Completed' : 'Mark Completed'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className={`grid gap-4 ${isPlaylist ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1'}`}>
          <div className={isPlaylist ? 'lg:col-span-2' : ''}>
            <YouTubeIframe
              key={activeVideoId}
              videoId={activeVideoId}
              initialSeconds={resource.lastPositionSeconds || 0}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onNearEnd={handleNearEnd}
              title={resource.title}
            />
          </div>

          {isPlaylist && (
            <div className="h-[360px] lg:h-full min-h-[300px]">
              <PlaylistDrawer
                items={playlistItems}
                activeVideoId={activeVideoId}
                completedItemIds={completedIds}
                onSelectItem={(item) => setActiveVideoId(item.videoId)}
              />
            </div>
          )}
        </div>

        {resource.description && (
          <div className="p-3.5 rounded-xl bg-[#F4F7FC] border border-[#E0E7F2] text-[#405B8B] text-xs leading-relaxed">
            <p>{resource.description}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
