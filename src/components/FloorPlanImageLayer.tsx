import React, { useEffect, useRef, useState } from 'react';
import { Layer, Rect, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { apiRequest, getAuthToken, API_BASE } from '../api/client';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface FloorPlanImageLayerProps {
  src: string;
  canvasWidth: number;
  canvasHeight: number;
  mode?: 'blueprint' | 'clean';
  onLoad?: (dimensions?: { width: number; height: number; pageCount?: number; page?: number }) => void;
  onError?: () => void;
}

/**
 * Loads floor plan image data as a Blob with Bearer auth and session credentials.
 * Auth tokens are transmitted exclusively via Authorization headers, never exposed in URLs.
 */
export async function loadAuthenticatedFloorPlanBlob(
  src: string,
  signal?: AbortSignal
): Promise<Blob> {
  if (src.startsWith('/api') || src.startsWith(API_BASE)) {
    return apiRequest<Blob>(src, { signal });
  }

  const headers = new Headers();
  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(src, {
    headers,
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to load floor plan image: ${response.status} ${response.statusText}`);
  }

  return response.blob();
}

const getPdfPageFromSource = (src: string): number => {
  const match = src.match(/#page=(\d+)/i);
  return match ? Math.max(1, Number(match[1])) : 1;
};

async function renderPdfPage(blob: Blob, requestedPage: number): Promise<{
  image: HTMLImageElement;
  width: number;
  height: number;
  pageCount: number;
  page: number;
}> {
  const documentProxy = await getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const page = Math.min(Math.max(1, requestedPage), documentProxy.numPages);
  const pdfPage = await documentProxy.getPage(page);
  const viewport = pdfPage.getViewport({ scale: 1 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await pdfPage.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;

  const image = new (window.Image || Image)();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not render PDF floor plan'));
    image.src = canvas.toDataURL('image/png');
  });
  return { image, width: canvas.width, height: canvas.height, pageCount: documentProxy.numPages, page };
}

/**
 * Real AutoCAD floor plan (DWG) rendered as the canvas base layer.
 * The raster is drawn 1:1 on the floor canvas, so seat coordinates stay meaningful.
 * In blueprint mode the drawing is inverted to the dark CAD theme.
 */
export const FloorPlanImageLayer: React.FC<FloorPlanImageLayerProps> = ({
  src,
  canvasWidth,
  canvasHeight,
  mode = 'blueprint',
  onLoad,
  onError,
}) => {
  const isBlueprint = mode === 'blueprint';
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<Konva.Image | null>(null);

  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!src) {
      setImage(null);
      return;
    }

    const controller = new AbortController();
    let active = true;
    let currentObjectUrl: string | null = null;
    let img: HTMLImageElement | null = null;

    // Reset displayed image when switching sources to prevent displaying stale floor plan
    setImage(null);

    const loadImage = async () => {
      try {
        const blob = await loadAuthenticatedFloorPlanBlob(src, controller.signal);

        if (!active) {
          return;
        }

        const signature = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
        const isPdf = blob.type === 'application/pdf' || signature === '%PDF-';
        if (isPdf) {
          const rendered = await renderPdfPage(blob, getPdfPageFromSource(src));
          if (!active) return;
          setImage(rendered.image);
          onLoadRef.current?.({ width: rendered.width, height: rendered.height, pageCount: rendered.pageCount, page: rendered.page });
          return;
        }

        currentObjectUrl = URL.createObjectURL(blob);
        const loadedImage = new (window.Image || Image)();
        img = loadedImage;

        loadedImage.onload = () => {
          if (!active) {
            if (currentObjectUrl) {
              URL.revokeObjectURL(currentObjectUrl);
              currentObjectUrl = null;
            }
            return;
          }
          setImage(loadedImage);
          onLoadRef.current?.({ width: loadedImage.naturalWidth || loadedImage.width, height: loadedImage.naturalHeight || loadedImage.height });
        };

        loadedImage.onerror = () => {
          if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
          }
          if (!active) return;
          setImage(null);
          onErrorRef.current?.();
        };

        loadedImage.src = currentObjectUrl;
      } catch (err: any) {
        if (err?.name === 'AbortError' || controller.signal.aborted) {
          // Stale request aborted due to floor switch or unmount; ignore
          return;
        }
        if (!active) return;
        setImage(null);
        onErrorRef.current?.();
      }
    };

    void loadImage();

    return () => {
      active = false;
      controller.abort();
      if (img) {
        img.onload = null;
        img.onerror = null;
      }
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
      }
    };
  }, [src]);

  useEffect(() => {
    const node = imageRef.current;
    if (!node || !image) return;
    if (isBlueprint) {
      try {
        node.cache();
        node.filters([Konva.Filters.Invert]);
      } catch {
        // Fallback if node cannot be cached (e.g. 0-dimension or test env)
      }
    } else {
      try {
        node.filters([]);
        node.clearCache();
      } catch {}
    }
    node.getLayer()?.batchDraw();
  }, [isBlueprint, image]);

  return (
    <Layer listening={false}>
      <Rect
        x={0}
        y={0}
        width={canvasWidth}
        height={canvasHeight}
        fill={isBlueprint ? '#0b1220' : '#ffffff'}
      />
      {image && (
        <KonvaImage
          ref={imageRef}
          image={image}
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
        />
      )}
    </Layer>
  );
};
