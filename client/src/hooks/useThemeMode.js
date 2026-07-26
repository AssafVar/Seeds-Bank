import { useContext } from "react";
import ThemeContext from "../contexts/ThemeContext";

export default function useThemeMode() {
  return useContext(ThemeContext);
}
