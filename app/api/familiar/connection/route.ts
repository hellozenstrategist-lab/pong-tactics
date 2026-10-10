import { env } from 'cloudflare:workers';
import { handleFamiliar } from '../../../../server/familiar.mjs';
export const dynamic = 'force-dynamic';
const handle = (request: Request) => handleFamiliar(request,{db:env.DB,vault:env.JAOYA_VAULT_KEY});
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
