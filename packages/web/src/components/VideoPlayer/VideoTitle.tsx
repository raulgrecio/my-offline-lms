export interface VideoTitleProps {
  title: string;
  isVisible: boolean;
}

export default function VideoTitle({ title, isVisible }: VideoTitleProps) {
  return (
    <div
      className={`absolute top-0 left-0 right-0 p-6 transition-opacity duration-500 pointer-events-none z-20 bg-gradient-to-b from-black/60 to-transparent ${isVisible ? 'opacity-100' : 'opacity-0'}`}
    >
      <h1 className="text-sm md:text-base font-semibold text-white/90 drop-shadow-md truncate max-w-[80%]">
        {title}
      </h1>
    </div>
  );
}
