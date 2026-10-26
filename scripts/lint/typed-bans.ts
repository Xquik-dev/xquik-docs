import { AnyType, discriminateAnyType } from "@typescript-eslint/type-utils";
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import type ts from "typescript";

const rule = ESLintUtils.RuleCreator.withoutDocs;

const noAnyReturningValue = rule({
  meta: {
    type: "problem",
    messages: {
      value:
        "Call this function here and type its result, because a function that returns any passes as every typed function.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    const checker = services.program.getTypeChecker();
    const returnsAny = (type: ts.Type, tsNode: ts.Node): boolean =>
      (type.isUnion() ? type.types : [type]).some((part) =>
        part
          .getCallSignatures()
          .some(
            (signature) =>
              discriminateAnyType(signature.getReturnType(), checker, services.program, tsNode) !==
              AnyType.Safe,
          ),
      );
    const check = (node: TSESTree.Node): void => {
      const { parent } = node;
      if (parent === undefined) return;
      if (
        (parent.type === AST_NODE_TYPES.CallExpression ||
          parent.type === AST_NODE_TYPES.NewExpression) &&
        parent.callee === node
      )
        return;
      if (parent.type === AST_NODE_TYPES.TaggedTemplateExpression && parent.tag === node) return;
      if (parent.type === AST_NODE_TYPES.MemberExpression && parent.object === node) return;
      const tsNode = services.esTreeNodeToTSNodeMap.get(node);
      if (returnsAny(checker.getTypeAtLocation(tsNode), tsNode))
        context.report({ node, messageId: "value" });
    };
    return {
      "AwaitExpression, CallExpression, MemberExpression, NewExpression, TaggedTemplateExpression":
        check,
      Program(): void {
        for (const scope of context.sourceCode.scopeManager?.scopes ?? [])
          for (const reference of scope.references)
            if (reference.isValueReference && reference.isRead()) check(reference.identifier);
      },
    };
  },
});

const noZodTypeAnnotation = rule({
  meta: {
    type: "problem",
    messages: {
      annotation:
        "Infer the type from the zod schema instead of annotating the schema with a separate type.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const services = ESLintUtils.getParserServices(context);
    return {
      TSTypeReference(node): void {
        if (services.getTypeAtLocation(node).getProperty("_zod") !== undefined)
          context.report({ node, messageId: "annotation" });
      },
    };
  },
});

const plugin = {
  meta: { name: "xquik" },
  rules: {
    "no-any-returning-value": noAnyReturningValue,
    "no-zod-type-annotation": noZodTypeAnnotation,
  },
};

export const typedBans: { readonly meta: { readonly name: string } } = plugin;
