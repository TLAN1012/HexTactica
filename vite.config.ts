import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages 會把網站部署在 /HexTactica/ 子路徑下
// 本地 dev 時用根路徑
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "/HexTactica/" : "/",
}));
