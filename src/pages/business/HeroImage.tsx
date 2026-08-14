import { ArrowLeft, Heart, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeroImageProps {
  imageUrl?: string | null;
}

export default function HeroImage({ imageUrl }: HeroImageProps) {
  const navigate = useNavigate();

  return (
    <div className="w-full h-80 relative bg-gradient-to-br from-[#1F2C38] to-[#121A22]">
      {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}

      <button
        onClick={() => navigate(-1)}
        aria-label="Back"
        className="absolute top-4 left-4 size-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60"
      >
        <ArrowLeft size={18} />
      </button>

      <button
        aria-label="Favorite"
        className="absolute top-4 right-16 size-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60"
      >
        <Heart size={18} />
      </button>

      <button
        aria-label="Share"
        className="absolute top-4 right-4 size-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60"
      >
        <Share2 size={18} />
      </button>
    </div>
  );
}
