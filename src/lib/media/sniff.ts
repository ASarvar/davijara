import type { ImageMime } from "./types";

/*
  What kind of file is this, really?

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ THE BROWSER'S ANSWER IS NOT EVIDENCE.                                    │
  │                                                                          │
  │ A multipart upload carries both a filename and a Content-Type, and both  │
  │ are supplied by whoever made the request. `payload.php` renamed to       │
  │ `photo.jpg` with `Content-Type: image/jpeg` is a two-line curl command.  │
  │ Trusting either field is how an upload endpoint becomes a file drop.     │
  │                                                                          │
  │ So the type is determined from the BYTES, and the result is what decides │
  │ the stored extension and the Content-Type header the file is later       │
  │ served with. The claimed type is used for exactly nothing.               │
  └──────────────────────────────────────────────────────────────────────────┘

  This is a whitelist: anything not matched here is rejected outright, rather
  than being stored with a guessed or generic type. `application/octet-stream`
  as a fallback would be a way to store arbitrary bytes on the server.
*/

function startsWith(
  bytes: Uint8Array,
  signature: number[],
  offset = 0,
): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, i) => bytes[offset + i] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + length));
}

/** The real type, or null if it is not an image this site accepts. */
export function sniffImageMime(bytes: Uint8Array): ImageMime | null {
  // JPEG — SOI marker.
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";

  // PNG — the 8-byte signature, including the CRLF/EOF trap bytes.
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  // GIF — "GIF87a" or "GIF89a".
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";

  /*
    WebP and AVIF are both containers, so the first four bytes are not enough:
    a RIFF file is only a WebP if the fourth chunk tag says so, and an ISO-BMFF
    file could equally be a video. Both are checked at their real offsets.
  */
  if (
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    ascii(bytes, 8, 4) === "WEBP"
  ) {
    return "image/webp";
  }

  if (ascii(bytes, 4, 4) === "ftyp") {
    const brand = ascii(bytes, 8, 4);
    if (brand === "avif" || brand === "avis") return "image/avif";
    /*
      Deliberately NOT accepting other ftyp brands. `mp4`, `heic` and friends
      share this header; storing a video because its container looks similar
      would put a file on disk that the image routes then serve with an image
      Content-Type.
    */
    return null;
  }

  return null;
}

/** The extension a sniffed type is stored with. */
export function extensionFor(mime: ImageMime): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
  }
}

/*
  Pixel dimensions, read from the header rather than by decoding.

  Nice to have, not load-bearing: the panel shows them, and an editor who
  uploads a 300px-wide photo for a 16:9 hero can see why it looks soft. Every
  branch returns null rather than throwing on a malformed header — a file
  whose dimensions cannot be read is still a valid upload.

  No image library for this. `sharp` would decode the whole file to answer a
  question the first 30 bytes already contain, on a one-CPU box, and it is a
  native module — the category this project has already been bitten by twice.
*/
export function readDimensions(
  bytes: Uint8Array,
  mime: ImageMime,
): { width: number; height: number } | null {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    if (mime === "image/png") {
      // IHDR is always the first chunk: width and height at bytes 16 and 20.
      return { width: view.getUint32(16), height: view.getUint32(20) };
    }

    if (mime === "image/gif") {
      // Logical screen descriptor, little-endian, right after the header.
      return {
        width: view.getUint16(6, true),
        height: view.getUint16(8, true),
      };
    }

    if (mime === "image/jpeg") {
      /*
        JPEG has no fixed header — the dimensions live in whichever SOFn
        marker appears, after an arbitrary number of other segments. So walk
        the marker chain until one of the SOF markers turns up.
      */
      let offset = 2;
      while (offset + 9 < bytes.length) {
        if (bytes[offset] !== 0xff) {
          offset++;
          continue;
        }
        const marker = bytes[offset + 1]!;
        // SOF0..SOF15, excluding DHT (c4), JPGA (c8) and DAC (cc).
        const isSof =
          marker >= 0xc0 &&
          marker <= 0xcf &&
          marker !== 0xc4 &&
          marker !== 0xc8 &&
          marker !== 0xcc;

        if (isSof) {
          return {
            height: view.getUint16(offset + 5),
            width: view.getUint16(offset + 7),
          };
        }
        // Standalone markers carry no length field; everything else does.
        if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
          offset += 2;
        } else {
          offset += 2 + view.getUint16(offset + 2);
        }
      }
      return null;
    }

    if (mime === "image/webp") {
      const format = ascii(bytes, 12, 4);
      if (format === "VP8X") {
        // 24-bit little-endian, stored as (value - 1).
        const w = bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16);
        const h = bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16);
        return { width: w + 1, height: h + 1 };
      }
      if (format === "VP8 ") {
        return {
          width: view.getUint16(26, true) & 0x3fff,
          height: view.getUint16(28, true) & 0x3fff,
        };
      }
      if (format === "VP8L") {
        const bits =
          bytes[21]! |
          (bytes[22]! << 8) |
          (bytes[23]! << 16) |
          (bytes[24]! << 24);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }
      return null;
    }

    /*
      AVIF dimensions live in an ispe box nested several levels deep in the
      meta box. Not parsed: the payoff is a number in a caption, and a
      hand-rolled ISO-BMFF walker is a lot of surface for that.
    */
    return null;
  } catch {
    return null;
  }
}
