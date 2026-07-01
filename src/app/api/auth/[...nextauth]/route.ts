import { handlers } from "@/auth";

// Auth.js catch-all endpoint (US-030): sign-in / sign-out / session / csrf.
export const { GET, POST } = handlers;
