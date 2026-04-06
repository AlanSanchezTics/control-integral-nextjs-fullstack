import { expect, test } from "@playwright/test";

test("signin page loads", async ({ page }) => {
  await page.goto("/storybook/signin");

  await expect(page).toHaveURL(/\/storybook\/signin/);
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();
});
