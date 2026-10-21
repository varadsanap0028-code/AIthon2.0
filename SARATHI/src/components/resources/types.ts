export type ResourceType = 'documentation' | 'handbook' | 'interactive' | 'video' | 'playlist';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';
export type SortOption = 'recommended' | 'newest' | 'shortest' | 'longest';
export type MainTab = 'all' | 'recommended' | 'in_progress' | 'completed' | 'bookmarked';

export interface PlaylistItem {
  id: string;
  position: number;
  videoId: string;
  title: string;
  durationMinutes: number;
}

export interface LearningResource {
  id: string;
  slug?: string;
  domain: string;
  skillTags: string[];
  title: string;
  provider: string;
  type: string;
  resourceType: ResourceType;
  source: 'web' | 'youtube';
  url: string;
  isFree: boolean;
  level: string;
  duration: string;
  durationMinutes?: number;
  language: string;
  description: string;
  learningObjectives?: string[];
  prerequisites?: string[];
  youtubeVideoId?: string | null;
  youtubePlaylistId?: string | null;
  channelName?: string | null;
  thumbnailUrl?: string | null;
  lastVerifiedAt?: string | null;
  isBookmarked: boolean;
  collectionName?: string;
  progressStatus: ProgressStatus;
  percentComplete?: number;
  lastPositionSeconds?: number;
  completedItemIds?: string[];
  progressNotes?: string;
  completedAt?: string | null;
  progressUpdatedAt?: string | null;
  isRecommended?: boolean;
  recommendationReason?: string;
  recommendationScore?: number;
  playlistItems?: PlaylistItem[];
}

export interface ProgressUpdatePayload {
  status: ProgressStatus;
  percentComplete?: number;
  lastPositionSeconds?: number;
  completedItemIds?: string[];
  notes?: string;
}

export interface ResourcePagination {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}
