import argparse
import ast
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
from urllib.parse import urlsplit

RAIZ = Path(__file__).resolve().parents[2]


class Referencias(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.ids = []

    def handle_starttag(self, tag, attrs):
        atributos = dict(attrs)
        if tag == 'script' and atributos.get('src'):
            self.scripts.append(atributos['src'])
        if atributos.get('id'):
            self.ids.append(atributos['id'])


def executar(modo):
    if modo == 'minimos':
        for arquivo in (RAIZ / 'tools').rglob('*.py'):
            ast.parse(arquivo.read_text(encoding='utf-8'), filename=str(arquivo))
        for arquivo in (RAIZ / 'web' / 'config').glob('*.json'):
            json.loads(arquivo.read_text(encoding='utf-8'))
    elif modo == 'web':
        for arquivo in sorted((RAIZ / 'web').rglob('*.js')):
            subprocess.run(['node', '--input-type=module', '--check'], input=arquivo.read_text(encoding='utf-8'), text=True, check=True)
        index = (RAIZ / 'web' / 'index.html').read_text(encoding='utf-8')
        for codigo in re.findall(r'<script>(.*?)</script>', index, re.S):
            subprocess.run(['node', '--check'], input=codigo, text=True, check=True)
        referencias = Referencias()
        referencias.feed(index)
        if len(set(referencias.ids)) != len(referencias.ids):
            raise ValueError('IDs repetidos no HTML')
        for src in referencias.scripts:
            url = urlsplit(src)
            if not url.scheme and not url.netloc and not (RAIZ / 'web' / url.path).is_file():
                raise ValueError('Script local inexistente: ' + src)
    elif modo == 'documentacao':
        for arquivo in (RAIZ / 'docs').rglob('*.md'):
            if not arquivo.read_text(encoding='utf-8').strip():
                raise ValueError('Documento vazio: ' + str(arquivo))
    elif modo == 'workflows':
        import yaml
        for arquivo in (RAIZ / '.github' / 'workflows').glob('*.yml'):
            dados = yaml.load(arquivo.read_text(encoding='utf-8'), Loader=yaml.BaseLoader)
            if not isinstance(dados, dict) or not dados.get('on') or not dados.get('jobs'):
                raise ValueError('Workflow invalido: ' + str(arquivo))
            for job in dados['jobs'].values():
                for passo in job.get('steps', []):
                    for codigo in re.findall(r"python - <<'PY'\n(.*?)\nPY", passo.get('run', ''), re.S):
                        ast.parse(codigo, filename=str(arquivo))
        actionlint = shutil.which('actionlint')
        if actionlint:
            subprocess.run([actionlint], cwd=RAIZ, check=True)
        else:
            print('actionlint indisponivel localmente; validacao YAML executada.')
    print('OK: ' + modo)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--modo', choices=['minimos', 'web', 'documentacao', 'workflows'], required=True)
    args = parser.parse_args()
    executar(args.modo)