import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FLOW',
    short_name: 'FLOW',
    description: 'Persoonlijk werk- en levensbesturingssysteem',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F1F4F2',
    theme_color: '#1F9254',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
