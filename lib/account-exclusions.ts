export type AccountExclusion = {
	readonly index: number;
	readonly reasons: readonly string[];
};

export function formatAccountExclusions(
	entries: readonly AccountExclusion[],
	attempted: ReadonlySet<number>,
): string {
	const prefix = "Account exclusions: ";
	const parts: string[] = [];
	for (const entry of entries.slice(0, 8)) {
		const reasons = new Set(entry.reasons.slice(0, 4).flatMap((reason) => {
			switch (reason) {
				case "eligible": return [];
				case "disabled":
				case "disabled:auth-failures":
				case "disabled:workspace-deactivated":
				case "disabled:reauth-required":
				case "quota-exhausted":
				case "rate-limited":
				case "cooldown":
				case "cooldown:auth-failure":
				case "cooldown:network-error":
				case "token-bucket-empty":
				case "outside-pool": return [reason];
				default: return ["unknown"];
			}
		}));
		if (attempted.has(entry.index)) reasons.add("already-attempted");
		if (reasons.size === 0) reasons.add("unknown");
		const account = Number.isSafeInteger(entry.index) && entry.index >= 0 && entry.index < Number.MAX_SAFE_INTEGER
			? `#${entry.index + 1}` : "#unknown";
		const omittedReasons = entry.reasons.length > 4
			? `,+${entry.reasons.length - 4} reasons omitted` : "";
		const part = `${account}=${[...reasons].join(",")}${omittedReasons}`;
		const remaining = entries.length - parts.length - 1;
		const suffix = remaining > 0 ? `; ${remaining} account(s) omitted` : "";
		if (`${prefix}${[...parts, part].join("; ")}${suffix}.`.length > 256) break;
		parts.push(part);
	}
	const omitted = entries.length - parts.length;
	const suffix = omitted > 0 ? `; ${omitted} account(s) omitted` : "";
	return `${prefix}${parts.length > 0 ? parts.join("; ") : "unknown"}${suffix}.`;
}
