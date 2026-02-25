const fs = require('fs');
const path = './components/SettingsPanel.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add useTheme import
if (!content.includes('useTheme')) {
  content = content.replace(
    "import { T } from '../theme';",
    "import { T } from '../theme';\nimport { useTheme } from './ThemeProvider';"
  );
}

// 2. Inject useTheme and useMemo into the component
content = content.replace(
  "export default function SettingsPanel({ visible, onClose, gatewayStatus }: Props) {",
  "export default function SettingsPanel({ visible, onClose, gatewayStatus }: Props) {\n    const { colors, isDark } = useTheme();\n    const styles = React.useMemo(() => createStyles(colors, T, isDark), [colors, isDark]);"
);

// 3. Update ActivityIndicator inline colors
content = content.replace(/color=\{T\.accent\}/g, "color={colors.accent}");
content = content.replace(/color="\#fff"/g, "color={colors.bg}");

// 4. Change styles to createStyles
content = content.replace(
  "const styles = StyleSheet.create({",
  "const createStyles = (colors: any, T: any, isDark: boolean) => StyleSheet.create({"
);

// 5. Replace static colors in the styles object
content = content.replace(/backgroundColor: 'rgba\(0,0,0,0\.85\)'/g, "backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.7)'");
content = content.replace(/backgroundColor: '\#0D0D0D'/g, "backgroundColor: colors.bg");
content = content.replace(/backgroundColor: 'rgba\(255,255,255,0\.04\)'/g, "backgroundColor: colors.cardBgHover");
content = content.replace(/backgroundColor: '\#0A0A0A'/g, "backgroundColor: colors.cardBg");
content = content.replace(/color: '\#fff'/g, "color: colors.bg");

// Replace all T.[color] with colors.[color] in the stylesheet area.
// We map known color properties
const colorProps = ['accent', 'bg', 'cardBg', 'border', 'textPrimary', 'textSecondary', 'textTertiary', 'textMuted', 'success', 'danger', 'warning', 'info', 'successLight', 'dangerLight'];

colorProps.forEach(color => {
  const regex = new RegExp(`T\\.${color}\\b`, 'g');
  content = content.replace(regex, `colors.${color}`);
});

fs.writeFileSync(path, content, 'utf8');
console.log('SettingsPanel.tsx refactored successfully.');
