import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#F7F9FC",
        headerBlue: "#D9EAF7",
        borderSoft: "#D0D7DE"
      },
      fontFamily: {
        sans: ["Arial", '"Microsoft YaHei"', '"PingFang SC"', "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
