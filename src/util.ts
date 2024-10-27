import { BaseConverter } from 'baseconv';
import { ImageType, VideoType, AudioType } from './constant';

// Base62 Converter
const BASE62_CONVERTER = new BaseConverter("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");

// Define a type for the decoded file ID
interface DecodedFileId {
  fileType: ImageType | VideoType | AudioType | null;
  width: number | null;
  height: number | null;
  length: number | null;
  color: string | null;
}

// Function to decode file ID
function decodeFileId(fileId: string): DecodedFileId {
  let fileType: ImageType | VideoType | AudioType | null = fileId[0] as ImageType | VideoType | AudioType;

  for (const t of [ImageType, VideoType, AudioType]) {
    try {
      fileType = t(fileType);
      break;
    } catch {
      // Ignore ValueError equivalent
    }
  }

  let width: number | null = null;
  let height: number | null = null;
  let length: number | null = null;
  let color: string | null = null;

  if (fileType) {
    const typeClass = fileType.constructor;

    if (typeClass === ImageType || typeClass === VideoType) {
      // TWWHHCCCxxxxxxxxxxxxxxxxxxxxxxxxx
      width = parseInt(BASE62_CONVERTER.decode(fileId.slice(1, 3)), 10);
      height = parseInt(BASE62_CONVERTER.decode(fileId.slice(3, 5)), 10);
      if (fileType !== VideoType.PTS && fileType !== VideoType.PTS_B) {
        color = `0x${parseInt(BASE62_CONVERTER.decode(fileId.slice(5, 8)), 10).toString(16)}`;
      }
    }

    if (fileType === VideoType.PTS || fileType === VideoType.PTS_B) {
      // TWWHHLLLLCCCxxxxxxxxxxxxxxxxxxxxx
      length = parseInt(BASE62_CONVERTER.decode(fileId.slice(5, 9)), 10);
      color = `0x${parseInt(BASE62_CONVERTER.decode(fileId.slice(9, 12)), 10).toString(16)}`;
    } else if (fileType === AudioType.PTT || fileType === AudioType.PTT_J) {
      // TLLLLxxxxxxxxxxxxxxxxxxxxxxxxxxxx
      length = parseInt(BASE62_CONVERTER.decode(fileId.slice(1, 5)), 10);
    }
  }

  return { fileType, width, height, length, color };
}

// Map for signal names
const signals: { [key: number]: string } = Object.fromEntries(
  Object.entries(signal).filter(([key]) => key.startsWith("SIG") && !key.includes("_"))
);

// Function to get signal name by code
function signalNameByCode(code: number): string {
  return signals[code];
}

// Function to invalidate cached property
function invalidateCachedProperty(o: any, name: string): void {
  if (o.hasOwnProperty(name)) {
    delete o[name];
  }
}

// Function to wrap string
function wrap(string: string, length: number): string[] {
  return Array.from({ length: Math.ceil(string.length / length) }, (_, i) => string.slice(i * length, i * length + length));
}
