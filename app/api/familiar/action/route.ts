import { env } from 'cloudflare:workers';
import { handleFamiliar } from '../../../../server/familiar.mjs';
export const dynamic = 'force-dynamic';
export const POST = (request: Request) => handleFamiliar(request,{db:env.DB,vault:env.JAOYA_VAULT_KEY});
