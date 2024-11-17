import { marked } from "marked";

export function plainTextRenderer() {
  const render = new marked.Renderer();

  render.blockquote = ({ tokens }) =>
    `"${tokens.map((t) => t.raw).join("")}"\n`;

  render.br = () => "\n";

  render.checkbox = ({ checked }) => `[${checked ? "X" : " "}]`;

  render.code = ({ text }) => `\`\`\`\n${text}\n\`\`\``;

  render.codespan = ({ text }) => `\`${text}\``;

  render.em = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}`;

  render.em = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}`;

  render.heading = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}\n`;

  render.hr = () => "";

  render.html = () => "";

  render.image = ({ href, title, text }) =>
    `Image: ${text} [${title} (${href})]`;

  render.link = ({ href, title }) => `[${title}](${href})`;

  render.list = (token) =>
    token.items
      .map(
        (item, index) =>
          `${token.ordered ? `${index + 1}.` : "-"} ${item.text}`,
      )
      .join("\n") + "\n\n";

  render.listitem = (item) => ` - ${item.text}`;

  render.paragraph = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}\n\n`;

  render.strong = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}`;

  render.table = (token) => token.raw;

  render.text = (token) => token.text;

  return render;
}
