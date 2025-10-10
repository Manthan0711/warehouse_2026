MinIO + Presign server (for local development)

Overview
- This tiny stack runs MinIO (S3-compatible) and a small Node presign server that returns presigned PUT URLs.
- Use this for local file uploads (images + documents) and store the returned publicUrl in `warehouse_submissions.image_urls` / `document_urls`.

How to run
1. From the project root run:

```powershell
# start MinIO + presign server
docker compose -f docker-compose.minio.yml up --build
```

2. Presign server will be available at http://localhost:3001

Presign endpoint
POST /presign-upload
Body (json): { "filename": "file.jpg", "contentType": "image/jpeg", "kind": "image" }
Response: { uploadUrl, publicUrl, bucket, key }

Using the presigned URL from the browser
- Do a PUT request (fetch) to uploadUrl with the file body and Content-Type header matching contentType. After successful upload, save the returned publicUrl into your Supabase `warehouse_submissions` record.

Example client upload (browser)
```js
// 1) request presigned URL
const resp = await fetch('http://localhost:3001/presign-upload', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ filename: 'photo.jpg', contentType: 'image/jpeg', kind: 'image' }) });
const { uploadUrl, publicUrl } = await resp.json();

// 2) upload file
await fetch(uploadUrl, { method: 'PUT', headers: {'Content-Type':'image/jpeg'}, body: file });

// 3) save publicUrl in Supabase as part of the submission
await supabase.from('warehouse_submissions').update({ image_urls: supabase.raw('array_append(image_urls, ?)', [publicUrl]) }).eq('id', submissionId);
```

Notes
- This setup is for local development. For production use an S3 provider (AWS S3, DigitalOcean Spaces) or Supabase Storage directly.
- If you want objects to be publicly readable, either set the bucket policy to public in MinIO console or generate a presigned GET URL per object.
