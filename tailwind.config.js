// default settings can be found here
// https://unpkg.com/browse/tailwindcss@2.2.17/stubs/defaultConfig.stub.js

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  plugins: [require("@tailwindcss/typography"), require("daisyui")],
  daisyui: {
    themes: ["night", "lofi"],
  },
};
