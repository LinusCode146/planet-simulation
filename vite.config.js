import { defineConfig } from 'vite';

export default defineConfig({
    root: './src', // Set the source directory
    build: {
        outDir: '../dist', // The directory where the build output will be placed
        sourcemap: true,  // Enable sourcemaps for debugging
    },
});
