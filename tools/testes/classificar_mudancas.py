"""Selecao conservadora de testes; grupos.yaml usa o subconjunto JSON do YAML."""
import argparse
from fnmatch import fnmatchcase
import json
import os
from pathlib import Path
import re
import subprocess
import sys

RAIZ = Path(__file__).resolve().parents[2]
CONFIG = Path(__file__).with_name('grupos.yaml')


def carregar_config(caminho=CONFIG):
    dados = json.loads(Path(caminho).read_text(encoding='utf-8'))
    if not isinstance(dados, dict) or dados.get('versao') != 1 or not isinstance(dados.get('grupos'), dict) or not isinstance(dados.get('regras'), list):
        raise ValueError('Estrutura de grupos.yaml invalida')
    for regra in dados['regras']:
        if not isinstance(regra, dict) or not isinstance(regra.get('caminhos'), list) or not regra.get('caminhos') or not isinstance(regra.get('dominio'), str) or not isinstance(regra.get('grupos'), list) or not regra['grupos']:
            raise ValueError('Regra incompleta')
        if any(not isinstance(padrao, str) for padrao in regra['caminhos']):
            raise ValueError('Padrao de caminho invalido')
        if any(not isinstance(nome, str) for nome in regra['grupos']):
            raise ValueError('Nome de grupo invalido')
        if set(regra['grupos']) - dados['grupos'].keys():
            raise ValueError('Regra referencia grupo desconhecido')
    for grupo in dados['grupos'].values():
        if not isinstance(grupo, dict) or grupo.get('tipo') not in ('estatico', 'navegador') or not isinstance(grupo.get('gerador'), bool):
            raise ValueError('Metadados de grupo invalidos')
        if grupo['tipo'] == 'navegador' and not grupo.get('numeros'):
            raise ValueError('Grupo de navegador sem identificadores')
        if grupo['tipo'] == 'navegador' and (not isinstance(grupo['numeros'], list) or any(type(numero) is not int or not 1 <= numero <= 21 for numero in grupo['numeros'])):
            raise ValueError('Identificador de navegador invalido')
    if set(dados.get('minimos', [])) - dados['grupos'].keys():
        raise ValueError('Teste minimo desconhecido')
    return dados


def corresponde(caminho, padrao):
    expressao = re.escape(padrao).replace(r'\*\*/', '(?:.*/)?').replace(r'\*\*', '.*').replace(r'\*', '[^/]*').replace(r'\?', '[^/]')
    return re.fullmatch(expressao, caminho) is not None


def git(raiz, *args):
    return subprocess.run(['git', *args], cwd=raiz, check=True, capture_output=True).stdout


def mudancas_git(base, head, raiz=RAIZ, merge_base=False):
    if not base or re.fullmatch('0+', base):
        raise ValueError('Base do diff indisponivel')
    base = git(raiz, 'rev-parse', '--verify', '--end-of-options', base + '^{commit}').decode().strip()
    head = git(raiz, 'rev-parse', '--verify', '--end-of-options', head + '^{commit}').decode().strip()
    if merge_base:
        base = git(raiz, 'merge-base', base, head).decode().strip()
    partes = git(raiz, 'diff', '--name-status', '-z', '--find-renames', base, head, '--').decode('utf-8').split('\0')
    registros = []
    indice = 0
    while indice < len(partes) and partes[indice]:
        status = partes[indice]
        indice += 1
        antigo = partes[indice]
        indice += 1
        if status.startswith(('R', 'C')):
            novo = partes[indice]
            indice += 1
            registros.append({'status': status, 'antigo': antigo, 'caminho': novo})
        else:
            registros.append({'status': status, 'caminho': antigo})
    raw = git(raiz, 'diff', '--raw', base, head, '--')
    inesperado = bool(re.search(rb'^:(?:160000 [0-7]{6}|[0-7]{6} 160000) ', raw, re.M))
    for linha in git(raiz, 'diff', '--numstat', base, head, '--').decode('utf-8').splitlines():
        if linha.startswith('-\t-\t') and not linha.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.woff2', '.zip')):
            inesperado = True
    return registros, base, head, inesperado


def classificar(registros, config=None, completo=False, evento='', branch='', base='', head='', raiz=RAIZ):
    config = config or carregar_config()
    caminhos = sorted({registro[chave].replace('\\', '/') for registro in registros for chave in ('caminho', 'antigo') if registro.get(chave)})
    dominios, grupos, motivos = set(), set(config['minimos']), []
    publicar = False
    for caminho in caminhos:
        regra = next((regra for regra in config['regras'] if any(corresponde(caminho, padrao) for padrao in regra['caminhos'])), None)
        if regra is None:
            completo = True
            publicar = True
            dominios.add('desconhecido')
            motivos.append(f'{caminho}: caminho desconhecido; suite completa')
            continue
        dominio = regra['dominio']
        selecionados = regra['grupos']
        critico = regra.get('completo', False)
        if caminho == 'web/index.html' and base and head:
            try:
                anterior = git(raiz, 'show', base + ':' + caminho).decode('utf-8')
                atual = git(raiz, 'show', head + ':' + caminho).decode('utf-8')
                limpar = lambda texto: re.sub(r'([?&]v=)[0-9.]+', r'\1VERSAO', texto)
                if limpar(anterior) == limpar(atual):
                    dominio, selecionados, critico = 'versao', ['versao'], False
            except (subprocess.CalledProcessError, UnicodeError):
                critico = True
        if dominio == 'exemplo':
            especial = True
            if base and head:
                try:
                    diff = git(raiz, 'diff', '--unified=0', base, head, '--', caminho).decode('utf-8')
                    alteradas = '\n'.join(linha[1:] for linha in diff.splitlines() if linha.startswith(('+', '-')) and not linha.startswith(('+++', '---')))
                    especial = bool(re.search(r'!\[|```|mermaid|<!--|^\||^\s*[-*]\s|^\s*\d+\.|^---', alteradas, re.M))
                except (subprocess.CalledProcessError, UnicodeError):
                    pass
            if especial:
                selecionados = ['exemplo', 'gerador_imagens', 'gerador_mermaid', 'gerador_html_apostila', 'gerador_html_apresentacao', 'gerador_docx', 'gerador_pptx', 'gerador_epub']
        dominios.add(dominio)
        grupos.update(selecionados)
        completo = completo or critico
        publicar = publicar or regra.get('publicar', False)
        motivos.append(f'{caminho}: {dominio} -> {", ".join(selecionados)}' + ('; suite completa' if critico else ''))
    funcionais = dominios - {'documentacao', 'versao'}
    if len(funcionais) >= 3:
        completo = True
        motivos.append('Tres ou mais dominios funcionais: suite completa')
    if evento in ('schedule', 'release', 'tag'):
        completo = True
        motivos.append(f'{evento}: suite completa')
    if evento == 'push' and branch == 'main' and publicar:
        completo = True
        motivos.append('Publicacao de main exige validacao completa do SHA')
    resultado = finalizar(caminhos, dominios, grupos, motivos, completo, publicar, config, base, head)
    resultado['delegado_publicacao'] = evento == 'push' and branch == 'main' and publicar
    return resultado


def finalizar(caminhos, dominios, grupos, motivos, completo, publicar, config, base='', head='', erro=''):
    grupos = sorted(grupos)
    navegador = completo or any(config['grupos'][grupo]['tipo'] == 'navegador' for grupo in grupos)
    gerador = completo or any(config['grupos'][grupo]['gerador'] for grupo in grupos)
    estaticos = [grupo for grupo in grupos if config['grupos'][grupo]['tipo'] == 'estatico' and grupo not in config['minimos']]
    browsers = [grupo for grupo in grupos if config['grupos'][grupo]['tipo'] == 'navegador']
    return dict(arquivos=caminhos, dominios=sorted(dominios), minimos=config['minimos'], grupos=grupos,
                estaticos=estaticos, navegador_grupos=browsers, completo=bool(completo), publicar=publicar,
                motivos=motivos, python=True, playwright=navegador, chrome=navegador, gerador=gerador,
                gerador_estaticos=completo or any(config['grupos'][grupo]['gerador'] for grupo in estaticos),
                gerador_navegador=completo or any(config['grupos'][grupo]['gerador'] for grupo in browsers),
                somente_documentacao=bool(dominios) and set(dominios) <= {'documentacao'},
                base=base, head=head, erro=erro)


def escrever_outputs(resultado, caminho):
    if not caminho:
        return
    campos = {'grupos_json': json.dumps(resultado['grupos']), 'estaticos_json': json.dumps(resultado['estaticos']),
              'navegador_json': json.dumps(resultado['navegador_grupos']), 'completo': resultado['completo'],
              'instalar_python': True, 'instalar_playwright': resultado['playwright'], 'instalar_chrome': resultado['chrome'],
              'instalar_gerador': resultado['gerador'], 'somente_documentacao': resultado['somente_documentacao'],
              'gerador_estaticos': resultado['gerador_estaticos'], 'gerador_navegador': resultado['gerador_navegador'],
              'delegado_publicacao': resultado.get('delegado_publicacao', False),
              'publicar': resultado['publicar'], 'resumo': '; '.join(resultado['motivos'])[:1500]}
    with open(caminho, 'a', encoding='utf-8') as arquivo:
        for chave, valor in campos.items():
            texto = str(valor).lower() if isinstance(valor, bool) else str(valor)
            arquivo.write(f'{chave}={texto.replace(chr(10), " ").replace(chr(13), " ")}\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default='HEAD~1')
    parser.add_argument('--head', default='HEAD')
    parser.add_argument('--merge-base', action='store_true')
    parser.add_argument('--completo', action='store_true')
    parser.add_argument('--evento', default='')
    parser.add_argument('--branch', default='')
    parser.add_argument('--saida')
    parser.add_argument('--config', default=str(CONFIG))
    parser.add_argument('--github-output', default=os.environ.get('GITHUB_OUTPUT'))
    args = parser.parse_args()
    erro = ''
    try:
        config = carregar_config(args.config)
        registros, base, head, inesperado = mudancas_git(args.base, args.head, merge_base=args.merge_base)
        mensagem = git(RAIZ, 'log', '-1', '--format=%B', head).decode('utf-8')
        resultado = classificar(registros, config, args.completo or inesperado or '[testes completos]' in mensagem.lower(), args.evento, args.branch, base, head)
        if inesperado:
            resultado['motivos'].append('Binario inesperado ou submodulo: suite completa')
    except (ValueError, OSError, subprocess.CalledProcessError, UnicodeError, TypeError, KeyError) as exc:
        erro = f'{type(exc).__name__}: {exc}'
        try:
            config = carregar_config()
        except (ValueError, OSError):
            config = {'minimos': [], 'grupos': {}}
        resultado = finalizar([], {'desconhecido'}, config['minimos'], ['Falha na classificacao: suite completa'], True, True, config, args.base, args.head, erro)
        resultado['delegado_publicacao'] = args.evento == 'push' and args.branch == 'main'
    texto = json.dumps(resultado, ensure_ascii=False, indent=2)
    if args.saida:
        Path(args.saida).write_text(texto + '\n', encoding='utf-8')
    print(texto)
    escrever_outputs(resultado, args.github_output)
    resumo = os.environ.get('GITHUB_STEP_SUMMARY')
    if resumo:
        with open(resumo, 'a', encoding='utf-8') as arquivo:
            arquivo.write('## Selecao de testes\n\n' + '\n'.join('- ' + motivo for motivo in resultado['motivos']) + '\n\n```json\n' + texto + '\n```\n')
    return 2 if erro else 0


if __name__ == '__main__':
    sys.exit(main())