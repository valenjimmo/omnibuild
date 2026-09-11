import { test, expect } from "@playwright/test";

test("invitation route rejects foreign origins and forged role payloads", async ({
  request,
}) => {
  const payload = {
    organization_id: "11111111-1111-4111-8111-111111111111",
    email: "test@example.com",
    role: "staff",
  };
  const foreign = await request.post("/api/invite", {
    headers: { origin: "https://foreign.example" },
    data: payload,
  });
  expect(foreign.status()).toBe(403);
  const forged = await request.post("/api/invite", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: { ...payload, role: "owner" },
  });
  expect(forged.status()).toBe(400);
  const invalidId = await request.post("/api/invite", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: { ...payload, organization_id: "../another-company" },
  });
  expect(invalidId.status()).toBe(400);
});

test("contractor can manage a project, share files, and message a homeowner", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/workspace/westwood-adu");
  await expect(
    page.getByRole("heading", { name: "Good things are taking shape." }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/omnibuild-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Homeowners", exact: true }).click();
  await page.getByRole("button", { name: "Add client", exact: true }).click();
  await page.getByLabel("Full name").fill("Alex Rivera");
  await page.getByLabel("Email address").fill("alex@example.com");
  await page.getByRole("button", { name: "Save client" }).click();
  await expect(page.getByText("Alex Rivera", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name").fill("Rivera Garden Home");
  await page
    .getByLabel("Client", { exact: true })
    .selectOption({ label: "Alex Rivera" });
  await page.getByLabel("Project address").fill("12 Garden Lane, Berkeley");
  await page
    .getByRole("textbox", { name: "Overview", exact: true })
    .fill("A peaceful backyard home.");
  await page.getByRole("button", { name: "Save project" }).click();
  await page
    .getByRole("button")
    .filter({ has: page.getByRole("heading", { name: "Rivera Garden Home" }) })
    .click();
  await page
    .getByRole("button", { name: "Add milestone", exact: true })
    .click();
  await page.getByLabel("Milestone name").fill("Design approval");
  await page.getByRole("button", { name: "Save milestone" }).click();
  await page
    .getByRole("button", { name: "Complete Design approval", exact: true })
    .click();
  await expect(page.getByText("100% complete", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Updates", exact: true }).click();
  await page.getByRole("button", { name: "New update", exact: true }).click();
  await page.getByLabel("Update title").fill("Plans ready");
  await page.getByLabel("What’s new?").fill("Ready for review.");
  await page.getByRole("button", { name: "Save update" }).click();
  await expect(
    page.getByRole("heading", { name: "Plans ready" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Documents", exact: true })
    .last()
    .click();
  await page.locator("input[type=file]").setInputFiles({
    name: "plans.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("ADU design plans"),
  });
  await expect(page.getByText("plans.txt", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Share with client" }).click();
  await expect(page.getByText("Client visible", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Messages", exact: true })
    .last()
    .click();
  await page
    .getByLabel("Use a message template")
    .selectOption({ label: "Milestone complete" });
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".message.mine").last()).toContainText(
    "Great news!",
  );
  await page.reload();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Rivera Garden Home" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("homeowner portal hides internal information and supports custom replies", async ({
  page,
}) => {
  await page.goto("/portal/westwood-adu");
  await expect(
    page.getByRole("heading", { name: "Your next chapter starts here." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Homeowners", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("Crew coordination")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Chen Garden Studio" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Messages", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Friday works for us!");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".message.mine").last()).toContainText(
    "Friday works for us!",
  );
  await page.goto("/portal/not-your-company");
  await expect(
    page.getByRole("heading", { name: "Portal not found" }),
  ).toBeVisible();
});

test("mobile navigation fits a phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workspace/westwood-adu");
  await expect(
    page.getByRole("heading", { name: "Good things are taking shape." }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({ path: "/tmp/omnibuild-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Projects", exact: true }),
  ).toBeVisible();
});
