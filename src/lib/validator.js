import { SkillError } from "./errors.js";

export function validateInput(input, schema) {
  const errors = [];
  if (schema.type !== "object" || typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new SkillError({ code: "VALIDATION_ERROR", message: "Input must be an object" });
  }

  const obj = input;
  for (const key of schema.required ?? []) {
    if (obj[key] === undefined) errors.push({ field: key, error: "required" });
  }

  if (schema.additionalProperties === false) {
    for (const key of Object.keys(obj)) {
      if (!schema.properties[key]) errors.push({ field: key, error: "additional_property" });
    }
  }

  for (const [key, rule] of Object.entries(schema.properties ?? {})) {
    const value = obj[key];
    if (value === undefined || value === null) continue;
    if (rule.type === "string" && typeof value !== "string") errors.push({ field: key, error: "must_be_string" });
    if (rule.type === "integer" && (!Number.isInteger(value) || typeof value !== "number")) errors.push({ field: key, error: "must_be_integer" });
    if (rule.type === "boolean" && typeof value !== "boolean") errors.push({ field: key, error: "must_be_boolean" });
    if (rule.type === "array" && !Array.isArray(value)) errors.push({ field: key, error: "must_be_array" });
    if (rule.type === "object" && (typeof value !== "object" || value === null || Array.isArray(value))) errors.push({ field: key, error: "must_be_object" });
    if (rule.enum && !rule.enum.includes(value)) errors.push({ field: key, error: "must_be_enum" });
    if (rule.minimum !== undefined && typeof value === "number" && value < rule.minimum) errors.push({ field: key, error: "below_minimum" });
    if (rule.maximum !== undefined && typeof value === "number" && value > rule.maximum) errors.push({ field: key, error: "above_maximum" });
    if (rule.minLength !== undefined && typeof value === "string" && value.length < rule.minLength) errors.push({ field: key, error: "below_min_length" });
  }

  if (errors.length) {
    throw new SkillError({ code: "VALIDATION_ERROR", message: "Action input validation failed", details: { errors } });
  }
}

export function createAction({ name, schema, handler }) {
  return {
    name,
    schema,
    async run(input, context) {
      validateInput(input, schema);
      return handler(input, context);
    },
  };
}
