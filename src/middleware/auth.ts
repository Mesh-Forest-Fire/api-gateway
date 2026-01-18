export type Credentials = {
	username: string;
	password: string;
};

export function isAuthEnabled(): boolean {
	return String(process.env.AUTH_ENABLED || "").toLowerCase() === "true";
}

export function getExpectedCredentials(): Credentials | null {
	const username = process.env.AUTH_USERNAME;
	const password = process.env.AUTH_PASSWORD;

	if (!username || !password) {
		return null;
	}

	return { username, password };
}

export function parseBasicAuthHeader(headerValue?: string): Credentials | null {
	if (!headerValue) {
		return null;
	}

	const [scheme, encoded] = headerValue.split(" ");
	if (!encoded || scheme.toLowerCase() !== "basic") {
		return null;
	}

	try {
		const decoded = Buffer.from(encoded, "base64").toString("utf8");
		const separatorIndex = decoded.indexOf(":");
		if (separatorIndex <= 0) {
			return null;
		}

		const username = decoded.slice(0, separatorIndex);
		const password = decoded.slice(separatorIndex + 1);
		if (!username || !password) {
			return null;
		}

		return { username, password };
	} catch {
		return null;
	}
}
