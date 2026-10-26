import { z } from "zod";

export const navigationNode = z.looseObject({
  get anchors() {
    return z.array(navigationItem).optional();
  },
  expanded: z.boolean().optional(),
  group: z.string().optional(),
  get groups() {
    return z.array(navigationNode).optional();
  },
  get pages() {
    return z.array(navigationItem).optional();
  },
  tab: z.string().optional(),
  get tabs() {
    return z.array(navigationNode).optional();
  },
});

export type NavigationNode = z.infer<typeof navigationNode>;

export const navigationItem = z.union([z.string(), navigationNode]);

export type NavigationItem = z.infer<typeof navigationItem>;

export const docsRedirect = z.looseObject({ destination: z.string(), source: z.string() });
