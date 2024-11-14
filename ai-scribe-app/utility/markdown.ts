import { marked } from "marked";

export function plainTextRenderer() {
  const render = new marked.Renderer();

  render.blockquote = ({ tokens }) =>
    `"${tokens.map((t) => t.raw).join("")}"\n`;

  render.br = () => "\n";

  render.checkbox = ({ checked }) => `[${checked ? "X" : " "}]`;

  render.code = ({ text }) => text;

  render.codespan = ({ text }) => `\`${text}\``;

  render.em = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}`;

  render.em = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}`;

  render.heading = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}\n`;

  render.hr = () => "";

  render.html = () => "";

  render.image = ({ href, title, text }) =>
    `Image: ${text} [${title} (${href})]`;

  render.link = ({ href, title }) => `Link: [${title} (${href})]`;

  render.list = (token) =>
    token.items
      .map(
        (item, index) =>
          `${token.ordered ? `${index + 1}.` : "-"} ${item.text}`,
      )
      .join("\n") + "\n\n";

  render.listitem = (item) => ` - ${item.text}`;

  render.paragraph = ({ tokens }) =>
    `${tokens
      .map((t) => t.raw)
      .join("")
      .replace(/(_+)(.*)\1/g, "$2") // Remove balanced underline pairs
      .replace(/(\*+)(.*)\1/g, "$2")}\n\n`; // Remove balanced asterisk pairs

  render.strong = ({ tokens }) => `${tokens.map((t) => t.raw).join("")}`;

  render.tablecell = (token) => `| ${token.text}`;

  render.tablerow = ({ text }) => `${text}\n`;

  render.text = (token) => token.text;

  return render;
}
