import { describe, expect, it } from "vitest";
import {
  SUB2API_GEMINI_BASE_URL,
  SUB2API_GEMINI_MODELS_URL,
  SUB2API_HEALTH_URL,
  SUB2API_MODELS_URL,
  SUB2API_NAME,
  SUB2API_ORIGIN,
  SUB2API_PRESET_ID,
  SUB2API_V1_BASE_URL,
  getSub2apiConnection,
  sub2apiClaudeDesktopPreset,
  sub2apiClaudePreset,
  sub2apiCodexPreset,
  sub2apiGeminiPreset,
  sub2apiGrokBuildPreset,
  sub2apiHermesPreset,
  sub2apiOpenClawPreset,
  sub2apiOpenCodePreset,
} from "@/config/sub2apiProviderPresets";
import {
  extractCodexBaseUrl,
  extractCodexWireApi,
} from "@/utils/providerConfigUtils";

describe("Sub2API provider presets", () => {
  it("uses one fixed site identity and endpoint set", () => {
    expect(SUB2API_PRESET_ID).toBe("sub2api");
    expect(SUB2API_NAME).toBe("Sub2API");
    expect(SUB2API_ORIGIN).toBe("https://api.ai.let5see.xyz");
    expect(SUB2API_V1_BASE_URL).toBe(`${SUB2API_ORIGIN}/v1`);
    expect(SUB2API_GEMINI_BASE_URL).toBe(`${SUB2API_ORIGIN}/v1beta`);
    expect(SUB2API_HEALTH_URL).toBe(`${SUB2API_ORIGIN}/health`);
    expect(SUB2API_MODELS_URL).toBe(`${SUB2API_V1_BASE_URL}/models`);
    expect(SUB2API_GEMINI_MODELS_URL).toBe(
      `${SUB2API_GEMINI_BASE_URL}/models`,
    );
  });

  it("defines only neutral, non-promoted presets", () => {
    const presets = [
      sub2apiClaudePreset,
      sub2apiClaudeDesktopPreset,
      sub2apiCodexPreset,
      sub2apiGeminiPreset,
      sub2apiGrokBuildPreset,
      sub2apiOpenCodePreset,
      sub2apiOpenClawPreset,
      sub2apiHermesPreset,
    ];

    expect(presets).toHaveLength(8);
    for (const preset of presets) {
      expect(preset.name).toBe(SUB2API_NAME);
      expect(preset.websiteUrl).toBe(SUB2API_ORIGIN);
      expect("isOfficial" in preset && preset.isOfficial).not.toBe(true);
      expect(preset.isPartner).not.toBe(true);
      expect(preset.partnerPromotionKey).toBeUndefined();
    }
  });

  it("maps every client to the approved protocol endpoint", () => {
    expect(sub2apiClaudePreset.settingsConfig).toEqual({
      env: {
        ANTHROPIC_BASE_URL: SUB2API_ORIGIN,
        ANTHROPIC_AUTH_TOKEN: "",
      },
    });
    expect(sub2apiClaudePreset.apiFormat).toBe("anthropic");
    expect(sub2apiClaudePreset.modelsUrl).toBe(SUB2API_MODELS_URL);

    expect(sub2apiClaudeDesktopPreset.baseUrl).toBe(SUB2API_ORIGIN);
    expect(sub2apiClaudeDesktopPreset.mode).toBe("direct");
    expect(sub2apiClaudeDesktopPreset.apiFormat).toBe("anthropic");

    expect(extractCodexBaseUrl(sub2apiCodexPreset.config)).toBe(
      SUB2API_V1_BASE_URL,
    );
    expect(extractCodexWireApi(sub2apiCodexPreset.config)).toBe("responses");
    expect(sub2apiCodexPreset.apiFormat).toBe("openai_responses");

    expect(sub2apiGeminiPreset.settingsConfig).toEqual({
      env: {
        GOOGLE_GEMINI_BASE_URL: SUB2API_GEMINI_BASE_URL,
        GEMINI_API_KEY: "",
      },
    });

    expect(extractCodexBaseUrl(sub2apiGrokBuildPreset.config)).toBe(
      SUB2API_V1_BASE_URL,
    );
    expect(extractCodexWireApi(sub2apiGrokBuildPreset.config)).toBe(
      "responses",
    );
    expect(sub2apiGrokBuildPreset.apiFormat).toBe("openai_responses");

    expect(sub2apiOpenCodePreset.settingsConfig).toMatchObject({
      npm: "@ai-sdk/openai-compatible",
      options: { baseURL: SUB2API_V1_BASE_URL, apiKey: "" },
      models: {},
    });
    expect(sub2apiOpenClawPreset.settingsConfig).toEqual({
      baseUrl: SUB2API_V1_BASE_URL,
      apiKey: "",
      api: "openai-responses",
      models: [],
    });
    expect(sub2apiHermesPreset.settingsConfig).toEqual({
      name: "sub2api",
      base_url: SUB2API_V1_BASE_URL,
      api_key: "",
      api_mode: "codex_responses",
      models: [],
    });
  });

  it("extracts submitted keys and chooses the app-specific models endpoint", () => {
    expect(
      getSub2apiConnection("claude", {
        env: { ANTHROPIC_AUTH_TOKEN: "claude-key" },
      }),
    ).toEqual({
      apiKey: "claude-key",
      baseUrl: SUB2API_ORIGIN,
      modelsUrl: SUB2API_MODELS_URL,
    });
    expect(
      getSub2apiConnection("claude-desktop", {
        env: { ANTHROPIC_API_KEY: "desktop-key" },
      }),
    ).toMatchObject({ apiKey: "desktop-key" });
    expect(
      getSub2apiConnection("codex", {
        auth: { OPENAI_API_KEY: "codex-key" },
      }),
    ).toMatchObject({
      apiKey: "codex-key",
      baseUrl: SUB2API_V1_BASE_URL,
      modelsUrl: SUB2API_MODELS_URL,
    });
    expect(
      getSub2apiConnection("gemini", {
        env: { GEMINI_API_KEY: "gemini-key" },
      }),
    ).toEqual({
      apiKey: "gemini-key",
      baseUrl: SUB2API_GEMINI_BASE_URL,
      modelsUrl: SUB2API_GEMINI_MODELS_URL,
    });
    expect(
      getSub2apiConnection("grokbuild", {
        config: `[model."grok-4.5"]\napi_key = "grok-key"`,
      }),
    ).toMatchObject({ apiKey: "grok-key" });
    expect(
      getSub2apiConnection("opencode", {
        options: { apiKey: "opencode-key" },
      }),
    ).toMatchObject({ apiKey: "opencode-key" });
    expect(
      getSub2apiConnection("openclaw", { apiKey: "openclaw-key" }),
    ).toMatchObject({ apiKey: "openclaw-key" });
    expect(
      getSub2apiConnection("hermes", { api_key: "hermes-key" }),
    ).toMatchObject({ apiKey: "hermes-key" });
  });
});
