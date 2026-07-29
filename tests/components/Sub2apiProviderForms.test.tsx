import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Form } from "@/components/ui/form";
import {
  ProviderPresetSelector,
  type PresetEntry,
} from "@/components/providers/forms/ProviderPresetSelector";
import {
  SUB2API_PRESET_ID,
  getSub2apiPreset,
} from "@/config/sub2apiProviderPresets";
import type { AppId } from "@/lib/api";
import { useForm } from "react-hook-form";

const appIds: AppId[] = [
  "claude",
  "claude-desktop",
  "codex",
  "gemini",
  "grokbuild",
  "opencode",
  "openclaw",
  "hermes",
];

describe("Sub2API add-provider entries", () => {
  it.each(appIds)("%s only supplies the Sub2API preset", (appId) => {
    const entry: PresetEntry = {
      id: SUB2API_PRESET_ID,
      preset: getSub2apiPreset(appId),
    };

    expect(entry).toMatchObject({
      id: "sub2api",
      preset: { name: "Sub2API" },
    });
  });

  it("keeps custom configuration beside the single site preset", () => {
    const Wrapper = () => {
      const form = useForm();
      return (
        <Form {...form}>
          <ProviderPresetSelector
            selectedPresetId="custom"
            presetEntries={[
              {
                id: SUB2API_PRESET_ID,
                preset: getSub2apiPreset("claude"),
              },
            ]}
            presetCategoryLabels={{}}
            onPresetChange={vi.fn()}
          />
        </Form>
      );
    };

    render(<Wrapper />);

    expect(
      screen.getByRole("button", { name: "providerPreset.custom" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sub2API" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Kimi")).not.toBeInTheDocument();
    expect(screen.queryByText("OpenAI Official")).not.toBeInTheDocument();
  });
});
