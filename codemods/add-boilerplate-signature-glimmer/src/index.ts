import { API, FileInfo, Options } from "jscodeshift";

/**
 * The codemod adds an interface for default exported classes extending `Component`.
 */
export default function transformer(
  file: FileInfo,
  api: API,
  options: Options
) {
  const j = api.jscodeshift;
  const root = j(file.source);

  console.log("Starting transformation for file:", file.path);

  // Helper function to create the interface name
  const getInterfaceName = (className: string): string => {
    console.log("Generating interface name for class:", className);
    return className.endsWith("Component")
      ? className.slice(0, -"Component".length)
      : className;
  };

  // Find the default export class that extends `Component`
  const defaultExportClass = root
    .find(j.ClassDeclaration, {
      superClass: {
        type: "Identifier",
        name: "Component",
      },
    })
    .filter((path) => {
      const parent = path.parentPath.value;
      return parent.type === "ExportDefaultDeclaration";
    });

  console.log(
    "Found",
    defaultExportClass.size(),
    "default export classes extending Component"
  );

  defaultExportClass.forEach((path) => {
    const className = path.node.id?.name;
    if (!className) {
      console.warn("Class without a name found, skipping");
      return;
    }

    console.log("Processing class name:", className);

    // Check if the class already has a generic argument in `Component`
    const superClass = path.node.superClass;
    if (
      superClass &&
      superClass.type === "TSExpressionWithTypeArguments" &&
      superClass.typeParameters
    ) {
      console.log(
        "Component already has a generic parameter, skipping class:",
        className
      );
      return;
    }

    if (
      superClass &&
      superClass.type === "Identifier" &&
      (path.node as any).superTypeParameters // Handles the `superTypeParameters`
    ) {
      console.log(
        "Component already has a generic parameter (via superTypeParameters), skipping class:",
        className
      );
      return;
    }

    // Create the interface name
    const interfaceName = getInterfaceName(className);

    // Create the interface definition
    const interfaceDeclaration = j.tsInterfaceDeclaration(
      j.identifier(`${interfaceName}Signature`),
      j.tsInterfaceBody([
        j.tsPropertySignature(
          j.identifier("Args"),
          j.tsTypeAnnotation(j.tsTypeLiteral([]))
        ),
        j.tsPropertySignature(
          j.identifier("Blocks"),
          j.tsTypeAnnotation(
            j.tsTypeLiteral([
              j.tsPropertySignature(
                j.identifier("default"),
                j.tsTypeAnnotation(j.tsTupleType([]))
              ),
            ])
          )
        ),
        j.tsPropertySignature(
          j.identifier("Element"),
          j.tsTypeAnnotation(j.tsNullKeyword())
        ),
      ])
    );

    // Add comments manually to the interface body
    const interfaceBody = interfaceDeclaration.body.body;
    interfaceBody[0].comments = [
      j.commentLine(" The arguments accepted by the component", true),
    ];
    interfaceBody[1].comments = [
      j.commentLine(" Any blocks yielded by the component", true),
    ];
    interfaceBody[2].comments = [
      j.commentLine(
        " The element to which `...attributes` is applied in the component template",
        true
      ),
    ];

    console.log("Interface created:", `${interfaceName}Signature`);

    // Insert the interface above the parent ExportDefaultDeclaration
    const parent = path.parentPath;
    if (parent.value.type === "ExportDefaultDeclaration") {
      j(parent).insertBefore(interfaceDeclaration);
      console.log("Interface inserted above ExportDefaultDeclaration");
    } else {
      console.warn(
        "Parent is not an ExportDefaultDeclaration, skipping insertion"
      );
    }

    // Add the interface as a generic argument to `Component`
    if (
      superClass &&
      superClass.type === "Identifier" &&
      superClass.name === "Component"
    ) {
      console.log("Adding generic argument to Component for class:", className);
      path.node.superClass = j.tsExpressionWithTypeArguments(
        j.identifier("Component"),
        j.tsTypeParameterInstantiation([
          j.tsTypeReference(j.identifier(`${interfaceName}Signature`)),
        ])
      );
      console.log("Generic argument added to Component");
    }
  });

  console.log("Transformation complete for file:", file.path);

  return root.toSource();
}
