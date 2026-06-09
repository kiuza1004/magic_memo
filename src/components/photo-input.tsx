"use client";

import { useRef, useState } from "react";
import { Camera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onSelected: (file: File | null) => void;
}

export function PhotoInput({ onSelected }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handle = (file: File | null) => {
    if (!file) {
      setPreview(null);
      onSelected(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    onSelected(file);
  };

  return (
    <div className="flex flex-col gap-4 py-2">
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />

      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt=""
            className="w-full rounded-lg object-cover max-h-64"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => handle(null)}
            className="absolute top-2 right-2 size-8 rounded-full"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border rounded-lg p-6 grid place-items-center gap-3 text-muted-foreground">
          <Camera className="size-8" />
          <p className="text-sm">사진을 찍거나 선택하세요</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="size-4 mr-1.5" />
          카메라
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => galleryRef.current?.click()}
        >
          <Upload className="size-4 mr-1.5" />
          앨범에서
        </Button>
      </div>
    </div>
  );
}
