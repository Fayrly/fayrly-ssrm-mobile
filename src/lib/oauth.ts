export type OAuthProviderName = 'Google' | 'Apple';

class OAuthUnavailableError extends Error {}

export async function providerIdToken(provider: OAuthProviderName): Promise<string> {
  throw new OAuthUnavailableError(provider);
}

export function providerErrorMessage(error: unknown, provider: OAuthProviderName): string | null {
  if (error instanceof OAuthUnavailableError) {
    return `Masuk dengan ${provider} belum tersedia di aplikasi ini. Gunakan email dan kata sandi.`;
  }
  return null;
}
