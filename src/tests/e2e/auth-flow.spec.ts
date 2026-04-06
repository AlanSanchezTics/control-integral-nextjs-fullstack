import { expect, test } from "@playwright/test";

test("login shows validation errors on empty submit", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(
    page.getByText("Enter a valid email address or phone number."),
  ).toBeVisible();
  await expect(
    page.getByText("Password must be at least 8 characters long."),
  ).toBeVisible();
});

test("reset-password request shows validation on empty submit", async ({
  page,
}) => {
  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "Reset Password" })).toBeVisible();

  await page.getByRole("button", { name: "Send reset code" }).click();

  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
});

test("reset-password request transitions to confirm step", async ({ page }) => {
  await page.route("**/api/auth/reset-password/request", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message:
          "If that email exists, we sent a reset code with the next steps.",
      }),
    });
  });

  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "Reset Password" })).toBeVisible();
  await page
    .locator('input[name="email"]')
    .fill("user@example.com");
  await page.getByRole("button", { name: "Send reset code" }).click();

  await expect(
    page.getByRole("heading", { name: "Confirm reset" }),
  ).toBeVisible();
  await expect(page.getByText("Enter the code sent to your email")).toBeVisible();
});

test("reset-password confirm completes successfully", async ({ page }) => {
  await page.route("**/api/auth/reset-password/request", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ message: "Reset code sent." }),
    });
  });

  await page.route("**/api/auth/reset-password/confirm", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Your password has been updated. You can sign in now.",
      }),
    });
  });

  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "Reset Password" })).toBeVisible();
  await page.locator('input[name="email"]').fill("user@example.com");
  await page.getByRole("button", { name: "Send reset code" }).click();

  await page.locator('input[name="token"]').fill("ABC123");
  await page.locator('input[name="password"]').fill("new-password-123");
  await page
    .locator('input[name="confirmPassword"]')
    .fill("new-password-123");
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(
    page.getByText("Your password has been updated. You can sign in now.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to sign in" }),
  ).toHaveAttribute("href", "/login");
});
