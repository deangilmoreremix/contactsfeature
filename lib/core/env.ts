export function requireEnv(name: string): string {
  const value = import.meta.env[name];
  if (!value) {
    console.warn(`Missing environment variable: ${name}. Using fallback for demo mode.`);
    return '';
  }
  return value;
}
