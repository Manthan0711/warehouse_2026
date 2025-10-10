Presign server usage

Set the presign server URL in your React app by adding an environment variable in `.env`:

REACT_APP_PRESIGN_SERVER=http://localhost:3001

This is used by `ListProperty.tsx` to call `/presign-upload` for images and documents.

If you want the server to create MinIO buckets and set public policies automatically, it's already implemented and runs on startup.

Production S3 presign usage:
- Provide AWS credentials in env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, optionally AWS_S3_ENDPOINT
- Call /presign-s3 on the presign server to get production S3 presigned URLs
