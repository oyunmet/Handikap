export function hasWebGLApi(webgl2Constructor: unknown, webgl1Constructor: unknown) {
  return typeof webgl2Constructor === "function" || typeof webgl1Constructor === "function";
}
