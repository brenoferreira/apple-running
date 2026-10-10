/**
 * Native ZIP parser and streaming decompressor using Web APIs
 * (DataView + DecompressionStream).
 * Zero external dependencies.
 */

export interface ZipEntryInfo {
  filename: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number; // 0 = stored, 8 = deflate
  localHeaderOffset: number;
}

export interface ZipArchive {
  entries: ZipEntryInfo[];
  getDecompressedStream: (
    entry: ZipEntryInfo,
    onProgress?: (bytesDecompressed: number) => void
  ) => Promise<ReadableStream<string>>;
}

/**
 * Parses a ZIP file's Central Directory from an ArrayBuffer
 */
export function parseZipArchive(buffer: ArrayBuffer): ZipArchive {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // 1. Locate End of Central Directory Record (EOCD): signature 0x06054b50
  let eocdOffset = -1;
  const maxSearch = Math.min(bytes.length, 65536 + 22);
  for (let i = bytes.length - 22; i >= bytes.length - maxSearch; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error('Invalid ZIP file: End of Central Directory record not found.');
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  let cdOffset = view.getUint32(eocdOffset + 16, true);

  const textDecoder = new TextDecoder('utf-8');
  const entries: ZipEntryInfo[] = [];

  // 2. Iterate Central Directory headers: signature 0x02014b50
  for (let i = 0; i < totalEntries; i++) {
    if (cdOffset + 46 > bytes.length) break;
    const magic = view.getUint32(cdOffset, true);
    if (magic !== 0x02014b50) break;

    const compressionMethod = view.getUint16(cdOffset + 10, true);
    const compressedSize = view.getUint32(cdOffset + 20, true);
    const uncompressedSize = view.getUint32(cdOffset + 24, true);
    const filenameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);

    const filenameBytes = bytes.subarray(cdOffset + 46, cdOffset + 46 + filenameLen);
    const filename = textDecoder.decode(filenameBytes);

    entries.push({
      filename,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      localHeaderOffset,
    });

    cdOffset += 46 + filenameLen + extraLen + commentLen;
  }

  const getDecompressedStream = async (
    entry: ZipEntryInfo,
    onProgress?: (bytesDecompressed: number) => void
  ): Promise<ReadableStream<string>> => {
    // Read local header to find data offset
    const localOffset = entry.localHeaderOffset;
    if (view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error(`Corrupted ZIP entry local header for ${entry.filename}`);
    }

    const localFilenameLen = view.getUint16(localOffset + 26, true);
    const localExtraLen = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localFilenameLen + localExtraLen;

    const compressedSlice = bytes.subarray(dataOffset, dataOffset + entry.compressedSize);

    if (entry.compressionMethod === 0) {
      // Uncompressed
      const readable = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(compressedSlice);
          controller.close();
        },
      });
      return (readable as ReadableStream<Uint8Array>).pipeThrough(
        new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>
      );
    }

    if (entry.compressionMethod === 8) {
      // Deflate decompression using native DecompressionStream
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();

      // Write compressed payload in chunks to avoid blocking
      (async () => {
        try {
          const chunkSize = 2 * 1024 * 1024; // 2MB chunks
          for (let pos = 0; pos < compressedSlice.length; pos += chunkSize) {
            const chunk = compressedSlice.subarray(pos, pos + chunkSize);
            await writer.write(chunk);
          }
          await writer.close();
        } catch (err) {
          await writer.abort(err);
        }
      })();

      // Pipe through tracking stream if onProgress is requested
      let bytesDecompressed = 0;
      const trackingStream = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          bytesDecompressed += chunk.length;
          if (onProgress) {
            onProgress(bytesDecompressed);
          }
          controller.enqueue(chunk);
        },
      });

      return ds.readable
        .pipeThrough(trackingStream)
        .pipeThrough(new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>);
    }

    throw new Error(`Unsupported ZIP compression method: ${entry.compressionMethod}`);
  };

  return {
    entries,
    getDecompressedStream,
  };
}
