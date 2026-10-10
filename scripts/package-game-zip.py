#!/usr/bin/env python3
"""Create a standalone offline game and a sanitized full-source ZIP."""
from pathlib import Path
import base64,json,re,subprocess,sys,zipfile
root=Path(__file__).resolve().parents[1]
output=Path(sys.argv[1]).resolve();output.parent.mkdir(parents=True,exist_ok=True)
modules=['rules','world','objective','engine','ai','input','renderer','ui']
code=[]
for name in modules:
    text=(root/'public/game'/f'{name}.js').read_text()
    text=re.sub(r'^import .*?;\s*$', '', text, flags=re.M)
    text=re.sub(r'^export \{.*?\};\s*$', '', text, flags=re.M)
    text=re.sub(r'\bexport (?=(?:const|function|async function|class)\b)', '', text)
    code.append(text)
def swap(text,old,new):
    # Fail loudly if the page changed, so the offline file never ships stale wording or broken links.
    if old not in text:raise SystemExit(f'package-game-zip: expected text not found: {old[:60]!r}')
    return text.replace(old,new)
html=(root/'public/game/index.html').read_text()
# Bundled fonts become data URIs so the offline file needs no network or sibling files.
css=re.sub(r'url\("/game/fonts/([^"]+)"\)',lambda m:'url("data:font/woff2;base64,'+base64.b64encode((root/'public/game/fonts'/m.group(1)).read_bytes()).decode()+'")',(root/'public/game/style.css').read_text())
html=swap(html,'<link rel="stylesheet" href="/game/style.css">','<style>'+css+'</style>')
html=swap(html,'<script type="module" src="/game/ui.js"></script>','<script type="module">\n'+ '\n'.join(code).replace('</script','<\\/script')+'\n</script>')
# A static file has no authenticated API server. Keep its UI truthful.
html=swap(html,'Use your own OpenAI Platform API key','This offline file can’t connect to APIs. On the hosted JAOYA site you can use your own OpenAI Platform API key')
html,forms=re.subn(r'(<form id="connectForm">)(.*?)(</form>)',r'\1<fieldset disabled style="border:0;padding:0;margin:0">\2</fieldset>\3',html,flags=re.S)
if forms!=1:raise SystemExit('package-game-zip: connect form not found')
html=swap(html,'id="disconnectButton"','id="disconnectButton" disabled')
files=subprocess.check_output(['git','ls-files','-c','-o','--exclude-standard'],cwd=root,text=True).splitlines()
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    archive.writestr('JAOYA-PLAY-OFFLINE.html',html)
    archive.writestr('START-HERE.txt','JAOYA V2\nExtract this ZIP, then open JAOYA-PLAY-OFFLINE.html in a desktop browser.\nNo installation, server, internet, or paid API needed for offline play.\nWASD move; mouse aim; click strike; Q parry; E ward; Space dash; Enter type; Escape move.\nWhile typing: arrows move; right-click steers; Alt Q/E/F defenses.\nFlag Hunt: reach purple relay, scan four times, then hold the verified flag site for 4s.\nThe objective is a synthetic clue puzzle, not a real exploitation CTF.\nFull project and detailed instructions: source/README.md\n')
    for name in sorted(set(files)):
        path=root/name
        if not path.is_file() or name.startswith(('.git/','node_modules/','dist/','.wrangler/','.env')):continue
        if name=='.openai/hosting.json':
            manifest=json.loads(path.read_text());manifest.pop('project_id',None)
            archive.writestr('source/'+name,json.dumps(manifest,indent=2)+'\n')
        else:archive.write(path,'source/'+name)
    archive.writestr('source/.env.example','# Server-only configuration. Never include an OpenAI API key in client files.\nJAOYA_VAULT_KEY=replace_with_a_random_32_byte_hex_secret\n')
print(json.dumps({'path':str(output),'bytes':output.stat().st_size,'entries':len(zipfile.ZipFile(output).namelist())}))
