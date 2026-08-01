import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { afterAll, describe, expect, it } from "vitest";

const bucket = process.env.S3_BUCKET ?? "proyectoxyz-private";
const key = `phase-zero/${crypto.randomUUID()}.txt`;
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "local_s3_access_key",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "local_s3_secret_key",
  },
});

describe("SeaweedFS S3", () => {
  afterAll(async () => {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    client.destroy();
  });

  it("uploads and downloads an object", async () => {
    const content = "proyectoxyz phase zero storage check";

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: content,
        ContentType: "text/plain",
      }),
    );
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );

    expect(await response.Body?.transformToString()).toBe(content);
  });
});
