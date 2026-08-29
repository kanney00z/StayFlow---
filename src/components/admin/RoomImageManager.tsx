import React, { useState, useRef } from 'react';
import { 
  Upload, Link as LinkIcon, Trash2, Star, Image as ImageIcon, 
  Sparkles, Check, Plus, AlertCircle, Eye
} from 'lucide-react';

interface RoomImageManagerProps {
  images: string[];
  onChangeImages: (images: string[]) => void;
  maxImages?: number;
}

const PRESET_ROOM_IMAGES = [
  {
    name: 'Modern King Bed',
    url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Cozy Twin Room',
    url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Luxury Suite Living',
    url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Minimal Studio',
    url: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Executive Bedroom',
    url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Balcony & Garden View',
    url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Modern Bathroom',
    url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80',
  },
  {
    name: 'Work Desk & Interior',
    url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
  },
];

export const RoomImageManager: React.FC<RoomImageManagerProps> = ({
  images,
  onChangeImages,
  maxImages = 10,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle local file selection / upload (converts to base64 Data URL)
  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      alert(`สามารถอัปโหลดรูปภาพได้สูงสุด ${maxImages} รูป`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    const newImages: string[] = [];

    let processedCount = 0;
    filesToProcess.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        processedCount++;
        return;
      }

      // Check file size (limit to ~4MB to keep localStorage healthy)
      if (file.size > 4 * 1024 * 1024) {
        alert(`ไฟล์ "${file.name}" มีขนาดใหญ่เกิน 4MB`);
        processedCount++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newImages.push(e.target.result as string);
        }
        processedCount++;
        if (processedCount === filesToProcess.length) {
          onChangeImages([...images, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle adding image via direct URL
  const handleAddUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    if (images.length >= maxImages) {
      setUrlError(`เพิ่มรูปได้สูงสุด ${maxImages} รูป`);
      return;
    }

    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('data:image')) {
      setUrlError('กรุณากรอก URL ที่ขึ้นต้นด้วย http:// หรือ https://');
      return;
    }

    onChangeImages([...images, trimmedUrl]);
    setUrlInput('');
    setUrlError('');
  };

  // Remove an image by index
  const handleRemoveImage = (indexToRemove: number) => {
    const updated = images.filter((_, idx) => idx !== indexToRemove);
    onChangeImages(updated);
  };

  // Set as primary cover photo (move to index 0)
  const handleSetAsCover = (indexToCover: number) => {
    if (indexToCover === 0) return;
    const target = images[indexToCover];
    const rest = images.filter((_, idx) => idx !== indexToCover);
    onChangeImages([target, ...rest]);
  };

  // Add preset image
  const handleAddPreset = (url: string) => {
    if (images.includes(url)) {
      alert('รูปนี้มีอยู่ในอัลบั้มแล้ว');
      return;
    }
    if (images.length >= maxImages) {
      alert(`สามารถเพิ่มได้สูงสุด ${maxImages} รูป`);
      return;
    }
    onChangeImages([...images, url]);
  };

  return (
    <div className="space-y-4">
      {/* Action Header & Upload Tabs */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          <span>รูปภาพห้องพัก ({images.length}/{maxImages})</span>
        </label>

        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{showPresets ? 'ซ่อนคลังรูปตัวอย่าง' : 'เลือกจากคลังรูปตัวอย่าง'}</span>
        </button>
      </div>

      {/* Preset Gallery Picker */}
      {showPresets && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="text-[11px] font-medium text-slate-600 flex justify-between items-center">
            <span>แตะรูปเพื่อเพิ่มเข้าสู่อัลบั้มห้องนี้:</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {PRESET_ROOM_IMAGES.map((preset, idx) => {
              const isAdded = images.includes(preset.url);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddPreset(preset.url)}
                  disabled={isAdded}
                  title={preset.name}
                  className={`group relative aspect-video rounded-lg overflow-hidden border transition-all cursor-pointer ${
                    isAdded ? 'border-emerald-500 opacity-60' : 'border-slate-200 hover:border-indigo-500 hover:scale-105'
                  }`}
                >
                  <img
                    src={preset.url}
                    alt={preset.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {isAdded && (
                    <div className="absolute inset-0 bg-emerald-900/60 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50'
            : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp, image/avif"
          multiple
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        <div className="flex flex-col items-center gap-1.5 py-1">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-800">
              คลิกเพื่อเลือกไฟล์รูปภาพจากเครื่อง
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              หรือลากไฟล์รูปภาพมาวางที่นี่ (PNG, JPG, WEBP ขนาดไม่เกิน 4MB)
            </span>
          </div>
        </div>
      </div>

      {/* Add by Image URL input */}
      <form onSubmit={handleAddUrl} className="space-y-1">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              placeholder="หรือวาง URL ลิงก์รูปภาพ เช่น https://..."
              value={urlInput}
              onChange={(e) => {
                setUrlInput(e.target.value);
                setUrlError('');
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={!urlInput.trim()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            เพิ่มรูป
          </button>
        </div>
        {urlError && (
          <p className="text-[11px] text-rose-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>{urlError}</span>
          </p>
        )}
      </form>

      {/* Uploaded Images Thumbnails Grid */}
      {images.length > 0 ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((imgUrl, index) => {
              const isCover = index === 0;
              return (
                <div
                  key={index}
                  className={`group relative rounded-xl overflow-hidden border bg-slate-100 transition-all ${
                    isCover ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200'
                  }`}
                >
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={imgUrl}
                      alt={`รูปที่ ${index + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-1.5 left-1.5">
                    {isCover ? (
                      <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        <span>รูปหน้าปก</span>
                      </span>
                    ) : (
                      <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-xs">
                        #{index + 1}
                      </span>
                    )}
                  </div>

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                    <button
                      type="button"
                      onClick={() => setPreviewImage(imgUrl)}
                      className="p-1.5 bg-white/90 hover:bg-white text-slate-700 rounded-lg text-xs transition-colors cursor-pointer"
                      title="ดูภาพขยาย"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {!isCover && (
                      <button
                        type="button"
                        onClick={() => handleSetAsCover(index)}
                        className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs transition-colors cursor-pointer"
                        title="ตั้งเป็นรูปหน้าปก"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs transition-colors cursor-pointer"
                      title="ลบรูปนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-500">
            * รูปแรกจะเป็นรูปหน้าปกแสดงในหน้ารายการห้องพักและระบบจอง
          </p>
        </div>
      ) : (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <p className="text-xs text-amber-800 font-medium">
            ยังไม่มีรูปภาพสำหรับห้องนี้ กรุณาอัปโหลดหรือเลือกรูปภาพอย่างน้อย 1 รูป
          </p>
        </div>
      )}

      {/* Fullscreen Image Preview Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-2xl overflow-hidden bg-black shadow-2xl">
            <img
              src={previewImage}
              alt="พรีวิวรูปภาพ"
              className="max-h-[85vh] w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
