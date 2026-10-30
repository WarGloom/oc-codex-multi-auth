import { describe, it, expect } from "vitest";
import { getNormalizedModel, MODEL_MAP } from "../lib/request/helpers/model-map.js";
import { getModelFamily, MODEL_FAMILIES } from "../lib/prompts/codex.js";
import { normalizeModel, getReasoningConfig } from "../lib/request/request-transformer.js";
import { DEFAULT_UNSUPPORTED_CODEX_FALLBACK_CHAIN } from "../lib/request/fetch-helpers.js";
import { usesResponsesLite } from "../lib/request/helpers/responses-lite.js";
import { resolveClientIdentity } from "../lib/request/helpers/client-identity.js";

/**
 * GPT-6.1 Terra, added to the Codex catalog 2026-10-26 (openai/codex 126a0ee9,
 * PR #57293). Its catalog entry mirrors GPT-6.1 Sol's request shape, but it is a
 * distinct backend model and must never be served as Sol.
 */
const TERRA61 = "gpt-6.1-terra";
const SOL61 = "gpt-6.1-sol";
const TERRA61_EFFORTS = ["low", "medium", "high", "xhigh", "max", "ultra"] as const;

describe("GPT-6.1 Terra Model Support", () => {
	describe("normalization", () => {
		it("keeps the canonical id and every catalog effort on Terra", () => {
			expect(normalizeModel(TERRA61)).toBe(TERRA61);
			expect(getNormalizedModel(TERRA61)).toBe(TERRA61);
			for (const effort of TERRA61_EFFORTS) {
				expect(normalizeModel(`${TERRA61}-${effort}`)).toBe(TERRA61);
			}
			expect(normalizeModel(`openai/${TERRA61}-high`)).toBe(TERRA61);
		});

		it("has no none/minimal alias", () => {
			expect(MODEL_MAP[`${TERRA61}-none`]).toBeUndefined();
			expect(MODEL_MAP[`${TERRA61}-minimal`]).toBeUndefined();
		});

		it("is never collapsed onto Sol", () => {
			expect(normalizeModel("GPT 6.1 Terra (OAuth)")).toBe(TERRA61);
			expect(normalizeModel("gpt-6.1")).toBe(SOL61);
		});
	});

	describe("model family", () => {
		it("gets its own registered family, separate from Sol's rotation state", () => {
			expect(getModelFamily(TERRA61)).toBe(TERRA61);
			expect(getModelFamily(`${TERRA61}-ultra`)).toBe(TERRA61);
			expect(MODEL_FAMILIES).toContain(TERRA61);
		});
	});

	describe("reasoning effort", () => {
		it("accepts the catalog's low..ultra envelope", () => {
			expect(getReasoningConfig(TERRA61, { reasoningEffort: "max" }).effort).toBe("max");
			expect(getReasoningConfig(TERRA61, { reasoningEffort: "xhigh" }).effort).toBe("xhigh");
			expect(getReasoningConfig(TERRA61, { reasoningEffort: "ultra" }).effort).toBe("max");
			expect(getReasoningConfig(TERRA61, { reasoningEffort: "none" }).effort).toBe("low");
		});
	});

	describe("wire shape", () => {
		it("uses the responses-lite path and the opencode originator", () => {
			expect(usesResponsesLite(TERRA61)).toBe(true);
			expect(usesResponsesLite(`openai/${TERRA61}-high`)).toBe(true);
			expect(resolveClientIdentity(TERRA61).originator).toBe("opencode");
		});
	});

	describe("fallback", () => {
		it("is neither degraded onto another model nor used as a fallback target", () => {
			expect(DEFAULT_UNSUPPORTED_CODEX_FALLBACK_CHAIN[TERRA61]).toBeUndefined();
			for (const chain of Object.values(DEFAULT_UNSUPPORTED_CODEX_FALLBACK_CHAIN)) {
				expect(chain).not.toContain(TERRA61);
			}
		});
	});
});

describe("unknown slug-form models", () => {
	it("are sent as typed instead of being rewritten onto a known model", () => {
		expect(normalizeModel("gpt-6.1-nonexistent")).toBe("gpt-6.1-nonexistent");
		expect(normalizeModel("openai/gpt-7-sol")).toBe("gpt-7-sol");
	});

	it("still resolve an effort suffix on a known model through the map", () => {
		expect(normalizeModel(`${SOL61}-xhigh`)).toBe(SOL61);
	});
});
