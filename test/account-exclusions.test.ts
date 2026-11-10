import { describe, expect, it } from "vitest";
import { formatAccountExclusions } from "../lib/account-exclusions.js";

describe("account exclusion message boundary", () => {
	it("emits fixed reason codes and numeric account numbers without other metadata", () => {
		const entry = {
			index: 1,
			reasons: ["quota-exhausted", "cooldown:network-error", "FAKE_SECRET bearer@private.test"],
			email: "FAKE_SECRET@example.test", accountId: "FAKE_SECRET_ID", balance: 987654,
			request: { body: "FAKE_SECRET_PROMPT", headers: { authorization: "FAKE_SECRET" } },
		};

		const message = formatAccountExclusions([entry], new Set([1]));

		expect(message).toBe("Account exclusions: #2=quota-exhausted,cooldown:network-error,unknown,already-attempted.");
		expect(message).not.toMatch(/FAKE_SECRET|987654|private\.test/);
	});

	it.each([
		{ reasons: [], attempted: [], expected: "unknown" },
		{ reasons: ["eligible"], attempted: [], expected: "unknown" },
		{ reasons: ["eligible"], attempted: [0], expected: "already-attempted" },
		{ reasons: ["outside-pool", "disabled:reauth-required"], attempted: [], expected: "outside-pool,disabled:reauth-required" },
	])("preserves unknown information and explicit traversal exclusions: $expected", ({ reasons, attempted, expected }) => {
		expect(formatAccountExclusions([{ index: 0, reasons }], new Set(attempted)))
			.toBe(`Account exclusions: #1=${expected}.`);
	});

	it("reports unavailable observations without inventing an account number", () => {
		expect(formatAccountExclusions([], new Set())).toBe("Account exclusions: unknown.");
		expect(formatAccountExclusions([{ index: Number.NaN, reasons: [] }], new Set()))
			.toBe("Account exclusions: #unknown=unknown.");
	});

	it("caps the account list and explicitly counts omitted accounts", () => {
		const entries = Array.from({ length: 30 }, (_, index) => ({ index, reasons: ["quota-exhausted"] }));

		const message = formatAccountExclusions(entries, new Set());

		expect(message).toContain("#8=quota-exhausted; 22 account(s) omitted.");
		expect(message).not.toContain("#9=");
	});

	it("fits long mixed exclusions within 256 characters with explicit omissions", () => {
		const entries = Array.from({ length: 30 }, (_, index) => ({
			index, reasons: ["quota-exhausted", "rate-limited", "cooldown:network-error", "token-bucket-empty"],
		}));

		const message = formatAccountExclusions(entries, new Set());

		expect(message.length).toBeLessThanOrEqual(256);
		expect(message).toContain("28 account(s) omitted.");
		expect(message).toContain("#2=");
		expect(message).not.toContain("#3=");
	});

	it("caps inspected reasons and reports their omitted count without exposing them", () => {
		const reasons = ["rate-limited", "quota-exhausted", "cooldown", "token-bucket-empty", ...Array<string>(96).fill("FAKE_SECRET")];

		const message = formatAccountExclusions([{ index: 0, reasons }], new Set());

		expect(message).toContain("+96 reasons omitted");
		expect(message).not.toContain("FAKE_SECRET");
	});
});
