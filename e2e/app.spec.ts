import { test, expect, type Page } from "@playwright/test";

/** Seed an onboarded, ready-to-use settings store before the app boots. */
async function seedOnboarded(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "irontrack-settings",
      JSON.stringify({
        state: {
          onboarded: true,
          unit: "kg",
          theme: "system",
          defaultRestSec: 90,
          smartRestDefaults: true,
          soundEnabled: true,
          vibrationEnabled: true,
          notificationsEnabled: false,
          profile: {
            name: "",
            age: null,
            heightCm: null,
            bodyWeightKg: null,
            goal: null,
          },
        },
        version: 0,
      }),
    );
  });
}

test.describe("onboarding", () => {
  test("completes onboarding and lands on the home screen", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Welcome to IronTrack" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /Skip/ }).click();
    await page.getByRole("button", { name: /Skip/ }).click();
    await page.getByRole("button", { name: /Skip/ }).click();
    await page.getByRole("button", { name: /Keep|Go|l'?s/i }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/Today'?s Workout/i).first()).toBeVisible();
  });
});

test.describe("exercises", () => {
  test("creates a custom exercise and shows it in the library", async ({
    page,
  }) => {
    await seedOnboarded(page);
    await page.goto("/exercises");

    await page.getByRole("button", { name: /Add/ }).click();
    await expect(
      page.getByRole("dialog", { name: "New Exercise" }),
    ).toBeVisible();

    await page.getByLabel("Exercise name").fill("Deficit Push-Up");
    await page.getByLabel("Primary muscle group", { exact: true }).selectOption("Back");
    await page.getByLabel("Equipment", { exact: true }).selectOption("Dumbbell");
    const formDialog = page.getByRole("dialog", { name: "New Exercise" });
    await formDialog.getByRole("radio", { name: "Isolation" }).click();

    await page.getByRole("button", { name: "Add Exercise" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await expect(page.getByText("Deficit Push-Up").first()).toBeVisible();
    await expect(page.getByText("Back · Dumbbell · Isolation")).toBeVisible();
  });
});

test.describe("workout flow", () => {
  test("builds a template, starts it, completes a set and finishes", async ({
    page,
  }) => {
    await seedOnboarded(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Create Workout" }).first().click();

    // Give the template a name and add a squat
    await page.getByPlaceholder("e.g. Push Day").fill("Squat Day");
    await page.getByRole("button", { name: "Add Exercise" }).click();
    await page.getByLabel("Search exercises").fill("Squat");
    await page.getByRole("button", { name: /Squat/ }).first().click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByRole("button", { name: "Save Workout" }).click();

    await expect(page).toHaveURL(/\/workouts$/);
    await expect(page.getByText("Squat Day").first()).toBeVisible();

    // Start it from the template card
    await page.getByRole("button", { name: /Start/ }).click();
    await expect(page).toHaveURL(/\/active/);
    await expect(
      page.getByRole("button", { name: "Complete set 1" }),
    ).toBeVisible();

    // Complete the single set and finish
    await page.getByRole("button", { name: "Complete set 1" }).click();
    await page.getByRole("button", { name: "Finish", exact: true }).click();
    await page.getByRole("button", { name: "Finish Workout" }).click();

    await expect(
      page.getByRole("heading", { name: "Workout Complete" }),
    ).toBeVisible({ timeout: 10_000 });

    // Session appears in history
    await page.goto("/history");
    await expect(page.getByText("Squat Day", { exact: true }).first()).toBeVisible();
  });
});