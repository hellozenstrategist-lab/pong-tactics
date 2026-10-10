declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    JAOYA_VAULT_KEY?: string;
    BUCKET?: R2Bucket;
  }
}
