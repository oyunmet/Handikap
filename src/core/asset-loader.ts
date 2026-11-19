import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

export interface AssetLoadProgress {
  url: string;
  loadedBytes: number;
  totalBytes: number | null;
  ratio: number | null;
}

export interface GlbAssetLoaderOptions {
  dracoDecoderPath?: string;
}

export interface GlbAssetLoader {
  load(url: string, onProgress?: (progress: AssetLoadProgress) => void): Promise<GLTF>;
  clear(): void;
  dispose(): void;
}

export function createGlbAssetLoader(options: GlbAssetLoaderOptions = {}): GlbAssetLoader {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const dracoLoader = options.dracoDecoderPath
    ? new DRACOLoader().setDecoderPath(options.dracoDecoderPath)
    : null;
  if (dracoLoader) loader.setDRACOLoader(dracoLoader);

  const requests = new Map<string, Promise<GLTF>>();
  return {
    load(url, onProgress) {
      const cached = requests.get(url);
      if (cached) return cached;

      const request = new Promise<GLTF>((resolve, reject) => {
        loader.load(
          url,
          resolve,
          (event) => {
            const totalBytes = event.lengthComputable && event.total > 0 ? event.total : null;
            onProgress?.({
              url,
              loadedBytes: event.loaded,
              totalBytes,
              ratio: totalBytes === null ? null : Math.min(1, event.loaded / totalBytes),
            });
          },
          reject,
        );
      });
      requests.set(url, request);
      void request.then(undefined, () => {
        if (requests.get(url) === request) requests.delete(url);
      });
      return request;
    },
    clear() {
      requests.clear();
    },
    dispose() {
      requests.clear();
      dracoLoader?.dispose();
    },
  };
}
