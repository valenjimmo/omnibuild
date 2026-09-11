import { test, expect } from "@playwright/test";
test("Omnibuild owns contractor accounts and creates an isolated new workspace", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Great contractors. All connected." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Westwood ADU", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/omnibuild-hub.png", fullPage: true });
  await page
    .getByRole("button", { name: "Add contractor", exact: true })
    .click();
  await page.getByLabel("Company name", { exact: true }).fill("Summit ADU");
  await page.getByLabel("Portal slug", { exact: true }).fill("summit-adu");
  await page
    .getByLabel("Owner email", { exact: true })
    .fill("owner@summit.example");
  await page.getByRole("button", { name: "Create contractor" }).click();
  await expect(
    page.getByRole("heading", { name: "Summit ADU", exact: true }),
  ).toBeVisible();
  await page
    .locator(".contractor-card")
    .filter({ hasText: "Summit ADU" })
    .getByRole("link", { name: "Open workspace" })
    .click();
  await expect(page.locator(".company strong")).toHaveText("Summit ADU");
  await expect(
    page.getByRole("heading", { name: "The Miller Backyard Retreat" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Switch organization")
    .selectOption({ label: "Westwood ADU" });
  await expect(page).toHaveURL(/workspace\/westwood-adu/);
  await expect(
    page.getByRole("heading", { name: "The Miller Backyard Retreat" }),
  ).toBeVisible();
});
test("website to WhatsApp demo creates the correct contractor inquiry and supports a demo reply", async ({
  page,
}) => {
  await page.goto("/demo/contractor/westwood-adu");
  await expect(
    page.getByRole("heading", {
      name: "A little more space. A lot more possibility.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Client portal", exact: true }),
  ).toHaveAttribute("href", "/portal/westwood-adu");
  await expect(
    page.getByAltText("Scan to open the simulated WhatsApp journey"),
  ).toHaveAttribute("src", /^data:image\/png/);
  await page.screenshot({
    path: "/tmp/omnibuild-contractor-site.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Try the WhatsApp demo" }).click();
  await page.getByLabel("Your name").fill("Taylor Brooks");
  await page.getByLabel("Demo phone number").fill("+1 415 555 0123");
  await page.getByRole("button", { name: "Send demo inquiry" }).click();
  await expect(
    page.getByRole("heading", { name: "Your demo inquiry is in Omnibuild." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View the Omnibuild inbox" }).click();
  await expect(page.locator(".conversation-header")).toContainText(
    "Taylor Brooks",
  );
  await expect(page.locator(".conversation-header")).toContainText(
    "Westwood ADU",
  );
  await page.getByLabel("Inquiry stage").selectOption("Contacted");
  await page
    .getByLabel("Demo WhatsApp reply")
    .fill("Happy to help. Let’s discuss your property.");
  await page.getByRole("button", { name: "Save demo reply" }).click();
  await expect(page.locator(".message.mine")).toContainText("Happy to help.");
  await page.goto("/workspace/westwood-adu?view=inquiries");
  await expect(page.locator(".conversation-header")).toContainText(
    "Taylor Brooks",
  );
});
test("hub and contractor showcase fit a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/demo/contractor/westwood-adu"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  }
  await page.screenshot({
    path: "/tmp/omnibuild-site-mobile.png",
    fullPage: true,
  });
});
