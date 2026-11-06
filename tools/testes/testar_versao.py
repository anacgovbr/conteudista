import argparse
from pathlib import Path
import re
import sys

RAIZ = Path(__file__).resolve().parents[2]


def verificar(raiz=RAIZ):
    changelog = (raiz / 'CHANGELOG.md').read_text(encoding='utf-8')
    codigo = (raiz / 'web' / 'changelog.js').read_text(encoding='utf-8')
    index = (raiz / 'web' / 'index.html').read_text(encoding='utf-8')
    versoes = re.findall(r'^##\s+([0-9]+(?:\.[0-9]+){1,2})\b', changelog, re.M)
    atual = re.search(r"const VERSAO = '([0-9]+(?:\.[0-9]+){1,2})'", codigo)
    erros = []
    if not atual or not versoes or versoes[0] != atual.group(1):
        erros.append('Versao atual divergente entre CHANGELOG e changelog.js')
        return erros
    ordenar = lambda versao: tuple(map(int, versao.split('.'))) + (0,) * (3 - len(versao.split('.')))
    if len(set(versoes)) != len(versoes) or sorted(versoes, key=ordenar, reverse=True) != versoes:
        erros.append('CHANGELOG com versoes repetidas ou fora de ordem')
    for nome, versao in re.findall(r'(\w[\w.-]*\.js)\?v=([0-9.]+)', index):
        if not re.fullmatch(r'[0-9]+(?:\.[0-9]+){1,2}', versao) or ordenar(versao) > ordenar(atual.group(1)):
            erros.append(f'{nome}: cache-buster invalido ou futuro ({versao})')
    obrigatorios = ('opcoes.js', 'ajuda.js', 'changelog.js', 'acessibilidade.js', 'acessibilidade-marcas.js',
                    'acessibilidade-janelas.js', 'acessibilidade-geracao.js', 'relatorio-acessibilidade.js',
                    'acessibilidade-config.js', 'vlibras.js')
    for nome in obrigatorios:
        if nome + '?v=' + atual.group(1) not in index:
            erros.append(f'{nome}: cache-buster nao corresponde a versao atual')
    return erros


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--raiz', type=Path, default=RAIZ)
    args = parser.parse_args()
    erros = verificar(args.raiz)
    print('\n'.join(erros) if erros else 'OK: coerencia de versao e cache-busters, sem navegador.')
    return bool(erros)


if __name__ == '__main__':
    sys.exit(main())