import { describe, expect, test } from "bun:test";

import { defineEmail, renderTemplate } from "../../src";

type WelcomeEmailProps = {
  name: string;
  url: string;
};

const WelcomeEmail = ({ name, url }: WelcomeEmailProps) => (
  <html>
    <body>
      <p>Hello {name}</p>
      <a href={url}>Open</a>
    </body>
  </html>
);

describe("template helpers", () => {
  test("renders templates with typed props", async () => {
    const html = await renderTemplate(WelcomeEmail, {
      name: "Hayato",
      url: "https://example.com/start",
    });

    expect(html).toContain("Hello Hayato");
    expect(html).toContain('href="https://example.com/start"');
  });

  test("provides a reusable renderer through defineEmail", async () => {
    const welcomeEmail = defineEmail(WelcomeEmail);

    const html = await welcomeEmail.render({
      name: "Hayato",
      url: "https://example.com/start",
    });
    const text = await welcomeEmail.render(
      {
        name: "Hayato",
        url: "https://example.com/start",
      },
      {
        output: "text",
      },
    );

    expect(html).toContain("<p>Hello Hayato</p>");
    expect(text).toContain("Open (https://example.com/start)");
  });
});
