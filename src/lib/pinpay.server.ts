/* Token da API Pix (server-only).
 * Usa a variável de ambiente quando existir; caso contrário usa o valor
 * embutido abaixo, para o app funcionar em qualquer host sem configuração.
 */
const PINPAY_TOKEN_FALLBACK = "sk_live_a1109b59c60b90eeecfc03884b2c248de829b3379f50f2a0ca89e37f72765229";

export function getPinpayToken(): string | undefined {
  return process.env["PINPAY_TOKEN"] || PINPAY_TOKEN_FALLBACK || undefined;
}
