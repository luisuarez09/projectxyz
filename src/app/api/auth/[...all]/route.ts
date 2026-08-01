import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/modules/identity/infrastructure/auth";

function handler(request: Request): Promise<Response> {
  return getAuth().handler(request);
}

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(handler);
