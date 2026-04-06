import { expect, test } from "@playwright/test";

test("login page loads", async ({ page }) => {
  await page.goto("/login");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
});

test("legacy /signin redirects to /login", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
  await expect(page).toHaveURL(/\/(signin|login)/);
});
