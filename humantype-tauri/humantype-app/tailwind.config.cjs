/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#ff4b3a',
                    dark: '#e53b2b',
                },
                accent: '#3dd68c',
            },
        },
    },
    plugins: [],
};