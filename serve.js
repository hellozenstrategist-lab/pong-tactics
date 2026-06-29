// Tiny static server for local play/testing: node serve.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 8123;
const MIME = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml',
  '.wav':'audio/wav', '.mp3':'audio/mpeg', '.ogg':'audio/ogg'};
const SETTINGS_FILE = path.join(ROOT, '.ai-settings.json');
const PROVIDERS = {
  cerebras: {label:'Cerebras', baseUrl:'https://api.cerebras.ai/v1/chat/completions', model:'gemma-4-31b'},
  deepseek: {label:'DeepSeek', baseUrl:'https://api.deepseek.com/chat/completions', model:'deepseek-v4-pro'},
  openai: {label:'OpenAI Compatible', baseUrl:'https://api.openai.com/v1/chat/completions', model:''},
  custom: {label:'Custom OpenAI Compatible', baseUrl:'', model:''}
};
const CONTROLLERS = ['player', 'enemy'];

loadEnvFile();

function loadEnvFile(){
  const file = path.join(ROOT, '.env');
  if(!fs.existsSync(file)) return;
  for(const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)){
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if(!m || process.env[m[1]]) continue;
    let v = m[2];
    if((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
}

function sendJson(res, code, body){
  res.writeHead(code, {
    'Content-Type':'application/json',
    'Cache-Control':'no-store',
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type'
  });
  res.end(JSON.stringify(body));
}

function sendOptions(res){
  res.writeHead(204, {
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
    'Access-Control-Max-Age':'86400'
  });
  res.end();
}

function readJson(req, maxBytes=65536){
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if(Buffer.byteLength(body) > maxBytes){
        reject(Object.assign(new Error('body too large'), {statusCode:413}));
        req.destroy();
      }
    });
    req.on('end', () => {
      try{ resolve(body ? JSON.parse(body) : {}); }
      catch(err){ reject(Object.assign(new Error('invalid json'), {statusCode:400})); }
    });
    req.on('error', reject);
  });
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
const asSlot = s => typeof s === 'string' && /^[0-2],[0-2]$/.test(s) ? s : null;
const clean = (v, n=500) => String(v || '').trim().slice(0, n);

function envAiProfile(controller){
  const isPlayer = controller === 'player';
  const pfx = isPlayer ? 'PLAYER_AI_' : 'ENEMY_AI_';
  const alt = isPlayer ? 'GEMMA_' : 'RIVAL_AI_';
  return normalizeAiSettings({
    provider: process.env[pfx + 'PROVIDER'] || process.env[alt + 'PROVIDER'] || process.env.AI_PROVIDER || (isPlayer ? 'cerebras' : 'custom'),
    baseUrl: process.env[pfx + 'BASE_URL'] || process.env[alt + 'BASE_URL'] || process.env.AI_BASE_URL || (isPlayer ? process.env.CEREBRAS_BASE_URL : ''),
    model: process.env[pfx + 'MODEL'] || process.env[alt + 'MODEL'] || process.env.AI_MODEL || (isPlayer ? process.env.CEREBRAS_MODEL : '') || (isPlayer ? 'gemma-4-31b' : ''),
    apiKey: process.env[pfx + 'API_KEY'] || process.env[alt + 'API_KEY'] || process.env.AI_API_KEY || (isPlayer ? process.env.CEREBRAS_API_KEY : '')
  });
}

function envAiSettings(){
  return {
    player: envAiProfile('player'),
    enemy: envAiProfile('enemy')
  };
}

function isDeepSeekConfig(baseUrl, model){
  return /^https:\/\/api\.deepseek\.com(?:\/|$)/i.test(String(baseUrl || '').trim())
    || /^deepseek(?:\s|-)/i.test(String(model || '').trim());
}

function normalizeDeepSeekBaseUrl(baseUrl){
  const cleanUrl = clean(baseUrl, 300).replace(/\/+$/, '');
  if(!cleanUrl) return PROVIDERS.deepseek.baseUrl;
  if(/^https:\/\/api\.deepseek\.com(?:\/v1)?(?:\/chat\/completions)?$/i.test(cleanUrl)){
    return PROVIDERS.deepseek.baseUrl;
  }
  return cleanUrl;
}

function normalizeDeepSeekModel(model){
  const cleanModel = clean(model, 120);
  if(!cleanModel) return PROVIDERS.deepseek.model;
  if(/^deepseek\s*-?\s*v4\s*-?\s*pro$/i.test(cleanModel) || /^deepseek\s+v4\s+pro$/i.test(cleanModel)) return 'deepseek-v4-pro';
  if(/^deepseek\s*-?\s*v4\s*-?\s*flash$/i.test(cleanModel) || /^deepseek\s+v4\s+flash$/i.test(cleanModel)) return 'deepseek-v4-flash';
  return cleanModel;
}

function normalizeAiSettings(input={}, prior={}){
  let provider = PROVIDERS[input.provider] ? input.provider : 'custom';
  let preset = PROVIDERS[provider] || PROVIDERS.custom;
  let sameProvider = prior.provider === provider;
  let baseUrl = clean(input.baseUrl || preset.baseUrl || (sameProvider ? prior.baseUrl : ''), 300);
  let model = clean(input.model || preset.model || (sameProvider ? prior.model : ''), 120);
  if(provider !== 'deepseek' && isDeepSeekConfig(baseUrl, model)){
    provider = 'deepseek';
    preset = PROVIDERS.deepseek;
    sameProvider = prior.provider === provider;
    baseUrl = baseUrl || preset.baseUrl || (sameProvider ? prior.baseUrl : '');
    model = model || preset.model || (sameProvider ? prior.model : '');
  }
  if(provider === 'deepseek'){
    baseUrl = normalizeDeepSeekBaseUrl(baseUrl);
    model = normalizeDeepSeekModel(model);
  }
  return {
    provider,
    baseUrl,
    model,
    apiKey: clean(input.apiKey !== undefined ? input.apiKey : prior.apiKey, 400)
  };
}

function readAiSettings(){
  const base = envAiSettings();
  if(!fs.existsSync(SETTINGS_FILE)) return base;
  try{
    const saved = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    if(saved && (saved.player || saved.enemy)){
      return {
        player: normalizeAiSettings(saved.player || {}, base.player),
        enemy: normalizeAiSettings(saved.enemy || {}, base.enemy)
      };
    }
    return {
      player: base.player,
      enemy: normalizeAiSettings(saved, base.enemy)
    };
  } catch{
    return base;
  }
}

function writeAiSettings(settings){
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function publicAiProfile(settings){
  return {
    provider:settings.provider,
    providerLabel:(PROVIDERS[settings.provider] || PROVIDERS.custom).label,
    baseUrl:settings.baseUrl,
    model:settings.model,
    hasKey:!!settings.apiKey
  };
}

function publicAiSettings(settings=readAiSettings()){
  return {
    ok:true,
    player: publicAiProfile(settings.player),
    enemy: publicAiProfile(settings.enemy)
  };
}

function sanitizeDirective(d){
  d = d && typeof d === 'object' ? d : {};
  const plan = {
    formationBias: clamp(d.formationBias, -6, 6),
    aggression: clamp(d.aggression ?? 0.5, 0, 1),
    patience: clamp(d.patience ?? 0.5, 0, 1),
    passChance: clamp(d.passChance ?? 0.25, 0, 0.75),
    goalieBias: clamp(d.goalieBias, -4, 4),
    targetLane: clamp(d.targetLane, -7, 7),
    jitter: clamp(d.jitter ?? 0.35, 0, 1.5),
    callSign: String(d.callSign || 'AI DIRECTOR').slice(0, 32).toUpperCase(),
    note: String(d.note || '').slice(0, 90),
    slots: {}
  };
  if(d.slots && typeof d.slots === 'object'){
    for(const [slot, key] of Object.entries(d.slots)){
      const s = asSlot(slot);
      if(s && typeof key === 'string') plan.slots[s] = key.slice(0, 24);
    }
  }
  return plan;
}

function buildDirectorMessages(state, settings){
  const controller = state.controller === 'player' ? 'player' : 'enemy';
  if(state.mode === 'paddle_brain'){
    const paddle = state.paddle || {};
    const job = controller === 'player'
      ? 'You control exactly ONE PLAYER minion paddle. If this is the player goalie, only control it when the game says auto-goalie is active.'
      : 'You control exactly ONE RIVAL paddle, including enemy goalie behavior when this paddle is the goalie.';
    return [
      {
        role: 'system',
        content:
`You are a single expensive paddle brain inside a newspaper-themed Pong tactics game.
${job}
The full game state is repeated for every paddle on purpose. Use it, but return only this paddle's movement intent.
Return ONLY minified JSON with this shape:
{"formationBias":number -6..6,"aggression":number 0..1,"patience":number 0..1,"passChance":number 0..0.75,"goalieBias":number -4..4,"targetLane":number -7..7,"jitter":number 0..1.5,"slots":{},"callSign":"short paddle label","note":"short thought"}
targetLane is the desired x-position for this one paddle. slots must be empty.
This paddle: ${JSON.stringify(paddle)}.
Provider model: ${settings.model}.`
      },
      {role: 'user', content: JSON.stringify(state)}
    ];
  }
  const job = controller === 'player'
    ? 'You control the PLAYER fielded minions only. Do not control the human goalie. Favor coordinated lane coverage, passes, and adaptive movement for the player side.'
    : 'You control the RIVAL board, enemy formations, enemy goalie tendencies, passes, and live rival decisions.';
  return [
    {
      role: 'system',
      content:
`You are the adaptive rival director for a newspaper-themed Pong tactics game.
${job}
Be decisive, adaptive, and fair.
Return ONLY minified JSON with this shape:
{"formationBias":number -6..6,"aggression":number 0..1,"patience":number 0..1,"passChance":number 0..0.75,"goalieBias":number -4..4,"targetLane":number -7..7,"jitter":number 0..1.5,"slots":{"row,col":"typeKey"},"callSign":"short label","note":"short taunt"}
Use only offered type keys for slots. For player control, omit slots. For enemy control, empty or omit slots when the current rival board is already good.
Provider model: ${settings.model}.`
    },
    {role: 'user', content: JSON.stringify(state)}
  ];
}

async function handleAiSettings(req, res){
  if(req.method === 'GET') return sendJson(res, 200, publicAiSettings());
  if(req.method !== 'POST') return sendJson(res, 405, {ok:false, error:'method_not_allowed'});
  let body;
  try{ body = await readJson(req, 32768); }
  catch(err){ return sendJson(res, err.statusCode || 400, {ok:false, error:err.message}); }
  const controller = CONTROLLERS.includes(body.controller) ? body.controller : 'enemy';
  const prior = readAiSettings();
  const next = {player:{...prior.player}, enemy:{...prior.enemy}};
  next[controller] = normalizeAiSettings(body, prior[controller]);
  if(body.clearKey) next[controller].apiKey = '';
  else if(!Object.prototype.hasOwnProperty.call(body, 'apiKey') || !clean(body.apiKey)) next[controller].apiKey = prior[controller].apiKey;
  writeAiSettings(next);
  sendJson(res, 200, publicAiSettings(next));
}

async function handleAiDirector(req, res){
  if(req.method !== 'POST') return sendJson(res, 405, {ok:false, error:'method_not_allowed'});
  let state;
  try{ state = await readJson(req); }
  catch(err){ return sendJson(res, err.statusCode || 400, {ok:false, error:err.message}); }
  const controller = state.controller === 'player' ? 'player' : 'enemy';
  const settings = readAiSettings()[controller];
  if(!settings.apiKey) return sendJson(res, 503, {ok:false, error:`missing_${controller}_api_key`});
  if(!settings.baseUrl) return sendJson(res, 503, {ok:false, error:`missing_${controller}_api_endpoint`});
  if(!settings.model) return sendJson(res, 503, {ok:false, error:`missing_${controller}_model`});

  try{
    const upstream = await fetch(settings.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.model,
        messages: buildDirectorMessages(state, settings),
        temperature: 0.75,
        max_tokens: 420
      })
    });
    const data = await upstream.json().catch(() => ({}));
    if(!upstream.ok){
      return sendJson(res, upstream.status, {
        ok:false,
        error:data.error?.message || data.message || `${settings.provider || 'upstream'}_${upstream.status}`
      });
    }
    const content = data.choices?.[0]?.message?.content || '{}';
    const json = content.match(/\{[\s\S]*\}/)?.[0] || '{}';
    let directive;
    try{ directive = JSON.parse(json); }
    catch{ directive = {}; }
    sendJson(res, 200, {
      ok:true,
      controller,
      provider:settings.provider,
      model:data.model || settings.model,
      directive:sanitizeDirective(directive)
    });
  } catch(err){
    sendJson(res, 502, {ok:false, error:err.message || 'ai_proxy_failed'});
  }
}

http.createServer((req, res) => {
  const route = req.url.split('?')[0];
  if(route.startsWith('/api/') && req.method === 'OPTIONS') return sendOptions(res);
  if(route === '/api/ai-settings') return handleAiSettings(req, res);
  if(route === '/api/ai/director' || route === '/api/cerebras/director') return handleAiDirector(req, res);

  let p = decodeURIComponent(req.url.split('?')[0]);
  if(p === '/') p = '/index.html';
  if(p.split('/').some(part => part.startsWith('.'))) { res.writeHead(404); return res.end('not found'); }
  const file = path.resolve(ROOT, '.' + p);
  if(!file.startsWith(ROOT + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if(err){ res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control':'no-store'
    });
    res.end(data);
  });
}).listen(PORT, () => console.log('pong-tactics on http://localhost:' + PORT));
