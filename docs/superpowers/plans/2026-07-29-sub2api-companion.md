# Sub2API Companion Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Make Sub2API the only built-in provider shown when adding a provider, while preserving custom configuration and all existing saved providers.

**Architecture:** Keep the upstream preset catalogs unchanged and introduce one Sub2API configuration module as the single source of truth for the eight supported clients. Existing forms and preset handlers continue to do the application-specific serialization. AddProviderDialog performs the Sub2API-only pre-save health and authenticated model checks before it calls the existing persistence callback.

**Tech Stack:** React, TypeScript, Vitest, Tauri, Rust, reqwest.

---

### Task 1: Define the single Sub2API preset source

**Files:**
- Create: `src/config/sub2apiProviderPresets.ts`
- Test: `tests/config/sub2apiProviderPresets.test.ts`

**Step 1: Write the failing test**

Assert that the exported site constants are:

```ts
expect(SUB2API_ORIGIN).toBe("https://api.ai.let5see.xyz");
expect(SUB2API_V1_BASE_URL).toBe(`${SUB2API_ORIGIN}/v1`);
expect(SUB2API_GEMINI_BASE_URL).toBe(`${SUB2API_ORIGIN}/v1beta`);
```

Assert all eight preset objects are named `Sub2API`, contain no partner or official flags, and use the protocol/base URL from the approved design.

**Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run tests/config/sub2apiProviderPresets.test.ts`

Expected: FAIL because the module does not exist.

**Step 3: Write the minimal implementation**

Export:

```ts
export const SUB2API_PRESET_ID = "sub2api";
export const SUB2API_NAME = "Sub2API";
export const SUB2API_ORIGIN = "https://api.ai.let5see.xyz";
export const SUB2API_V1_BASE_URL = `${SUB2API_ORIGIN}/v1`;
export const SUB2API_GEMINI_BASE_URL = `${SUB2API_ORIGIN}/v1beta`;
export const SUB2API_HEALTH_URL = `${SUB2API_ORIGIN}/health`;
export const SUB2API_MODELS_URL = `${SUB2API_V1_BASE_URL}/models`;
export const SUB2API_GEMINI_MODELS_URL = `${SUB2API_GEMINI_BASE_URL}/models`;
```

Use the existing preset interfaces and existing Codex TOML generator. Do not add model IDs to the presets; model availability comes from the authenticated models endpoint.

**Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run tests/config/sub2apiProviderPresets.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/config/sub2apiProviderPresets.ts tests/config/sub2apiProviderPresets.test.ts
git commit -m "feat: add sub2api provider presets"
```

### Task 2: Collapse every add-provider selector to Sub2API

**Files:**
- Modify: `src/components/providers/forms/ProviderForm.tsx`
- Modify: `src/components/providers/forms/ClaudeDesktopProviderForm.tsx`
- Modify: `src/components/providers/forms/GrokBuildProviderForm.tsx`
- Modify: `src/components/providers/AddProviderDialog.tsx`
- Test: `tests/components/Sub2apiProviderForms.test.tsx`

**Step 1: Write the failing UI test**

Mock only the surrounding data APIs needed by the forms. For each supported `AppId`, render the new-provider form and assert:

```ts
expect(screen.getByRole("button", { name: /Sub2API/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /自定义配置|Custom/i })).toBeInTheDocument();
expect(screen.queryByText("Kimi")).not.toBeInTheDocument();
expect(screen.queryByText("OpenAI Official")).not.toBeInTheDocument();
```

Also assert exactly one supplied preset entry through a small exported pure helper if full form setup would make the test fixture larger than the production change.

**Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run tests/components/Sub2apiProviderForms.test.tsx`

Expected: FAIL because the upstream catalogs are still displayed.

**Step 3: Write the minimal implementation**

- Replace the `presetEntries` mapping in `ProviderForm` with the one matching Sub2API preset for the active app.
- Replace Claude Desktop and Grok Build preset entry lists with their Sub2API preset.
- Keep `ProviderPresetSelector` unchanged so its existing hard-coded custom configuration button remains.
- Hide the add dialog's universal-provider tab; it is another built-in provider recommendation surface. Existing saved universal providers remain managed elsewhere.
- Do not delete or rewrite any upstream preset array.

**Step 4: Run the relevant tests**

Run:

```bash
pnpm exec vitest run tests/components/Sub2apiProviderForms.test.tsx
pnpm exec vitest run tests/components/ProviderPresetSelector.test.tsx tests/components/AddProviderDialog.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/providers/forms/ProviderForm.tsx src/components/providers/forms/ClaudeDesktopProviderForm.tsx src/components/providers/forms/GrokBuildProviderForm.tsx src/components/providers/AddProviderDialog.tsx tests/components/Sub2apiProviderForms.test.tsx
git commit -m "feat: show only sub2api when adding providers"
```

### Task 3: Validate Sub2API health, authentication, and models before save

**Files:**
- Modify: `src/config/sub2apiProviderPresets.ts`
- Modify: `src/components/providers/AddProviderDialog.tsx`
- Modify: `src-tauri/src/services/model_fetch.rs`
- Test: `tests/config/sub2apiProviderPresets.test.ts`
- Test: `tests/components/AddProviderDialog.test.tsx`
- Test: `src-tauri/src/services/model_fetch.rs`

**Step 1: Write failing pure and dialog tests**

Add pure tests for extracting the API key from each app's submitted settings shape and selecting the correct model endpoint.

Mock `vscodeApi.testApiEndpoints`, `fetchModelsForConfig`, and the final `onSubmit` callback. Cover:

```ts
// unhealthy
testApiEndpoints.mockResolvedValue([{ url: SUB2API_HEALTH_URL, status: 503, latency: 1 }]);
expect(onSubmit).not.toHaveBeenCalled();

// bad key
fetchModelsForConfig.mockRejectedValue(new Error("HTTP 401"));
expect(onSubmit).not.toHaveBeenCalled();

// no models
fetchModelsForConfig.mockResolvedValue([]);
expect(onSubmit).not.toHaveBeenCalled();

// healthy and authenticated
fetchModelsForConfig.mockResolvedValue([{ id: "available-model", ownedBy: null }]);
expect(onSubmit).toHaveBeenCalledOnce();
```

Add a Rust parser test for both:

```json
{"data":[{"id":"openai-model","owned_by":"site"}]}
{"models":[{"name":"models/gemini-model","displayName":"Gemini Model"}]}
```

**Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec vitest run tests/config/sub2apiProviderPresets.test.ts tests/components/AddProviderDialog.test.tsx
cargo test --manifest-path src-tauri/Cargo.toml services::model_fetch::tests
```

Expected: FAIL on missing validation/extraction and Gemini response support.

**Step 3: Implement the smallest shared validation path**

- Add one pure `getSub2apiConnection(appId, settingsConfig)` helper.
- In `AddProviderDialog`, only when `values.presetId === SUB2API_PRESET_ID`:
  1. require the submitted API key;
  2. call the existing endpoint test API for `SUB2API_HEALTH_URL`;
  3. require a 2xx status;
  4. call `fetchModelsForConfig` with the exact app-specific models URL;
  5. require at least one model before calling the persistence callback.
- Reuse `showFetchModelsError` for authenticated model request failures.
- Extend the existing Rust model parser to accept the Gemini `models[].name` response in addition to the OpenAI `data[].id` response. Strip the optional `models/` prefix before returning IDs.
- Keep API keys out of logs and error messages.

**Step 4: Run tests to verify they pass**

Run the commands from Step 2.

Expected: PASS.

**Step 5: Commit**

```bash
git add src/config/sub2apiProviderPresets.ts src/components/providers/AddProviderDialog.tsx src-tauri/src/services/model_fetch.rs tests/config/sub2apiProviderPresets.test.ts tests/components/AddProviderDialog.test.tsx
git commit -m "feat: validate sub2api before saving"
```

### Task 4: Lock the fixed Sub2API endpoint in normal forms

**Files:**
- Modify: `src/components/providers/forms/ProviderForm.tsx`
- Modify: `src/components/providers/forms/ClaudeDesktopProviderForm.tsx`
- Modify: `src/components/providers/forms/GrokBuildProviderForm.tsx`
- Modify: `src/components/providers/forms/ClaudeFormFields.tsx`
- Modify: `src/components/providers/forms/CodexFormFields.tsx`
- Modify: `src/components/providers/forms/GeminiFormFields.tsx`
- Modify: `src/components/providers/forms/OpenCodeFormFields.tsx`
- Modify: `src/components/providers/forms/OpenClawFormFields.tsx`
- Modify: `src/components/providers/forms/HermesFormFields.tsx`
- Test: `tests/components/Sub2apiProviderForms.test.tsx`

**Step 1: Add the failing read-only assertion**

Select Sub2API and assert the visible endpoint input has `readOnly`, while the API key input remains enabled.

**Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run tests/components/Sub2apiProviderForms.test.tsx`

Expected: FAIL because endpoint inputs are editable.

**Step 3: Implement one optional field prop**

Add `baseUrlReadOnly?: boolean` to the existing field component props and pass:

```tsx
baseUrlReadOnly={selectedPresetId === SUB2API_PRESET_ID}
```

Set only the endpoint `<Input>` to `readOnly`. Do not disable API Key, model selection, advanced settings, or edit mode for existing providers.

**Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run tests/components/Sub2apiProviderForms.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add src/components/providers/forms tests/components/Sub2apiProviderForms.test.tsx
git commit -m "feat: lock sub2api endpoints in preset forms"
```

### Task 5: Verify behavior and affected UI

**Files:**
- Modify only if verification exposes a defect.

**Step 1: Run static and unit verification**

Run:

```bash
pnpm typecheck
pnpm exec vitest run tests/config/sub2apiProviderPresets.test.ts tests/components/Sub2apiProviderForms.test.tsx tests/components/ProviderPresetSelector.test.tsx tests/components/AddProviderDialog.test.tsx
cargo test --manifest-path src-tauri/Cargo.toml services::model_fetch::tests
pnpm build:renderer
git diff --check
```

Expected: all commands pass.

**Step 2: Launch the desktop UI**

Run: `pnpm tauri dev`

Open at least Claude Code, Codex, Gemini CLI, and one of OpenCode/OpenClaw/Hermes add-provider pages. Exercise preset selection and API key entry.

**Step 3: Capture and inspect screenshots**

Capture:

- one wide desktop view;
- one narrow window view.

Verify only Custom Configuration and Sub2API appear, there are no recommendation badges or external provider names, endpoint text is not clipped, the endpoint input is read-only, API Key remains editable, and the footer buttons do not overlap.

**Step 4: Final repository check**

Run:

```bash
git status --short
git log --oneline -5
```

Record exact verified layers: implemented, unit-tested, type-checked, built, and visually verified. Do not claim deployment or production verification.
