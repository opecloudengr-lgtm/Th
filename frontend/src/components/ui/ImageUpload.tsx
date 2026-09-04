"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ApiException, uploadImage } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

/** A drag-and-drop / click-to-browse image uploader -- the real thing,
 * not a "paste a URL" field. Uploads to the backend and reports back the
 * URL to store, same as before, so callers don't need to change how they
 * persist the value. */
export function ImageUpload({
  value,
  onChange,
  shape = "banner",
  className,
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  shape?: "banner" | "square";
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 5MB or smaller.");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch (err) {
      toast.error(err instanceof ApiException ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-line bg-surface transition-colors",
        shape === "banner" ? "aspect-video w-full" : "size-28",
        dragOver && "border-violet ring-2 ring-violet/20",
        className
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-ink/0 opacity-0 transition-all group-hover:bg-ink/60 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-full bg-surface-raised px-3 py-1.5 text-xs font-medium text-text-hi hover:bg-violet cursor-pointer"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              disabled={uploading}
              className="flex size-7 items-center justify-center rounded-full bg-surface-raised text-text-hi hover:bg-red cursor-pointer"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex size-full flex-col items-center justify-center gap-1.5 text-text-low hover:text-text-mid cursor-pointer"
        >
          {uploading ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          <span className="px-2 text-center text-xs font-medium">
            {uploading ? "Uploading…" : "Click or drag an image here"}
          </span>
          {!uploading && <span className="text-[11px] text-text-low">PNG, JPG, WEBP up to 5MB</span>}
        </button>
      )}

      {uploading && value && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/60">
          <Loader2 className="size-6 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}
