import ReactMarkdown from "react-markdown";

import { Divider } from "@heroui/divider";

export const Markdown = ({ children }: { children: string }) => (
  <ReactMarkdown
    className="flex flex-col gap-1 leading-normal p-0"
    components={{
      h1({ ...rest }) {
        return (
          // eslint-disable-next-line jsx-a11y/heading-has-content
          <h1 className="font-semibold mt-4 first:mt-0 [&+*]:mt-0" {...rest} />
        );
      },
      h2({ ...rest }) {
        return (
          // eslint-disable-next-line jsx-a11y/heading-has-content
          <h2 className="italic mt-4 first:mt-0 [&+*]:mt-0" {...rest} />
        );
      },
      p({ ...rest }) {
        return (
          <p className="mt-4 first:mt-0 [&+ul]:mt-0 [&+ol]:mt-0" {...rest} />
        );
      },
      blockquote({ ...rest }) {
        return (
          <blockquote
            className="[&>p]:my-0 py-1 ms-4 ps-3 border-s-1 flex flex-col gap-4"
            {...rest}
          />
        );
      },
      pre({ ...rest }) {
        return <pre className="text-sm" {...rest} />;
      },
      ul({ ...rest }) {
        return (
          <ul
            className="list-['-_'] list-outside flex flex-col ps-3 mt-4 first:mt-0"
            {...rest}
          />
        );
      },
      ol({ ...rest }) {
        return (
          <ul
            className="list-decimal list-outside flex flex-col ps-6 mt-4 first:mt-0"
            {...rest}
          />
        );
      },
      hr() {
        return <Divider className="mx-auto w-[98%]" />;
      },
      a({ href, title, children, ...rest }) {
        return (
          <span {...rest}>
            {children && children !== href
              ? `[${children}](${href}${title ? ` "${title}"` : ""})`
              : `<${href}>`}
          </span>
        );
      },
      img({ src, title, alt, ...rest }) {
        return (
          <span {...rest}>
            {`![${alt}](${src}${title ? ` "${title}"` : ""})`}
          </span>
        );
      },
    }}
    skipHtml={true}
  >
    {children}
  </ReactMarkdown>
);
