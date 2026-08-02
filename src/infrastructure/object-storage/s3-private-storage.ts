import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { z } from "zod";

const storageEnvSchema = z.object({
  S3_ENDPOINT: z.url(),
  S3_REGION: z.string().min(1).default("us-east-1"),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("true"),
});

const environment = storageEnvSchema.parse(process.env);
const globalStorage = globalThis as unknown as {
  privateS3Client?: S3Client;
  privateBucketReady?: Promise<void>;
};

function client() {
  if (!globalStorage.privateS3Client)
    globalStorage.privateS3Client = new S3Client({
      endpoint: environment.S3_ENDPOINT,
      region: environment.S3_REGION,
      forcePathStyle: environment.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: environment.S3_ACCESS_KEY_ID,
        secretAccessKey: environment.S3_SECRET_ACCESS_KEY,
      },
    });
  return globalStorage.privateS3Client;
}

async function ensureBucket() {
  if (!globalStorage.privateBucketReady)
    globalStorage.privateBucketReady = (async () => {
      try {
        await client().send(new HeadBucketCommand({ Bucket: environment.S3_BUCKET }));
      } catch {
        await client().send(new CreateBucketCommand({ Bucket: environment.S3_BUCKET }));
      }
    })();
  return globalStorage.privateBucketReady;
}

export function privateBucket() {
  return environment.S3_BUCKET;
}

export async function putPrivateObject(input: {
  key: string;
  body: Uint8Array;
  contentType: string;
}) {
  await ensureBucket();
  await client().send(new PutObjectCommand({
    Bucket: environment.S3_BUCKET,
    Key: input.key,
    Body: input.body,
    ContentType: input.contentType,
  }));
}

export async function deletePrivateObject(key: string) {
  await client().send(new DeleteObjectCommand({
    Bucket: environment.S3_BUCKET,
    Key: key,
  }));
}

export async function getPrivateObject(key: string) {
  const response = await client().send(new GetObjectCommand({
    Bucket: environment.S3_BUCKET,
    Key: key,
  }));
  if (!response.Body) throw new Error("El archivo almacenado no tiene contenido.");
  return new Uint8Array(await response.Body.transformToByteArray());
}
