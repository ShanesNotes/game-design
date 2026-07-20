// Minimal JSON Schema validator — supports the draft-2020-12 subset used by TGF schemas
// and the live contracts forge-manifest (incl. baseline allOf / contains / not gates).
// Intentionally tiny and dependency-free. Supports: type (incl. integer/number/array/null
// and arrays of types), enum, const, pattern, required, properties, additionalProperties:false,
// items, minItems, uniqueItems, minLength, maxLength, minimum, maximum, if/then/else,
// allOf, anyOf, not, contains.
// Returns an array of error strings ([] means valid).
// This is NOT a general-purpose validator; it covers exactly what the studio schemas use.

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

/** Recursive key-sort so JSON.stringify equality ignores object property order. */
function canonicalize(value) {
  // Tagged shapes keep arrays and objects from ever encoding identically, and
  // sorted [key, value] pairs (never a rebuilt object) survive keys like
  // "__proto__" that assignment onto a plain object would silently drop.
  if (Array.isArray(value)) return ["arr", ...value.map(canonicalize)];
  if (value !== null && typeof value === "object") {
    return ["obj", ...Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])];
  }
  return value;
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

  // Draft 2020-12 const is same-value equality (=== covers the string/number cases
  // used by forge-manifest if/contains gates; objects would need deep equality).
  if (schema.const !== undefined && schema.const !== data) {
    errors.push(`${path}: ${JSON.stringify(data)} !== const ${JSON.stringify(schema.const)}`);
  }

  if (schema.pattern && typeof data === "string" && !new RegExp(schema.pattern).test(data)) {
    errors.push(`${path}: ${JSON.stringify(data)} does not match pattern ${schema.pattern}`);
  }

  if (typeof data === "string") {
    // Draft 2020-12 measures length in Unicode code points, not UTF-16 units.
    const len = [...data].length;
    if (schema.minLength !== undefined && len < schema.minLength) {
      errors.push(`${path}: string length ${len} < minLength ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && len > schema.maxLength) {
      errors.push(`${path}: string length ${len} > maxLength ${schema.maxLength}`);
    }
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
    if (schema.uniqueItems === true) {
      const seen = new Set();
      for (const item of data) {
        // Canonicalize so object key order does not mask JSON equality.
        const key = JSON.stringify(canonicalize(item));
        if (seen.has(key)) {
          errors.push(`${path}: duplicate items (uniqueItems)`);
          break;
        }
        seen.add(key);
      }
    }
    if (schema.items) {
      data.forEach((item, i) => errors.push(...validate(schema.items, item, `${path}[${i}]`)));
    }
    // contains: at least one item must satisfy the subschema (pause surface, etc.).
    if (schema.contains) {
      const found = data.some((item, i) => validate(schema.contains, item, `${path}[${i}]`).length === 0);
      if (!found) {
        errors.push(`${path}: array does not contain a matching item (contains)`);
      }
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

  if (schema.if) {
    const conditionMatches = validate(schema.if, data, path).length === 0;
    const branch = conditionMatches ? schema.then : schema.else;
    if (branch) errors.push(...validate(branch, data, path));
  }

  // allOf / anyOf / not — forge-manifest version gates (baseline required / forbidden,
  // derive/policy forbid below floors) nest under allOf with if/then + not.
  if (Array.isArray(schema.allOf)) {
    for (let i = 0; i < schema.allOf.length; i++) {
      errors.push(...validate(schema.allOf[i], data, path));
    }
  }
  if (Array.isArray(schema.anyOf)) {
    const anyOk = schema.anyOf.some((sub) => validate(sub, data, path).length === 0);
    if (!anyOk) {
      errors.push(`${path}: does not match any anyOf subschema`);
    }
  }
  if (schema.not) {
    if (validate(schema.not, data, path).length === 0) {
      errors.push(`${path}: must not match 'not' subschema`);
    }
  }

  return errors;
}
