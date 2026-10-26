import { z } from "zod";

const HTTP_METHODS = ["delete", "get", "head", "options", "patch", "post", "put", "trace"] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export const openApiSchema = z.looseObject({
  $ref: z.string().optional(),
  get additionalProperties() {
    return z.union([z.boolean(), openApiSchema]).optional();
  },
  get allOf() {
    return z.array(openApiSchema).optional();
  },
  get anyOf() {
    return z.array(openApiSchema).optional();
  },
  discriminator: z
    .looseObject({ mapping: z.record(z.string(), z.string()).optional(), propertyName: z.string() })
    .optional(),
  enum: z.array(z.unknown()).optional(),
  get items() {
    return openApiSchema.optional();
  },
  maximum: z.number().optional(),
  minimum: z.number().optional(),
  get oneOf() {
    return z.array(openApiSchema).optional();
  },
  get properties() {
    return z.record(z.string(), openApiSchema).optional();
  },
  required: z.array(z.string()).optional(),
  title: z.string().optional(),
  type: z.union([z.string(), z.array(z.string())]).optional(),
  "x-stainless-naming": z
    .looseObject({ csharp: z.looseObject({ type_name: z.string() }).optional() })
    .optional(),
});

export type OpenApiSchema = z.infer<typeof openApiSchema>;

export const openApiParameter = z.looseObject({
  $ref: z.string().optional(),
  in: z.string().optional(),
  name: z.string().optional(),
  required: z.boolean().optional(),
  schema: openApiSchema.optional(),
});

export type OpenApiParameter = z.infer<typeof openApiParameter>;

const openApiMediaTypes = z.record(z.string(), z.looseObject({ schema: openApiSchema.optional() }));

export const openApiResponse = z.looseObject({
  $ref: z.string().optional(),
  content: openApiMediaTypes.optional(),
  headers: z.record(z.string(), z.unknown()).optional(),
});

export type OpenApiResponse = z.infer<typeof openApiResponse>;

export const openApiOperation = z.looseObject({
  description: z.string().optional(),
  parameters: z.array(openApiParameter).optional(),
  requestBody: z
    .looseObject({ $ref: z.string().optional(), content: openApiMediaTypes.optional() })
    .optional(),
  responses: z.record(z.string(), openApiResponse).optional(),
  security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
  "x-payment-info": z
    .looseObject({ offers: z.array(z.looseObject({ intent: z.string().optional() })).optional() })
    .optional(),
  "x-write-action": z.string().optional(),
});

export type OpenApiOperation = z.infer<typeof openApiOperation>;

export const openApiPathItem = z.looseObject({
  delete: openApiOperation.optional(),
  get: openApiOperation.optional(),
  head: openApiOperation.optional(),
  options: openApiOperation.optional(),
  parameters: z.array(openApiParameter).optional(),
  patch: openApiOperation.optional(),
  post: openApiOperation.optional(),
  put: openApiOperation.optional(),
  trace: openApiOperation.optional(),
});

export type OpenApiPathItem = z.infer<typeof openApiPathItem>;

export const openApiDocument = z.looseObject({
  components: z
    .looseObject({
      parameters: z.record(z.string(), openApiParameter).optional(),
      responses: z.record(z.string(), openApiResponse).optional(),
      schemas: z.record(z.string(), openApiSchema).optional(),
    })
    .optional(),
  paths: z.record(z.string(), openApiPathItem).optional(),
});

export type OpenApiDocument = z.infer<typeof openApiDocument>;

export function parseOpenApi(source: string): OpenApiDocument {
  return openApiDocument.parse(Bun.YAML.parse(source));
}

export function operations(pathItem: OpenApiPathItem): readonly [HttpMethod, OpenApiOperation][] {
  return HTTP_METHODS.flatMap((method): [HttpMethod, OpenApiOperation][] => {
    const operation = pathItem[method];
    return operation === undefined ? [] : [[method, operation]];
  });
}

export function operationAt(
  spec: OpenApiDocument,
  path: string,
  method: string,
): OpenApiOperation | undefined {
  const pathItem = spec.paths?.[path];
  if (pathItem === undefined) return undefined;
  return operations(pathItem).find(([name]) => name === method)?.[1];
}
