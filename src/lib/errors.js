export class SkillError extends Error {
  constructor({ code, message, details }) {
    super(message);
    this.name = "SkillError";
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return { code: this.code, message: this.message, details: this.details };
  }
}
