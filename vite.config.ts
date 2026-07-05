import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	server: {
		port: parseInt(process.env.VITE_PORT || '9393'),
		strictPort: true
	},
	preview: {
		port: parseInt(process.env.VITE_PREVIEW_PORT || '9595'),
		strictPort: true
	}
});
