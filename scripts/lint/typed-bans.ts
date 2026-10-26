import { AnyType, discriminateAnyType } from "@typescript-eslint/type-utils";
import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import type ts from "typescript";

const rule = ESLintUtils.RuleCreator.withoutDocs;

const readInPlace = (node: TSESTree.Node, parent: TSESTree.Node): boolean => {
  switch (parent.type) {
    case AST_NODE_TYPES.CallExpression:
    case AST_NODE_TYPES.NewExpression:
      return parent.callee === node;
    case AST_NODE_TYPES.TaggedTemplateExpression:
      return parent.tag === node;
    case AST_NODE_TYPES.MemberExpression:
      return parent.object === node;
    case AST_NODE_TYPES.BinaryExpression:
      return parent.operator === "instanceof" && parent.right === node;
    case AST_NODE_TYPES.UnaryExpression:
      return parent.operator === "typeof";
    case AST_NODE_TYPES.VariableDeclarator:
      return parent.init === node && parent.id.type === AST_NODE_TYPES.ObjectPattern;
    case AST_NODE_TYPES.AssignmentExpression:
      return parent.right === node && parent.left.type === AST_NODE_TYPES.ObjectPattern;
    default:
      return false;
  }
};

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
      if (node.parent === undefined || readInPlace(node, node.parent)) return;
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

const noSchemaTypeAnnotation = rule({
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
        if (services.getTypeAtLocation(node).getProperty("~standard") !== undefined)
          context.report({ node, messageId: "annotation" });
      },
    };
  },
});

const plugin = {
  meta: { name: "xquik" },
  rules: {
    "no-any-returning-value": noAnyReturningValue,
    "no-schema-type-annotation": noSchemaTypeAnnotation,
  },
};

export const typedBans: { readonly meta: { readonly name: string } } = plugin;
