import { startSpan } from "./actions/startSpan.js";
import { endSpan } from "./actions/endSpan.js";
import { emitEvent } from "./actions/emitEvent.js";
import { readRecent } from "./actions/readRecent.js";
import { tail } from "./actions/tail.js";

export const actions = { startSpan, endSpan, emitEvent, readRecent, tail };
export { SkillError } from "./lib/errors.js";
