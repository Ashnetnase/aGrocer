import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Agrocer',
    short_name: 'Agrocer',
    description: 'Meals, pantry and groceries for the whole family.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F0EAE0',
    theme_color: '#F7F3EC',
    lang: 'en-NZ',
    categories: ['food', 'lifestyle', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Shopping list', url: '/shopping' },
      { name: 'Shopping mode', url: '/shopping/mode' },
      { name: 'Pantry', url: '/pantry' },
    ],
  };
}
