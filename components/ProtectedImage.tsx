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

      {/* 2. Visual Overlay (Always visible or on hover) */}
      <div className="absolute bottom-0 right-0 p-2 bg-black/50 text-white text-xs backdrop-blur-sm rounded-tl-lg pointer-events-none">
        © {authorName} | LepiNet
      </div>

      {/* 3. Safe Download Button */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <a 
          href={downloadLink} 
          download={`lepinet-${authorName}.jpg`}
          className="bg-white/90 hover:bg-white text-black text-xs font-bold py-1 px-3 rounded-full shadow-sm flex items-center gap-1"
        >
          ⬇ Save w/ License
        </a>
      </div>
    </div>
  );
}