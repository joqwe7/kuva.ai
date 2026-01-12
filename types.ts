export interface HordeGenerationRequest {
  prompt: string;
  params: {
    sampler_name?: string;
    toggles?: number[];
    cfg_scale?: number;
    denoising_strength?: number;
    seed?: string;
    height?: number;
    width?: number;
    seed_variation?: number;
    post_processing?: string[];
    karras?: boolean;
    tiling?: boolean;
    hires_fix?: boolean;
    clip_skip?: number;
    control_type?: string;
    image_is_control?: boolean;
    return_control_map?: boolean;
    facefixer_strength?: number;
    steps?: number;
    n?: number;
  };
  nsfw?: boolean;
  trusted_workers?: boolean;
  slow_workers?: boolean;
  censor_nsfw?: boolean;
  workers?: string[];
  models?: string[];
  source_image?: string;
  source_processing?: string;
  source_mask?: string;
  r2?: boolean;
  shared?: boolean;
  replacement_filter?: boolean;
  dry_run?: boolean;
}

export interface HordeAsyncResponse {
  id: string;
  message?: string;
}

export interface HordeStatusResponse {
  finished: number;
  processing: number;
  restarted: number;
  waiting: number;
  done: boolean;
  faulted: boolean;
  wait_time: number;
  queue_position: number;
  kudos: number;
  is_possible: boolean;
  generations?: Array<{
    worker_id: string;
    worker_name: string;
    model: string;
    state: string;
    img: string; // URL or Base64
    seed: string;
    id: string;
    censored: boolean;
  }>;
}

export enum GenerationStatus {
  IDLE = 'IDLE',
  SUBMITTING = 'SUBMITTING',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Job {
  id: string;
  prompt: string;
  status: GenerationStatus;
  resultUrl?: string;
  createdAt: number;
  params: HordeGenerationRequest['params'];
  model: string;
}

export interface AppSettings {
  hordeApiKey: string;
}

export const DEFAULT_HORDE_API_KEY = "Gz6yGj7lwWzX9qz70rqyEA"; // Public anonymous key