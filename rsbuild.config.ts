import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: 'Speed Dating Meetup',
    meta: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      description: 'Speed Dating Meetup — works on web and mobile',
      'theme-color': '#0f766e',
    },
    tags: [
      {
        tag: 'link',
        attrs: {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
      },
      {
        tag: 'link',
        attrs: {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
      },
      {
        tag: 'link',
        attrs: {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,700;1,9..40,400&display=swap',
        },
      },
    ],
  },
  server: {
    host: '0.0.0.0',
  },
});
