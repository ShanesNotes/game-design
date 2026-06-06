// Minimal JSON Schema validator — supports the draft-2020-12 subset used by TGF schemas.
// Intentionally tiny and dependency-free. Supports: type (incl. integer/number/array/null
// and arrays of types), enum, pattern, required, properties, additionalProperties:false,
// items, minItems, minimum, maximum. Returns an array of error strings ([] means valid).
// This is NOT a general-purpose validator; it covers exactly what schemas/*.json use.

function jsType(v) {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v; // string | boolean | object
}

function matchType(expected, data) {
  switch (expected) {
    case "integer": return typeof data === "number" && Number.isInteger(data);
    case "number": return typeof data === "number";
    case "array": return Array.isArray(data);
    case "object": return data !== null && typeof data === "object" && !Array.isArray(data);
    case "null": return data === null;
    case "string": return typeof data === "string";
    case "boolean": return typeof data === "boolean";
    default: return false;
  }
}

export function validate(schema, data, path = "$") {
  const errors = [];
  if (!schema || typeof schema !== "object") return errors;

  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchType(t, data))) {
      errors.push(`${path}: expected type ${types.join("|")}, got ${jsType(data)}`);
    }
  }

  if (schema.enum && !schema.enum.some((e) => e === data)) {
    errors.push(`${path}: ${JSON.stringify(data)} not in enum ${JSON.stringify(schema.enum)}`);
  }

  if (schema.pattern && typeof data === "string" && !new RegExp(schema.pattern).test(data)) {
    errors.push(`${path}: ${JSON.stringify(data)} does not match pattern ${schema.pattern}`);
  }

  if (typeof data === "number") {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push(`${path}: ${data} < minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push(`${path}: ${data} > maximum ${schema.maximum}`);
    }
  }

  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push(`${path}: array length ${data.length} < minItems ${schema.minItems}`);
    }
    if (schema.items) {
      data.forEach((item, i) => errors.push(...validate(schema.items, item, `${path}[${i}]`)));
    }
  }

  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    for (const req of schema.required || []) {
      if (!(req in data)) errors.push(`${path}: missing required property '${req}'`);
    }
    if (schema.properties) {
      for (const [key, sub] of Object.entries(schema.properties)) {
        if (key in data) errors.push(...validate(sub, data[key], `${path}.${key}`));
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(data)) {
        if (!(key in schema.properties)) errors.push(`${path}: additional property '${key}' not allowed`);
      }
    }
  }

  return errors;
}

export function isValid(schema, data) {
  return validate(schema, data).length === 0;
}
