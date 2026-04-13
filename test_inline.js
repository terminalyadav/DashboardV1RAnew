
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                        heading: ['Outfit', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                    },
                    colors: {
                        space: '#020203',
                        indigo: { 400: '#a3f01b', 500: '#8cdd00', 600: '#72b500' },
                        emerald: { 400: '#34D399', 500: '#10B981' },
                        amber: { 500: '#F59E0B' },
                        pink: { 500: '#EC4899' },
                        cyan: { 400: '#22d3ee', 500: '#06b6d4' },
                    },
                    animation: {
                        'count-up': 'countUp 2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        'log-scroll': 'logScroll 0.3s ease-out',
                    }
                }
            }
        }
    