export interface IVideoPlayVideo {
  id: string;
  title: string;
  src: string;
  subtitleSrc?: string;
  duration: number;
  progress?: {
    position: number;
    completed: boolean;
  } | null;
}