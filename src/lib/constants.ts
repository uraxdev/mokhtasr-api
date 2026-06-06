export const STRONG_PASSWORD_REGEX: RegExp = /^.*(?=.{8,})((?=.*[!@#$%^&*()\-_=+{};:,<.>]){1})(?=.*\d)((?=.*[a-z]){1})((?=.*[A-Z]){1}).*$/;
export const PHONE_NUMBER_REGEX: RegExp = /^(?:\+965|\+966|\+973|\+971|\+974|\+968|\+962|\+20) \d{1,11}$/;
export const SLUG_REGEX: RegExp = /^[a-z0-9-]+$/;
