import { NextResponse } from "next/server";

import { commercialError } from "@/app/api/counterparties/commercial-error";
import {
  createCommercialDocument,
  getCommercialDocument,
  getCommercialDocumentFormOptions,
  listCommercialDocuments,
  updateCommercialDocument,
  type CommercialUpload,
} from "@/modules/commercial/application/commercial";
import { resolveAuthContext } from "@/modules/identity/application/auth-context";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const auth = await resolveAuthContext(request.headers);
    const type = url.searchParams.get("type");
    const documentId = url.searchParams.get("id");
    return NextResponse.json(
      documentId
        ? await getCommercialDocument(auth, documentId)
        : url.searchParams.get("mode") === "form"
          ? await getCommercialDocumentFormOptions(auth, type)
          : await listCommercialDocuments(auth, type),
    );
  } catch (error) {
    return commercialError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const form = await request.formData();
    const input = JSON.parse(String(form.get("payload") ?? "{}"));
    const documentId = String(form.get("documentId") ?? "");
    const uploads: {
      invoice?: CommercialUpload;
      retentionIVA?: CommercialUpload;
      retentionISLR?: CommercialUpload;
    } = {};
    for (const [field, target] of [
      ["invoice", "invoice"],
      ["retentionIVA", "retentionIVA"],
      ["retentionISLR", "retentionISLR"],
    ] as const) {
      const value = form.get(field);
      if (value instanceof File && value.size)
        uploads[target] = {
          name: value.name,
          contentType: value.type || "application/octet-stream",
          bytes: new Uint8Array(await value.arrayBuffer()),
        };
    }
    const document = await updateCommercialDocument(
      await resolveAuthContext(request.headers),
      documentId,
      input,
      uploads,
    );
    return NextResponse.json({ document });
  } catch (error) {
    return commercialError(error);
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let input: unknown;
    const uploads: {
      invoice?: CommercialUpload;
      retentionIVA?: CommercialUpload;
      retentionISLR?: CommercialUpload;
    } = {};
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      input = JSON.parse(String(form.get("payload") ?? "{}"));
      for (const [field, target] of [
        ["invoice", "invoice"],
        ["retentionIVA", "retentionIVA"],
        ["retentionISLR", "retentionISLR"],
      ] as const) {
        const value = form.get(field);
        if (value instanceof File && value.size)
          uploads[target] = {
            name: value.name,
            contentType: value.type || "application/octet-stream",
            bytes: new Uint8Array(await value.arrayBuffer()),
          };
      }
    } else input = await request.json();
    const document = await createCommercialDocument(
      await resolveAuthContext(request.headers),
      input,
      uploads,
    );
    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    return commercialError(error);
  }
}
