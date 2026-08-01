import { expect, test } from "@playwright/test";

test("live health endpoint responds without functional data", async ({ request }) => {
  const response = await request.get("/api/health/live");

  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({
    status: "ok",
    service: "web",
  });
});
