#!/usr/bin/env python3
"""Create a standalone offline game and a sanitized full-source ZIP."""
from pathlib import Path
import json,re,subprocess,sys,zipfile
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
html=(root/'public/game/index.html').read_text()
html=html.replace('<link rel="stylesheet" href="/game/style.css">','<style>'+(root/'public/game/style.css').read_text()+'</style>')
html=html.replace('<script type="module" src="/game/ui.js"></script>','<script type="module">\n'+ '\n'.join(code).replace('</script','<\\/script')+'\n</script>')
# A static file has no authenticated API server. Keep its UI truthful.
html=html.replace('Bring an OpenAI Platform API key', 'This offline file cannot connect to APIs. Open the hosted JAOYA Site to bring an OpenAI Platform API key')
html=re.sub(r'(<form id="connectForm">)(.*?)(</form>)',r'\1<fieldset disabled style="border:0;padding:0;margin:0">\2</fieldset>\3',html,flags=re.S)
html=html.replace('id="disconnectButton"','id="disconnectButton" disabled')
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
