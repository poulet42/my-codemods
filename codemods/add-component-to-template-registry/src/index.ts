import { FileInfo, API, Options } from "jscodeshift";
import camelcase from "camelcase";

export default function transformer(
  fileInfo: FileInfo,
  api: API,
  options: Options
): string {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Find the default export extending Component
  const defaultExportClass = root.find(j.ExportDefaultDeclaration, {
    declaration: {
      type: "ClassDeclaration",
      superClass: {
        type: "Identifier",
        name: "Component",
      },
    },
  });

  if (!defaultExportClass.size()) {
    return fileInfo.source; // No matching export found
  }

  // Get the file name without extension and convert to camelCase
  console.log("Processing file:", fileInfo.path);

  const pathSegments = fileInfo.path.split("/");
  const pathSegmentsAfterComponents = pathSegments.slice(
    pathSegments.indexOf("components") + 1
  );

  const baseComponentName =
    pathSegmentsAfterComponents.pop()?.replace(/\.[^/.]+$/, "") || "";

  const registryKey = [...pathSegmentsAfterComponents, baseComponentName]
    .map((s) => camelcase(s, { pascalCase: true }))
    .join("::");

  // Extract the class name
  const className = (defaultExportClass.get(0).node.declaration as any).id.name;

  // Define the Glint registry declaration
  const registryDeclaration = `
declare module '@glint/environment-ember-loose/registry' {
  export default interface Registry {
    "${registryKey}": typeof ${className};
  }
}`;

  // Check if the registry declaration already exists in the file
  if (
    fileInfo.source.includes(
      `declare module '@glint/environment-ember-loose/registry' {`
    )
  ) {
    return fileInfo.source; // No need to add if already present
  }

  // Add the declaration at the end of the file
  const newSource = `${fileInfo.source.trim()}
${registryDeclaration}`;

  return newSource;
}
