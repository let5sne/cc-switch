import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddProviderDialog } from "@/components/providers/AddProviderDialog";
import type { ProviderFormValues } from "@/components/providers/forms/ProviderForm";
import {
  SUB2API_HEALTH_URL,
  SUB2API_MODELS_URL,
  SUB2API_ORIGIN,
  SUB2API_PRESET_ID,
} from "@/config/sub2apiProviderPresets";

const apiMocks = vi.hoisted(() => ({
  testApiEndpoints: vi.fn(),
  fetchModelsForConfig: vi.fn(),
  showFetchModelsError: vi.fn(),
}));

vi.mock("@/lib/api/vscode", () => ({
  vscodeApi: {
    testApiEndpoints: apiMocks.testApiEndpoints,
  },
}));

vi.mock("@/lib/api/model-fetch", () => ({
  fetchModelsForConfig: apiMocks.fetchModelsForConfig,
  showFetchModelsError: apiMocks.showFetchModelsError,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h1>{children}</h1>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

let mockFormValues: ProviderFormValues;

vi.mock("@/components/providers/forms/ProviderForm", () => ({
  ProviderForm: ({
    onSubmit,
  }: {
    onSubmit: (values: ProviderFormValues) => void;
  }) => (
    <form
      id="provider-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(mockFormValues);
      }}
    />
  ),
}));

describe("AddProviderDialog", () => {
  beforeEach(() => {
    apiMocks.testApiEndpoints.mockReset();
    apiMocks.testApiEndpoints.mockResolvedValue([
      { url: SUB2API_HEALTH_URL, status: 200, latency: 1 },
    ]);
    apiMocks.fetchModelsForConfig.mockReset();
    apiMocks.fetchModelsForConfig.mockResolvedValue([
      { id: "available-model", ownedBy: null },
    ]);
    apiMocks.showFetchModelsError.mockReset();

    mockFormValues = {
      name: "Test Provider",
      websiteUrl: "https://provider.example.com",
      settingsConfig: JSON.stringify({ env: {}, config: {} }),
      meta: {
        custom_endpoints: {
          "https://api.new-endpoint.com": {
            url: "https://api.new-endpoint.com",
            addedAt: 1,
          },
        },
      },
    };
  });

  it("使用 ProviderForm 返回的自定义端点", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const handleOpenChange = vi.fn();

    render(
      <AddProviderDialog
        open
        onOpenChange={handleOpenChange}
        appId="claude"
        onSubmit={handleSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "common.add",
      }),
    );

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    const submitted = handleSubmit.mock.calls[0][0];
    expect(submitted.meta?.custom_endpoints).toEqual(
      mockFormValues.meta?.custom_endpoints,
    );
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("在缺少自定义端点时回退到配置中的 baseUrl", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    mockFormValues = {
      name: "Base URL Provider",
      websiteUrl: "",
      settingsConfig: JSON.stringify({
        env: { ANTHROPIC_BASE_URL: "https://claude.base" },
        config: {},
      }),
    };

    render(
      <AddProviderDialog
        open
        onOpenChange={vi.fn()}
        appId="claude"
        onSubmit={handleSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "common.add",
      }),
    );

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    const submitted = handleSubmit.mock.calls[0][0];
    expect(submitted.meta?.custom_endpoints).toEqual({
      "https://claude.base": {
        url: "https://claude.base",
        addedAt: expect.any(Number),
        lastUsed: undefined,
      },
    });
  });

  it("新建 Grok Build 自定义供应商时不补默认 Grok 图标", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    mockFormValues = {
      name: "tes 1",
      websiteUrl: "",
      icon: "",
      iconColor: "",
      settingsConfig: JSON.stringify({
        config: `[models]
default = "grok-4.5"

[model."grok-4.5"]
model = "grok-4.5"
base_url = "https://grok.example.com/v1"
name = "tes 1"
api_key = "secret"
api_backend = "responses"
context_window = 500000
`,
      }),
    };

    render(
      <AddProviderDialog
        open
        onOpenChange={vi.fn()}
        appId="grokbuild"
        onSubmit={handleSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "common.add" }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));

    const submitted = handleSubmit.mock.calls[0][0];
    expect(submitted.icon).toBeUndefined();
    expect(submitted.iconColor).toBeUndefined();
  });

  it("本站健康检查失败时不保存", async () => {
    const handleSubmit = vi.fn();
    apiMocks.testApiEndpoints.mockResolvedValue([
      { url: SUB2API_HEALTH_URL, status: 503, latency: 1 },
    ]);
    mockFormValues = {
      name: "Sub2API",
      websiteUrl: SUB2API_ORIGIN,
      presetId: SUB2API_PRESET_ID,
      settingsConfig: JSON.stringify({
        env: {
          ANTHROPIC_BASE_URL: SUB2API_ORIGIN,
          ANTHROPIC_AUTH_TOKEN: "site-key",
        },
      }),
    };

    render(
      <AddProviderDialog
        open
        onOpenChange={vi.fn()}
        appId="claude"
        onSubmit={handleSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "common.add" }));

    await waitFor(() =>
      expect(apiMocks.testApiEndpoints).toHaveBeenCalledWith(
        [SUB2API_HEALTH_URL],
        { timeoutSecs: 8 },
      ),
    );
    expect(apiMocks.fetchModelsForConfig).not.toHaveBeenCalled();
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("本站 API Key 无效时不保存", async () => {
    const handleSubmit = vi.fn();
    apiMocks.fetchModelsForConfig.mockRejectedValue(new Error("HTTP 401"));
    mockFormValues = {
      name: "Sub2API",
      websiteUrl: SUB2API_ORIGIN,
      presetId: SUB2API_PRESET_ID,
      settingsConfig: JSON.stringify({
        env: { ANTHROPIC_AUTH_TOKEN: "bad-key" },
      }),
    };

    render(
      <AddProviderDialog
        open
        onOpenChange={vi.fn()}
        appId="claude"
        onSubmit={handleSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "common.add" }));

    await waitFor(() =>
      expect(apiMocks.showFetchModelsError).toHaveBeenCalled(),
    );
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("本站 Key 没有可用模型时不保存", async () => {
    const handleSubmit = vi.fn();
    apiMocks.fetchModelsForConfig.mockResolvedValue([]);
    mockFormValues = {
      name: "Sub2API",
      websiteUrl: SUB2API_ORIGIN,
      presetId: SUB2API_PRESET_ID,
      settingsConfig: JSON.stringify({
        env: { ANTHROPIC_AUTH_TOKEN: "empty-key" },
      }),
    };

    render(
      <AddProviderDialog
        open
        onOpenChange={vi.fn()}
        appId="claude"
        onSubmit={handleSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "common.add" }));

    await waitFor(() =>
      expect(apiMocks.fetchModelsForConfig).toHaveBeenCalled(),
    );
    expect(handleSubmit).not.toHaveBeenCalled();
  });

  it("本站健康且 Key 有模型时才保存", async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    mockFormValues = {
      name: "Sub2API",
      websiteUrl: SUB2API_ORIGIN,
      presetId: SUB2API_PRESET_ID,
      settingsConfig: JSON.stringify({
        env: { ANTHROPIC_AUTH_TOKEN: "valid-key" },
      }),
    };

    render(
      <AddProviderDialog
        open
        onOpenChange={vi.fn()}
        appId="claude"
        onSubmit={handleSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "common.add" }));

    await waitFor(() => expect(handleSubmit).toHaveBeenCalledTimes(1));
    expect(apiMocks.fetchModelsForConfig).toHaveBeenCalledWith(
      SUB2API_ORIGIN,
      "valid-key",
      false,
      SUB2API_MODELS_URL,
    );
  });
});
