import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/common/Button';
import { apiClient } from '../../services/apiClient';
import { useStudent } from '../../context/StudentContext';
import type {
  LearningResource,
  ProgressUpdatePayload,
  ResourcePagination,
  SortOption,
  MainTab,
} from '../../components/resources/types';
import { ResourceCard } from '../../components/resources/ResourceCard';
import { ResourceFilters } from '../../components/resources/ResourceFilters';
import { ResourceStats } from '../../components/resources/ResourceStats';
import { ResourceTabs } from '../../components/resources/ResourceTabs';
import { VideoPlayerModal } from '../../components/resources/VideoPlayerModal';
import { ResourceDetailModal } from '../../components/resources/ResourceDetailModal';
import { PassportModal } from '../../components/resources/PassportModal';

export const ResourcesPage: React.FC = () => {
  const { targetRole, targetDomain } = useStudent();

  const [resources, setResources] = useState<LearningResource[]>([]);
  const [pagination, setPagination] = useState<ResourcePagination>({
    page: 1,
    pageSize: 12,
    totalCount: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Filters
  const [activeTab, setActiveTab] = useState<MainTab>('all');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [freeOnly, setFreeOnly] = useState<boolean>(false);

  // Modals
  const [videoModalResource, setVideoModalResource] = useState<LearningResource | null>(null);
  const [detailModalResource, setDetailModalResource] = useState<LearningResource | null>(null);
  const [passportModalResource, setPassportModalResource] = useState<LearningResource | null>(null);

  const fetchResources = useCallback(async (pageToLoad = 1, append = false) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);

    try {
      if (activeTab === 'recommended') {
        const qp = new URLSearchParams();
        if (targetRole) qp.append('targetRole', targetRole);
        if (targetDomain) qp.append('domainId', targetDomain);

        const res = await apiClient.get<{ success: boolean; data: LearningResource[] }>(
          `/api/resources/recommendations?${qp.toString()}`
        );
        if (res?.data) {
          setResources(res.data);
          setPagination({ page: 1, pageSize: res.data.length, totalCount: res.data.length, totalPages: 1, hasMore: false });
        }
      } else {
        const qp = new URLSearchParams();
        qp.append('page', String(pageToLoad));
        qp.append('pageSize', '12');
        qp.append('sort', sortBy);
        if (selectedDomain !== 'all') qp.append('domain', selectedDomain);
        if (selectedLevel !== 'all') qp.append('level', selectedLevel);
        if (selectedFormat !== 'all') qp.append('format', selectedFormat);
        if (searchQuery.trim()) qp.append('q', searchQuery.trim());
        if (freeOnly) qp.append('free', 'true');
        if (activeTab === 'in_progress') qp.append('status', 'in_progress');
        else if (activeTab === 'completed') qp.append('status', 'completed');
        else if (activeTab === 'bookmarked') qp.append('bookmarkedOnly', 'true');

        const res = await apiClient.get<{
          success: boolean;
          data: LearningResource[];
          pagination: ResourcePagination;
          totalCount: number;
        }>(`/api/resources?${qp.toString()}`);

        if (res?.data) {
          setResources(prev => (append ? [...prev, ...res.data] : res.data));
          setPagination(res.pagination || {
            page: pageToLoad,
            pageSize: 12,
            totalCount: res.totalCount || res.data.length,
            totalPages: Math.ceil((res.totalCount || res.data.length) / 12) || 1,
            hasMore: res.data.length === 12,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch resources:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [activeTab, selectedFormat, selectedDomain, selectedLevel, searchQuery, sortBy, freeOnly, targetRole, targetDomain]);

  useEffect(() => {
    fetchResources(1, false);
  }, [fetchResources]);

  const stats = useMemo(() => {
    return {
      inProgressCount: resources.filter(r => r.progressStatus === 'in_progress').length,
      completedCount: resources.filter(r => r.progressStatus === 'completed').length,
      bookmarkedCount: resources.filter(r => r.isBookmarked).length,
    };
  }, [resources]);

  const handleToggleBookmark = async (resource: LearningResource) => {
    const nextBookmarked = !resource.isBookmarked;
    setResources(prev => prev.map(r => (r.id === resource.id ? { ...r, isBookmarked: nextBookmarked } : r)));
    try {
      await apiClient.post(`/api/resources/${resource.id}/bookmark`, { collectionName: 'my_list' });
    } catch {
      setResources(prev => prev.map(r => (r.id === resource.id ? { ...r, isBookmarked: resource.isBookmarked } : r)));
    }
  };

  const handleProgressUpdate = async (resourceId: string, payload: ProgressUpdatePayload) => {
    setResources(prev =>
      prev.map(r => (r.id === resourceId ? { ...r, progressStatus: payload.status, percentComplete: payload.percentComplete ?? r.percentComplete, lastPositionSeconds: payload.lastPositionSeconds ?? r.lastPositionSeconds, completedItemIds: payload.completedItemIds ?? r.completedItemIds } : r))
    );
    await apiClient.post(`/api/resources/${resourceId}/progress`, payload);
  };

  const handleConfirmAddToPassport = async (resourceId: string) => {
    const res = await apiClient.post<{ success: boolean; message: string }>(`/api/resources/${resourceId}/add-to-passport`, {});
    return res?.message || 'Evidence successfully added to your Skill Passport.';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 px-4 sm:px-6">
      <PageHeader
        title="Learning Library"
        description="Comprehensive technical catalog of free official docs, interactive labs, and verified YouTube courses with in-app tracking."
      />

      <ResourceStats
        inProgressCount={stats.inProgressCount}
        completedCount={stats.completedCount}
        bookmarkedCount={stats.bookmarkedCount}
      />

      <ResourceTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab !== 'recommended' && (
        <ResourceFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedFormat={selectedFormat}
          onFormatChange={setSelectedFormat}
          selectedDomain={selectedDomain}
          onDomainChange={setSelectedDomain}
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
          sortBy={sortBy}
          onSortChange={setSortBy}
          freeOnly={freeOnly}
          onFreeOnlyChange={setFreeOnly}
        />
      )}

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#405B8B]">
          <div className="w-8 h-8 border-2 border-[#603DF5] border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-medium">Loading catalog resources...</p>
        </div>
      ) : resources.length === 0 ? (
        <EmptyState
          title="No resources found"
          description="Try broadening your search query or adjusting your format and domain filters."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFormat('all');
                setSelectedDomain('all');
                setSelectedLevel('all');
                setSearchQuery('');
                setFreeOnly(false);
              }}
            >
              Clear all filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-[#405B8B] px-1 font-medium">
            <span>
              Showing <strong className="text-[#0B1B43] font-bold">{resources.length}</strong> of{' '}
              <strong className="text-[#0B1B43] font-bold">{pagination.totalCount || resources.length}</strong> resources
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map(r => (
              <ResourceCard
                key={r.id}
                resource={r}
                onOpenVideo={setVideoModalResource}
                onOpenDetail={setDetailModalResource}
                onToggleBookmark={handleToggleBookmark}
                onAddToPassport={setPassportModalResource}
              />
            ))}
          </div>

          {pagination.hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="md"
                disabled={isLoadingMore}
                onClick={() => fetchResources(pagination.page + 1, true)}
                className="px-6 text-xs text-[#0B1B43] hover:text-[#603DF5] border-[#E0E7F2] font-semibold"
              >
                {isLoadingMore ? 'Loading more resources...' : 'Load More Resources'}
              </Button>
            </div>
          )}
        </div>
      )}

      <VideoPlayerModal
        isOpen={Boolean(videoModalResource)}
        onClose={() => setVideoModalResource(null)}
        resource={videoModalResource}
        onProgressUpdate={handleProgressUpdate}
        onAddToPassport={setPassportModalResource}
      />

      <ResourceDetailModal
        isOpen={Boolean(detailModalResource)}
        onClose={() => setDetailModalResource(null)}
        resource={detailModalResource}
      />

      <PassportModal
        isOpen={Boolean(passportModalResource)}
        onClose={() => setPassportModalResource(null)}
        resource={passportModalResource}
        onConfirmAdd={handleConfirmAddToPassport}
      />
    </div>
  );
};
export default ResourcesPage;
