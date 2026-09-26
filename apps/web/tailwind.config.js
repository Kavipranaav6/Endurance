/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "#FFFFFF",
          subtle: "#FAFAFA",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          card: "#FFFFFF",
          elevated: "#F9FAFB",
          input: "#FFFFFF",
        },
        border: {
          DEFAULT: "#E5E7EB",
          default: "#E5E7EB",
          subtle: "#F3F4F6",
        },
        primary: {
          DEFAULT: "#1A1A1A",
          muted: "#6B7280",
        },
        "text-primary": "#1A1A1A",
        "text-muted": "#6B7280",
        accent: {
          DEFAULT: "#3F3F9E",
          hover: "#323282",
          subtle: "#EEF0F9",
        },
        "brand-primary": {
          DEFAULT: "#3F3F9E",
          hover: "#323282",
        },
        status: {
          draft: "#6B7280",
          waiting: "#D97706",
          ready: "#2563EB",
          done: "#16A34A",
          cancelled: "#9CA3AF",
          late: "#DC2626",
          danger: "#DC2626",
          success: "#16A34A",
        },
        "status-danger": "#DC2626",
        "status-success": "#16A34A",
      },
      fontFamily: {
        sans: ["Inter", "IBM Plex Sans", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
        "12": "48px",
        "16": "64px",
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "2px",
        md: "4px",
        lg: "6px",
      },
    },
  },
  plugins: [],
};
