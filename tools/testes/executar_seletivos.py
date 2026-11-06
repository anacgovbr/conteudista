import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

from classificar_mudancas import CONFIG, RAIZ, carregar_config, classificar, mudancas_git


def selecionar(args, config):
    if args.completo:
        return ['completo']
    if args.grupo or args.grupos:
        nomes = set(args.grupo or [])
        nomes.update(nome.strip() for nome in (args.grupos or '').split(',') if nome.strip())
        desconhecidos = nomes - config['grupos'].keys()
        if desconhecidos:
            raise ValueError('Grupos desconhecidos: ' + ', '.join(sorted(desconhecidos)))
        return sorted(nomes)
    if args.selecao:
        resultado = json.loads(Path(args.selecao).read_text(encoding='utf-8'))
    else:
        registros, base, head, inesperado = mudancas_git(args.base, args.head, merge_base=args.merge_base)
        resultado = classificar(registros, config, completo=inesperado, base=base, head=head)
    if resultado['completo']:
        return ['completo']
    nomes = resultado['grupos']
    if set(nomes) - config['grupos'].keys():
        raise ValueError('Selecao contem grupo desconhecido')
    return sorted(set(nomes))


def comandos(grupo, saida):
    python = sys.executable
    testes = RAIZ / 'tools' / 'testes'
    executar = lambda arquivo, *args: [python, str(testes / arquivo), *args]
    mapa = {
        'minimos': [executar('testar_estaticos.py', '--modo', 'minimos'), executar('testar_classificador.py'), executar('testar_seletivos.py')],
        'versao': [executar('testar_versao.py')],
        'documentacao': [executar('testar_apresentacao.py', '--grupo', '5', '--saida', str(saida / 'documentacao'))],
        'estatico_web': [executar('testar_estaticos.py', '--modo', 'web')],
        'modulos': [executar('testar_modulos.py'), ['node', str(testes / 'testar_motor_python.mjs')]],
        'biblioteca': [['node', 'tools/linguagem-acessivel/testar.mjs']],
        'lac': [['node', 'tools/lac/testar_lac.mjs'], ['node', 'tools/lac/testar_api.mjs']],
        'opcoes': [['node', 'tools/opcoes/testar_opcoes.js'], ['node', 'tools/opcoes/verificar_opcoes.js']],
        'pacote': [[python, 'tools/pacote/testar_pacote.py']],
        'workflows': [executar('testar_estaticos.py', '--modo', 'workflows')],
        'fontes': [[python, 'tools/fontes/verificar_fontes.py']],
        'locucao': [executar('testar_estaticos.py', '--modo', 'web'), ['node', '--input-type=module', '-e', "import {readFileSync} from 'node:fs';const m=await import('data:text/javascript;base64,'+readFileSync('web/ptbr-g2p.js').toString('base64'));const r=m.phonemizePTBR('Olá, mundo. A gestão de processos.');if(!/ˈ/.test(r))process.exit(1);console.log(r)"]],
        'exemplo': [['node', 'tools/lac/lac.mjs', 'c', '-n', 'c', 'web/exemplo/treinamento.md', 'web/exemplo/apresentacao.md'], executar('testar_formatos.py', '--formato', 'exemplo')],
    }
    if grupo in mapa:
        return mapa[grupo]
    if grupo in ('gerador_acessibilidade', 'gerador_imagens', 'gerador_mermaid'):
        return [executar('testar_formatos.py', '--formato', formato) for formato in ('html_apostila', 'html_apresentacao', 'docx', 'pptx', 'epub')]
    if grupo.startswith('gerador_'):
        return [executar('testar_formatos.py', '--formato', grupo.removeprefix('gerador_'))]
    if grupo == 'completo':
        bash = shutil.which('bash')
        if os.name == 'nt' and Path('C:/Program Files/Git/bin/bash.exe').is_file():
            bash = 'C:/Program Files/Git/bin/bash.exe'
        if not bash:
            raise ValueError('Bash necessario para a verificacao completa')
        return [[bash, 'tools/verificar.sh'], executar('testar_apresentacao.py', '--completo', '--saida', str(saida / 'navegador'))]
    return [executar('testar_apresentacao.py', '--grupo', grupo, '--saida', str(saida / grupo))]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--grupo', action='append')
    parser.add_argument('--grupos')
    parser.add_argument('--completo', action='store_true')
    parser.add_argument('--listar-grupos', action='store_true')
    parser.add_argument('--base', default='HEAD~1')
    parser.add_argument('--head', default='HEAD')
    parser.add_argument('--merge-base', action='store_true')
    parser.add_argument('--selecao')
    parser.add_argument('--tipo', choices=['todos', 'estatico', 'navegador'], default='todos')
    parser.add_argument('--saida', type=Path, default=Path(tempfile.gettempdir()) / 'conteudista-seletivos')
    args = parser.parse_args()
    config = carregar_config()
    if args.listar_grupos:
        print(json.dumps(config['grupos'], indent=2))
        return 0
    try:
        grupos = selecionar(args, config)
    except (ValueError, OSError, subprocess.CalledProcessError) as exc:
        if args.grupo or args.grupos:
            parser.error(str(exc))
        print('Falha na selecao; executando suite completa: ' + str(exc))
        grupos = ['completo']
    if args.tipo != 'todos' and grupos != ['completo']:
        grupos = [grupo for grupo in grupos if config['grupos'][grupo]['tipo'] == args.tipo and (not args.selecao or grupo not in config['minimos'])]
    args.saida.mkdir(parents=True, exist_ok=True)
    inicio = time.perf_counter()
    resultados = []
    ambiente = dict(os.environ, PYTHON=sys.executable, PYTHONUTF8='1', PYTHONIOENCODING='utf-8')
    executados = set()
    navegador_grupos = [grupo for grupo in grupos if grupo != 'completo' and config['grupos'][grupo]['tipo'] == 'navegador']
    execucoes = [grupo for grupo in grupos if grupo not in navegador_grupos] + (['navegador'] if navegador_grupos else [])
    for grupo in execucoes:
        comeco = time.perf_counter()
        codigo = 0
        try:
            tarefas = comandos(grupo, args.saida) if grupo != 'navegador' else [[sys.executable, str(RAIZ / 'tools/testes/testar_apresentacao.py'), '--grupos', ','.join(navegador_grupos), '--saida', str(args.saida / 'navegador')]]
            for comando in tarefas:
                chave = tuple(comando)
                if chave in executados:
                    continue
                executados.add(chave)
                resultado = subprocess.run(comando, cwd=RAIZ, env=ambiente)
                codigo = max(codigo, resultado.returncode)
        except (OSError, ValueError) as exc:
            print(str(exc), file=sys.stderr)
            codigo = 2
        resultados.append(dict(grupo=grupo, codigo=codigo, duracao_s=round(time.perf_counter() - comeco, 3)))
    resumo = dict(base=args.base, head=args.head, grupos=grupos, duracao_s=round(time.perf_counter() - inicio, 3), resultados=resultados)
    (args.saida / 'seletivos.json').write_text(json.dumps(resumo, indent=2) + '\n', encoding='utf-8')
    texto = '# Testes seletivos\n\n| Grupo | Resultado | Duracao (s) |\n|---|---|---|\n' + '\n'.join(f'| {item["grupo"]} | {item["codigo"]} | {item["duracao_s"]} |' for item in resultados)
    texto += f'\n\nDuracao total: {resumo["duracao_s"]} s. Economia nao estimada sem historico equivalente.\n'
    (args.saida / 'seletivos.md').write_text(texto, encoding='utf-8')
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as arquivo:
            arquivo.write(texto)
    return int(any(item['codigo'] != 0 for item in resultados))


if __name__ == '__main__':
    sys.exit(main())