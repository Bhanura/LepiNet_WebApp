import Image from 'next/image';

type Props = {
  src: string;
  alt: string;
  authorName: string;
  objectFit?: 'cover' | 'contain';
};

export default function ProtectedImage({ src, alt, authorName, objectFit = 'cover' }: Props) {
  // We use the API route for the "Download" button to give them the watermarked version
  const downloadLink = `/api/watermark?url=${encodeURIComponent(src)}&author=${encodeURIComponent(authorName)}`;

  return (
    <div className="relative group w-full h-full flex items-center justify-center bg-black">
      {/* 1. The Image (Prevent right click) */}
      <div onContextMenu={(e) => e.preventDefault()} className="w-full h-full flex items-center justify-center">
        <img 
            src={src} 
            alt={alt} 
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '100%',
              width: objectFit === 'contain' ? 'auto' : '100%',
              height: objectFit === 'contain' ? 'auto' : '100%',
              objectFit: objectFit
            }}
            onError={(e) => {
              console.error('Image failed to load:', src);
              e.currentTarget.style.display = 'none';
            }}
        />
      </div>

      {/* 2. Visual Overlay (Always visible) */}
      <div className="absolute bottom-3 right-3 px-3 py-2 bg-black/70 text-white text-sm backdrop-blur-sm rounded-lg pointer-events-none shadow-lg border border-white/20">
        <div className="font-bold">LepiNet</div>
        <div className="text-xs opacity-90">© {authorName}</div>
      </div>

      {/* 3. Safe Download Button */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <a 
          href={downloadLink} 
          download={`lepinet-${authorName}.jpg`}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-lg flex items-center gap-2 transition-all hover:scale-105"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download with License
        </a>
      </div>
    </div>
  );
}