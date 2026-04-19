import { describe, expect, test } from "bun:test";

import { Body, Html, render } from "../../src";

describe("render output", () => {
  test("supports plain text output via render options", async () => {
    const text = await render(
      <Html>
        <Body>
          <h1>Welcome</h1>
          <p>
            Hello <a href="https://example.com">world</a>
          </p>
        </Body>
      </Html>,
      {
        doctype: false,
        output: "text",
        text: { headingStyle: "preserve", linkFormat: "text-only" },
      },
    );

    expect(text).toContain("Welcome");
    expect(text).toContain("Hello world");
    expect(text).not.toContain("https://example.com");
  });

  test("supports plain text formatting options", async () => {
    const text = await render(
      <Html>
        <Body>
          <h1>Welcome</h1>
          <p>
            Hello <a href="https://example.com">world</a>
          </p>
          <img src="https://example.com/image.png" alt="Hero image" />
          <ul>
            <li>One</li>
          </ul>
          <hr />
        </Body>
      </Html>,
      {
        doctype: false,
        output: "text",
        text: {
          headingStyle: "preserve",
          hrSeparator: "***",
          linkFormat: "href-only",
          listBullet: "*",
        },
      },
    );

    expect(text).toContain("Welcome");
    expect(text).not.toContain("WELCOME");
    expect(text).toContain("Hello https://example.com");
    expect(text).toContain("Hero image");
    expect(text).toContain("* One");
    expect(text).toContain("***");
  });
});
