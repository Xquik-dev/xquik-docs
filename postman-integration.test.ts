import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const OVERVIEW = readFileSync("api-reference/overview.mdx", "utf8");
const HOME = readFileSync("index.mdx", "utf8");
const RUN_BUTTON = "[![Run in Postman](https://run.pstmn.io/button.svg)]";
const RUN_URL =
  "https://app.getpostman.com/run-collection/12709954-5ee4fae0-138a-4615-ae47-ac4be7904df2?action=collection%2Ffork&source=rip_markdown&collection-url=entityId%3D12709954-5ee4fae0-138a-4615-ae47-ac4be7904df2%26entityType%3Dcollection%26workspaceId%3Db77ecb6f-d780-4179-968c-95dc06ae28c0";
const WORKSPACE_URL = "https://www.postman.com/xquik-dev/xquik-apis";
const DOCUMENTER_URL = "https://documenter.getpostman.com/view/12709954/2sBY4TpxXK";
const COLLECTION_FILE_URL = "https://xquik.com/xquik.postman_collection.json";
const AUTHENTICATION = readFileSync("api-reference/authentication.mdx", "utf8");
const QUICKSTART = readFileSync("x-api-quickstart.mdx", "utf8");
const SECTION_LINK = "/api-reference/overview#run-in-postman";

describe("Postman integration", (): void => {
  it.each([
    ["index.mdx", HOME],
    ["api-reference/overview.mdx", OVERVIEW],
  ])("links %s to the full collection", (_page, text): void => {
    expect.assertions(1);

    expect(
      [RUN_BUTTON, RUN_URL, WORKSPACE_URL, DOCUMENTER_URL, COLLECTION_FILE_URL, "`apiKey`"].filter(
        (link) => !text.includes(link),
      ),
    ).toStrictEqual([]);
  });

  it("points the authentication & quickstart pages to Run in Postman", (): void => {
    expect.assertions(1);

    expect([AUTHENTICATION, QUICKSTART].map((text) => text.includes(SECTION_LINK))).toStrictEqual([
      true,
      true,
    ]);
  });
});
