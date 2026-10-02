// The ONLY file that reads import.meta.env. Jest swaps it for web/test/envStub.ts.
export const env = {
  ragUrl: (import.meta.env.VITE_RAG_URL as string | undefined) ?? '',
  posthogKey: (import.meta.env.VITE_POSTHOG_KEY as string | undefined) ?? '',
  posthogHost: (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? '',
};
