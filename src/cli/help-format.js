import { theme } from "../terminal/theme.js";
export 
export function formatHelpExample(command, description) {
  return "  
    ";
}

export function formatHelpExampleLine(command, description) {
  if (!description) {
    return "  ";
  }
  return "   ";
}

export function formatHelpExamples(examples, inline = false) {
  const formatter = inline ? formatHelpExampleLine : formatHelpExample;
  return examples.map(([command, description]) => formatter(command, description)).join("
");
}

export function formatHelpExampleGroup(label, examples, inline = false) {
  return "
";
}

