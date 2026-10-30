/**
 * A value typed by somebody, made safe to put inside a PostgREST filter.
 *
 * Inside `or=(...)`, `in.(...)` or an array literal `{...}`, commas, brackets
 * and braces are filter syntax, and percent-encoding does not protect them:
 * the server decodes the address before it reads the filter. So
 * `partnerEmail` typed as `x@y.com},code.not.is.null,bound_emails.cs.{z`
 * turned one condition into "any code at all", and the endpoint handed the
 * first one back (A205, a sweep of every filter built from a typed value).
 *
 * Double quotes make PostgREST read the whole thing as one value. A quote or
 * backslash inside is escaped, and the result is percent-encoded so a `+`
 * stays a plus rather than becoming a space.
 */
export function filterValue(value) {
  return encodeURIComponent(`"${String(value).replace(/[\\"]/g, (c) => `\\${c}`)}"`);
}
