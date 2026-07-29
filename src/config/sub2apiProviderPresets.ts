import type { ProviderPreset } from "./claudeProviderPresets";
import type { ClaudeDesktopProviderPreset } from "./claudeDesktopProviderPresets";
import {
  generateThirdPartyAuth,
  generateThirdPartyConfig,
  type CodexProviderPreset,
} from "./codexProviderPresets";
import type { GeminiProviderPreset } from "./geminiProviderPresets";
import type { GrokBuildProviderPreset } from "./grokBuildProviderPresets";
import type { OpenCodeProviderPreset } from "./opencodeProviderPresets";
import type { OpenClawProviderPreset } from "./openclawProviderPresets";
import type { HermesProviderPreset } from "./hermesProviderPresets";
import type { AppId } from "@/lib/api";

export const SUB2API_PRESET_ID = "sub2api";
export const SUB2API_NAME = "Sub2API";
export const SUB2API_ORIGIN = "https://api.ai.let5see.xyz";
export const SUB2API_V1_BASE_URL = `${SUB2API_ORIGIN}/v1`;
export const SUB2API_GEMINI_BASE_URL = `${SUB2API_ORIGIN}/v1beta`;
export const SUB2API_HEALTH_URL = `${SUB2API_ORIGIN}/health`;
export const SUB2API_MODELS_URL = `${SUB2API_V1_BASE_URL}/models`;
export const SUB2API_GEMINI_MODELS_URL = `${SUB2API_GEMINI_BASE_URL}/models`;

const common = {
  name: SUB2API_NAME,
  websiteUrl: SUB2API_ORIGIN,
} as const;

export const sub2apiClaudePreset: ProviderPreset = {
  ...common,
  settingsConfig: {
    env: {
      ANTHROPIC_BASE_URL: SUB2API_ORIGIN,
      ANTHROPIC_AUTH_TOKEN: "",
    },
  },
  apiKeyField: "ANTHROPIC_AUTH_TOKEN",
  apiFormat: "anthropic",
  endpointCandidates: [SUB2API_ORIGIN],
  modelsUrl: SUB2API_MODELS_URL,
};

export const sub2apiClaudeDesktopPreset: ClaudeDesktopProviderPreset = {
  ...common,
  baseUrl: SUB2API_ORIGIN,
  apiKeyField: "ANTHROPIC_AUTH_TOKEN",
  mode: "direct",
  apiFormat: "anthropic",
  endpointCandidates: [SUB2API_ORIGIN],
};

export const sub2apiCodexPreset: CodexProviderPreset = {
  ...common,
  auth: generateThirdPartyAuth(""),
  config: generateThirdPartyConfig(
    SUB2API_NAME,
    SUB2API_V1_BASE_URL,
    "",
  ),
  apiFormat: "openai_responses",
  endpointCandidates: [SUB2API_V1_BASE_URL],
};

export const sub2apiGeminiPreset: GeminiProviderPreset = {
  ...common,
  settingsConfig: {
    env: {
      GOOGLE_GEMINI_BASE_URL: SUB2API_GEMINI_BASE_URL,
      GEMINI_API_KEY: "",
    },
  },
  baseURL: SUB2API_GEMINI_BASE_URL,
  endpointCandidates: [SUB2API_GEMINI_BASE_URL],
};

export const sub2apiGrokBuildPreset: GrokBuildProviderPreset = {
  ...common,
  auth: generateThirdPartyAuth(""),
  config: generateThirdPartyConfig(
    SUB2API_NAME,
    SUB2API_V1_BASE_URL,
    "",
  ),
  apiFormat: "openai_responses",
  endpointCandidates: [SUB2API_V1_BASE_URL],
};

export const sub2apiOpenCodePreset: OpenCodeProviderPreset = {
  ...common,
  settingsConfig: {
    npm: "@ai-sdk/openai-compatible",
    name: SUB2API_NAME,
    options: {
      baseURL: SUB2API_V1_BASE_URL,
      apiKey: "",
      setCacheKey: true,
    },
    models: {},
  },
};

export const sub2apiOpenClawPreset: OpenClawProviderPreset = {
  ...common,
  settingsConfig: {
    baseUrl: SUB2API_V1_BASE_URL,
    apiKey: "",
    api: "openai-responses",
    models: [],
  },
};

export const sub2apiHermesPreset: HermesProviderPreset = {
  ...common,
  settingsConfig: {
    name: "sub2api",
    base_url: SUB2API_V1_BASE_URL,
    api_key: "",
    api_mode: "codex_responses",
    models: [],
  },
};

const presetsByApp = {
  claude: sub2apiClaudePreset,
  "claude-desktop": sub2apiClaudeDesktopPreset,
  codex: sub2apiCodexPreset,
  gemini: sub2apiGeminiPreset,
  grokbuild: sub2apiGrokBuildPreset,
  opencode: sub2apiOpenCodePreset,
  openclaw: sub2apiOpenClawPreset,
  hermes: sub2apiHermesPreset,
} as const;

export function getSub2apiPreset(appId: AppId) {
  return presetsByApp[appId];
}
