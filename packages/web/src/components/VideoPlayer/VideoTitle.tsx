export interface VideoTitleProps {
  title: string;
  isVisible: boolean;
}

export default function VideoTitle({ title, isVisible }: VideoTitleProps) {
  return (
    <div
      className={`absolute top-0 left-0 right-0 p-6 transition-opacity duration-500 pointer-events-none z-20 ${isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      style={{
        background: 'linear-gradient(rgba(0,0,0,0.6), transparent)'
      }}
    >
      <h1 className="text-sm md:text-base font-semibold text-white/90 drop-shadow-md truncate max-w-[80%]">
        {title}
      </h1>
    </div>
  );
}
