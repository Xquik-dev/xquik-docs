import { readFileSync } from "node:fs";
import { describe, expect } from "vitest";

import { docsContract, productCheck, productOperation } from "./product-contract.test.helpers.ts";

describe("published draft and style response contracts", (): void => {
  for (const { operationId, page, statuses } of [
    {
      operationId: "getDraft",
      page: "api-reference/drafts/get.mdx",
      statuses: ["200", "400", "401", "404", "429"],
    },
    {
      operationId: "deleteDraft",
      page: "api-reference/drafts/delete.mdx",
      statuses: ["204", "400", "401", "404", "429"],
    },
    {
      operationId: "getStylePerformance",
      page: "api-reference/styles/performance.mdx",
      statuses: ["200", "401", "402", "404", "422", "429"],
    },
  ]) {
    productCheck(`${operationId} publishes its documented response statuses`, (spec): void => {
      expect.assertions(1);
      const source = readFileSync(new URL(page, import.meta.url), "utf8");
      expect({
        documented: docsContract(source).statuses,
        published: productOperation(spec, operationId)?.statuses,
      }).toStrictEqual({ documented: statuses, published: statuses });
    });
  }
});
