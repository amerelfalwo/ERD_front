export function getLogoUrl(logoPath) {
  if (!logoPath) return null;
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://') || logoPath.startsWith('data:')) {
    return logoPath;
  }
  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const path = logoPath.startsWith('/') ? logoPath : `/${logoPath}`;
  return `${baseUrl}${path}`;
}
