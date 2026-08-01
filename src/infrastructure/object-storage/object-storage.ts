export type UploadIntent = {
  objectId: string;
  uploadUrl: string;
  expiresAt: Date;
};

export type StoredObjectMetadata = {
  objectId: string;
  size: bigint;
  contentType: string;
  checksumSha256: string;
  status: "pending" | "quarantine" | "available" | "rejected" | "archived";
};

export interface ObjectStorage {
  beginUpload(input: {
    contentType: string;
    size: bigint;
    checksumSha256: string;
  }): Promise<UploadIntent>;
  completeUpload(objectId: string): Promise<StoredObjectMetadata>;
  getTemporaryDownload(objectId: string): Promise<{ url: string; expiresAt: Date }>;
  getMetadata(objectId: string): Promise<StoredObjectMetadata>;
  quarantine(objectId: string, reason: string): Promise<void>;
  administrativelyWithdraw(objectId: string, reason: string): Promise<void>;
}
