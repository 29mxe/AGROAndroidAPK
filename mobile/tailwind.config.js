/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.tsx", "./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  corePlugins: {
    space: false,
  },
  theme: {
    // NOTE to AI: You can extend the theme with custom colors or styles here.
    extend: {
      colors: {
        field: "#F4EFE3", // app background — warm beige
        parchment: "#FDFAF2", // cards / surfaces
        wheat: "#E5DCC5", // borders, subtle fills
        forest: "#2E4A34", // primary dark green
        moss: "#5F7E52", // secondary green
        leaf: "#8FAE6B", // light green accent
        soil: "#7A5638", // brown
        clay: "#BC5B33", // terracotta (likes, accents)
        bark: "#33291E", // primary text — dark warm brown
        stone: "#8C8271", // muted text
      },
      fontFamily: {
        display: ["Alegreya_700Bold"],
        displaymed: ["Alegreya_500Medium"],
        sans: ["GolosText_400Regular"],
        gmedium: ["GolosText_500Medium"],
        gsemibold: ["GolosText_600SemiBold"],
        gbold: ["GolosText_700Bold"],
      },
      fontSize: {
        xs: "10px",
        sm: "12px",
        base: "14px",
        lg: "18px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        "5xl": "48px",
        "6xl": "56px",
        "7xl": "64px",
        "8xl": "72px",
        "9xl": "80px",
      },
    },
  },
  darkMode: "class",
  plugins: [
    plugin(({ matchUtilities, theme }) => {
      const spacing = theme("spacing");

      // space-{n}  ->  gap: {n}
      matchUtilities(
        { space: (value) => ({ gap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-x-{n}  ->  column-gap: {n}
      matchUtilities(
        { "space-x": (value) => ({ columnGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );

      // space-y-{n}  ->  row-gap: {n}
      matchUtilities(
        { "space-y": (value) => ({ rowGap: value }) },
        { values: spacing, type: ["length", "number", "percentage"] }
      );
    }),
  ],
};

