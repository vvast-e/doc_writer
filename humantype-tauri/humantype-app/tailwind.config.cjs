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
                // Новая палитра
                brand: {
                    cyan: '#00d9ff',
                    green: '#00c851',
                    orange: '#ffaa53',
                    red: '#ff6b6b',
                    purple: '#a855f7',
                },
                surface: {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617',
                },
                background: {
                    primary: '#0a0a0f',
                    secondary: '#0f0f1a',
                    tertiary: '#1a1a2e',
                },
            },
            boxShadow: {
                'glow-cyan': '0 0 20px rgba(0, 217, 255, 0.3)',
                'glow-green': '0 0 20px rgba(0, 200, 81, 0.3)',
                'glow-orange': '0 0 20px rgba(255, 170, 83, 0.3)',
                'glow-red': '0 0 20px rgba(255, 107, 107, 0.3)',
                'inner-glow': 'inset 0 0 20px rgba(0, 217, 255, 0.1)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'bounce-slow': 'bounce 3s infinite',
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
                'scale-in': 'scaleIn 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.9)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
};