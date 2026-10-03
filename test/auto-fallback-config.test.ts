import { afterEach, describe, expect, it, vi } from "vitest";
import { isDefaultAutoFallbackModel, resolveUnsupportedCodexFallbackModel } from "../lib/request/fetch-helpers.js";
import { PluginConfigSchema } from "../lib/schemas.js";

describe("JSON equivalents of existing auto-fallback opt-outs", () => {
	afterEach(() => vi.unstubAllEnvs());
	it.each([
		{ model: "gpt-6-astra", env: "CODEX_AUTH_DISABLE_GPT6_AUTO_FALLBACK", config: { disableGpt6AutoFallback: true } },
		{ model: "gpt-5.6-sol", env: "CODEX_AUTH_DISABLE_GPT56_AUTO_FALLBACK", config: { disableGpt56AutoFallback: true } },
		{ model: "gpt-5.5", env: "CODEX_AUTH_DISABLE_GPT55_AUTO_FALLBACK", config: { disableGpt55AutoFallback: true } },
		{ model: "gpt-5-codex", env: "CODEX_AUTH_DISABLE_CODEX_AUTO_FALLBACK", config: { disableCodexAutoFallback: true } },
	])("keeps $model selected for both automatic fallback paths", ({ model, env, config }) => {
		vi.stubEnv(env, undefined);
		const parsed = PluginConfigSchema.parse(config);
		expect(parsed).toEqual(config);
		expect(isDefaultAutoFallbackModel(model, [], parsed)).toBe(false);
		expect(resolveUnsupportedCodexFallbackModel({
			requestedModel: model,
			errorBody: { error: { code: "model_not_supported_with_chatgpt_account",
				message: `The '${model}' model is not supported when using Codex with a ChatGPT account.` } },
			fallbackOnUnsupportedCodexModel: false, fallbackToGpt52OnUnsupportedGpt53: true,
			autoFallbackConfig: parsed,
		})).toBeUndefined();
		vi.stubEnv(env, "0");
		expect(isDefaultAutoFallbackModel(model, [], parsed)).toBe(true);
		vi.stubEnv(env, "1");
		expect(isDefaultAutoFallbackModel(model, [], {})).toBe(false);
	});
});
