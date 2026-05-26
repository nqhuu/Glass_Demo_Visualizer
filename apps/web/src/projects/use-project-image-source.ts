import { useCallback, useEffect, useState } from 'react';
import { logSafeUiError } from '../utils/safe-log';
import { downloadProjectImageFile, resolveProjectImageUrl } from './project-api';
import type { ProjectImage } from './project.types';

export type ProjectImageLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

// VI: Anh upload duoc fetch thanh blob bang JWT; token khong xuat hien trong URL trinh duyet.
export function useProjectImageSource(
  accessToken: string | null,
  image: ProjectImage | null,
  preferredPublicUrl: string | null,
): { sourceUrl: string | null; status: ProjectImageLoadStatus; retry: () => void } {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<ProjectImageLoadStatus>('idle');
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!image) {
      setSourceUrl(null);
      setStatus('idle');
      return;
    }

    if (image.sourceType !== 'uploaded') {
      const publicUrl = resolveProjectImageUrl(preferredPublicUrl);
      setSourceUrl(publicUrl);
      setStatus(publicUrl ? 'loaded' : 'idle');
      return;
    }

    if (!accessToken) {
      setSourceUrl(null);
      setStatus('error');
      return;
    }

    let active = true;
    let objectUrl: string | null = null;
    setSourceUrl(null);
    setStatus('loading');

    void downloadProjectImageFile(accessToken, image.projectId, image.id)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (!active) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setSourceUrl(objectUrl);
        setStatus('loaded');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        logSafeUiError('useProjectImageSource', 'loadProtectedImage', 'Protected image request failed.', error, {
          projectId: image.projectId,
          imageId: image.id,
        });
        setStatus('error');
      });

    return () => {
      active = false;
      // VI: URL blob duoc thu hoi de tranh giu bo nho khi doi anh hoac dong component.
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accessToken, attempt, image, preferredPublicUrl]);

  return { sourceUrl, status, retry };
}
