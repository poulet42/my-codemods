import { JSCodeshift, Transform } from "jscodeshift";

const transform: Transform = (fileInfo, api) => {
  const j: JSCodeshift = api.jscodeshift;
  const root = j(fileInfo.source);

  console.log("Starting transformation for file:", fileInfo.path);

  let hasServiceDecorator = false;

  root
    .find(j.ClassDeclaration, {
      superClass: {
        type: "Identifier",
        name: "Component",
      },
    })
    .forEach((path) => {
      const classBody = path.value.body.body;
      classBody.forEach((member) => {
        if (
          member.type === "ClassProperty" &&
          member.decorators?.some((decorator) => {
            return (
              (decorator.expression.type === "CallExpression" &&
                decorator.expression.callee.type === "Identifier" &&
                decorator.expression.callee.name === "service") ||
              (decorator.expression.type === "Identifier" &&
                decorator.expression.name === "service")
            );
          })
        ) {
          console.log("Found @service decorator on property:", member.key.name);
          hasServiceDecorator = true;
        }
      });
    });

  if (hasServiceDecorator) {
    console.log("Checking for existing `Services` import.");

    const existingServicesImport = root.find(j.ImportDeclaration, {
      source: { value: "@ember/service" },
    });

    if (existingServicesImport.size() > 0) {
      existingServicesImport.forEach((path) => {
        const specifiers = path.value.specifiers || [];
        const hasRegistrySpecifier = specifiers.some(
          (specifier) =>
            specifier.type === "ImportSpecifier" &&
            specifier.imported.name === "Registry" &&
            specifier.local.name === "Services"
        );

        if (!hasRegistrySpecifier) {
          console.log("Adding `type Registry as Services` to existing import.");
          const s = j.importSpecifier.from({
            imported: j.identifier("Registry"),
            local: j.identifier("Services"),
          });
          s.importKind = "type";

          specifiers.push(s);
        }
      });
    } else {
      console.log("Adding new import for `type Registry as Services`.");
      const servicesImport = j.importDeclaration(
        [
          j.importSpecifier.from({
            imported: j.identifier("Registry"),
            local: j.identifier("Services"),
          }),
        ],
        j.literal("@ember/service")
      );
      servicesImport.importKind = "type";
      root.find(j.Program).get("body", 0).insertBefore(servicesImport);
    }
  }

  console.log("Searching for default export classes extending `Component`.");
  root
    .find(j.ClassDeclaration, {
      superClass: {
        type: "Identifier",
        name: "Component",
      },
    })
    .filter((path) => {
      const exportDecl = path.parentPath.value;
      console.log("Examining class for export type:", path.value.id?.name);
      return (
        exportDecl.type === "ExportDefaultDeclaration" ||
        (exportDecl.type === "ExportNamedDeclaration" &&
          exportDecl.declaration === path.value)
      );
    })
    .forEach((path) => {
      const classBody = path.value.body.body;
      console.log("Processing class:", path.value.id?.name);

      classBody.forEach((member) => {
        if (
          member.type === "ClassProperty" &&
          member.decorators?.some((decorator) => {
            return (
              (decorator.expression.type === "CallExpression" &&
                decorator.expression.callee.type === "Identifier" &&
                decorator.expression.callee.name === "service") ||
              (decorator.expression.type === "Identifier" &&
                decorator.expression.name === "service")
            );
          })
        ) {
          console.log("Found @service decorator on property:", member.key.name);
          const decorator = member.decorators?.find((decorator) => {
            return (
              (decorator.expression.type === "CallExpression" &&
                decorator.expression.callee.type === "Identifier" &&
                decorator.expression.callee.name === "service") ||
              (decorator.expression.type === "Identifier" &&
                decorator.expression.name === "service")
            );
          });

          if (decorator && member.key.type === "Identifier") {
            console.log("Updating property:", member.key.name);
            member.value = null;
            member.typeAnnotation = j.tsTypeAnnotation(
              j.tsIndexedAccessType(
                j.tsTypeReference(j.identifier("Services")),
                j.tsLiteralType(j.stringLiteral(member.key.name))
              )
            );
            member.accessibility = undefined;
            member.declare = true;
          }
        }
      });
    });

  console.log("Transformation complete for file:", fileInfo.path);
  return root.toSource().replace(/\n\s+declare/g, " declare");
};

export default transform;
