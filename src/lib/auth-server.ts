import { getRequest } from "@tanstack/react-start/server";
import { parse } from "cookie";

export async function getToken() {
	const request = getRequest();
	if (!request) return undefined;

	const cookieHeader = request.headers.get("Cookie");
	if (!cookieHeader) return undefined;

	const cookies = parse(cookieHeader);
	return cookies["convex-auth-session-token"];
}
