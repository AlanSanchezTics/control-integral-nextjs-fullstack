import { expect, test } from "@playwright/test";

test("signin page loads", async ({ page }) => {
  await page.goto("/signin");

  await expect(page).toHaveURL(/\/signin/);
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
});
