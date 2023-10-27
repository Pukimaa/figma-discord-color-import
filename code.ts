const reviver = (key: string, value: any) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

function hexToRgb(hex: string): RGB {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

interface RGB {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

figma.showUI(__html__);
figma.ui.onmessage = (msg) => {
  if (msg.type === "create-variables") {
    let createdCollection;
    let mode;
    let variables: string[] = [];

    const collections = figma.variables.getLocalVariableCollections();
    for (const collection of collections) {
      if (collection.name === msg.collection) {
        createdCollection = collection;
        mode = collection.modes[0];
        variables = collection.variableIds;
        break;
      }
    }
    if (!createdCollection) {
      createdCollection = figma.variables.createVariableCollection(
        msg.collection
      );
      mode = createdCollection.modes[0];
      variables = createdCollection.variableIds;
    }

    let rawStyles;
    try {
      rawStyles = JSON.parse(msg.rawValues, reviver);
    } catch (e) {
      console.log(e);
      return figma.notify("Invalid JSON. Have you removed the js part?");
    }

    if (!mode) {
      return figma.notify("No mode found");
    }
    if (!variables) {
      variables = [];
    }

    let variableWithNames: { [key: string]: Variable } = {};
    for (const variable of variables) {
      const variableObject = figma.variables.getVariableById(variable);
      if (variableObject)
        variableWithNames[variableObject.name] = variableObject;
    }

    let count = 0;
    for (const style in rawStyles) {
      const hex = rawStyles[style].hex;
      const name = "color/" + style.toString().replace(".", "/");
      if (variableWithNames.hasOwnProperty(name)) {
        const variable = variableWithNames[name];
        if (variable) {
          variable.setValueForMode(mode.modeId, hexToRgb(hex));
        }
        count++;
        continue;
      }
      const variable = figma.variables.createVariable(
        name,
        createdCollection.id,
        "COLOR"
      );
      variable.setValueForMode(mode.modeId, hexToRgb(hex));
      count++;
    }

    figma.notify(
      `Done. ${count} variables created in ${createdCollection.name}!`
    );
  }

  figma.closePlugin();
};
