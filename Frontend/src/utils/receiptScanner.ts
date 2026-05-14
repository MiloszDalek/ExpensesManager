import type { ApiExpenseShare } from "@/types";

export const areNumberArraysEqual = (first: number[], second: number[]): boolean => {
  if (first.length !== second.length) {
    return false;
  }

  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return false;
    }
  }

  return true;
};

export const parseAmount = (value: string): number => {
  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const toCents = (value: number): number => Math.round(value * 100);
export const toAmountString = (value: number): string => (Math.round(value * 100) / 100).toFixed(2);

export const buildEqualShares = (totalCents: number, participantIds: number[]): ApiExpenseShare[] => {
  if (participantIds.length === 0 || totalCents <= 0) {
    return [];
  }

  const baseShareCents = Math.floor(totalCents / participantIds.length);
  const remainderCents = totalCents - baseShareCents * participantIds.length;

  return participantIds.map((userId, index) => {
    const cents = baseShareCents + (index < remainderCents ? 1 : 0);
    return {
      user_id: userId,
      share_amount: toAmountString(cents / 100),
    };
  });
};

export const compressImageFile = async (file: File, maxDimension = 1920, quality = 0.85): Promise<File> => {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Canvas toBlob failed"));
            return;
          }
          const compressed = new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };

    img.src = url;
  });
};
