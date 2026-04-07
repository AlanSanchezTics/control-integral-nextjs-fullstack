import { expect, test } from "@playwright/test";

test("login shows validation errors on empty submit", async ({ page }) => {
  await page.goto("/login");

  await page
    .getByRole("button", { name: /Iniciar sesión|Sign in/, exact: true })
    .click();

  await expect(
    page.getByText(/Ingresa un correo electrónico o teléfono válido\./),
  ).toBeVisible();
  await expect(
    page.getByText(/La contraseña debe tener al menos 8 caracteres\./),
  ).toBeVisible();
});

test("reset-password request shows validation on empty submit", async ({
  page,
}) => {
  await page.goto("/reset-password");
  await expect(
    page.getByRole("heading", { name: /Restablecer contraseña|Reset Password/ }),
  ).toBeVisible();

  await page.getByRole("button", { name: /Enviar código|Send reset code/ }).click();

  await expect(page.getByText(/Ingresa un correo electrónico válido\./)).toBeVisible();
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
  await expect(
    page.getByRole("heading", { name: /Restablecer contraseña|Reset Password/ }),
  ).toBeVisible();
  await page
    .locator('input[name="email"]')
    .fill("user@example.com");
  await page.getByRole("button", { name: /Enviar código|Send reset code/ }).click();

  await expect(
    page.getByRole("heading", { name: /Confirmar restablecimiento|Confirm reset/ }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Ingresa el código enviado a tu correo|Enter the code sent to your email/,
    ),
  ).toBeVisible();
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
  await expect(
    page.getByRole("heading", { name: /Restablecer contraseña|Reset Password/ }),
  ).toBeVisible();
  await page.locator('input[name="email"]').fill("user@example.com");
  await page.getByRole("button", { name: /Enviar código|Send reset code/ }).click();

  await page.locator('input[name="token"]').fill("ABC123");
  await page.locator('input[name="password"]').fill("new-password-123");
  await page
    .locator('input[name="confirmPassword"]')
    .fill("new-password-123");
  await page.getByRole("button", { name: "Update password" }).click();

  await expect(
    page.getByText(
      /Your password has been updated\. You can sign in now\.|Tu contraseña se actualizó\. Ya puedes iniciar sesión\./,
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Regresar a iniciar sesión|Return to sign in/ }),
  ).toHaveAttribute("href", "/login");
});
