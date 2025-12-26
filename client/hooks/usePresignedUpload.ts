import { useCallback } from 'react';

type Kind = 'image' | 'document';

// Use import.meta.env for Vite instead of process.env
export function usePresignedUpload(serverUrl = import.meta.env.VITE_PRESIGN_SERVER_URL || 'http://localhost:4001') {
  const presignAndUpload = useCallback(async (file: File, kind: Kind) => {
    const resp = await fetch(`${serverUrl}/presign-upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type, kind })
    });
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.error || 'Presign failed');
    }
    const body = await resp.json();
    const uploadResp = await fetch(body.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!uploadResp.ok) throw new Error('Upload failed: ' + uploadResp.statusText);
    return body.publicUrl;
  }, [serverUrl]);

  return { presignAndUpload };
}

export default usePresignedUpload;
