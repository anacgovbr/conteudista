# -*- coding: utf-8 -*-
"""Confere e aplica um pacote de atualização do Conteudista (veja comum.py e tools/pacote/LEIA-ME.md).

Uso:
  python tools/pacote/aplicar.py PACOTE.zip [--raiz .] [--conferir] [--resumo arquivo.md]
  python tools/pacote/aplicar.py --localizar [--raiz .]      mostra o próximo pacote do repositório (raiz ou pacotes/)

Códigos de saída: 0 aplicado · 2 recusado (nada foi alterado) · 3 já estava aplicado · 4 nenhum pacote.
Nunca altera nada se alguma conferência falhar: primeiro confere tudo, depois grava."""
import argparse, glob, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comum import PROIBIDOS, assinatura, ler_pacote, versao_de

for _f in (sys.stdout, sys.stderr):
    try:
        _f.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


def localizar(raiz):
    l = sorted(glob.glob(os.path.join(raiz, '*.zip')) + glob.glob(os.path.join(raiz, 'pacotes', '*.zip')))
    l = [p for p in l if not os.path.basename(p).startswith('conteudista-web')]
    return os.path.relpath(l[0], raiz).replace('\\', '/') if l else ''


def conferir(raiz, caminho_zip):
    """Devolve (situacao, manifesto, conteudos, linhas). situacao: 'aplicar' | 'aplicado' | 'recusado'."""
    linhas = []
    try:
        m, conteudos = ler_pacote(caminho_zip)
    except ValueError as e:
        return 'recusado', None, {}, ['**Pacote recusado:** %s' % e]
    v = versao_de(raiz)
    linhas.append('Pacote **%s** · %s (de %s para %s) · versão no repositório: %s' % (os.path.basename(caminho_zip), m['titulo'], m['anterior'], m['versao'], v or '?'))
    proib = [it['caminho'] for it in m['arquivos'] if any(it['caminho'].startswith(p) for p in PROIBIDOS)]
    if proib:
        linhas.append('**Pacote recusado:** ele altera fluxos do GitHub (%s). Esses arquivos só podem ser aplicados pelo script do computador (PowerShell).' % ', '.join(proib))
        return 'recusado', m, conteudos, linhas
    estado = []
    for it in m['arquivos']:
        cam = os.path.join(raiz, it['caminho'])
        atual = assinatura(open(cam, 'rb').read()) if os.path.isfile(cam) else None
        estado.append((it, atual))
    if all(atual == it['depois'] for it, atual in estado):
        linhas.append('Todos os arquivos já estão como no pacote: nada a aplicar.')
        return 'aplicado', m, conteudos, linhas
    if v != m['anterior']:
        linhas.append('**Pacote recusado:** ele foi feito para a versão %s, mas o repositório está na %s. Aplique antes os pacotes que faltam ou peça um pacote novo.' % (m['anterior'], v or '?'))
        return 'recusado', m, conteudos, linhas
    divergentes = [it['caminho'] for it, atual in estado if atual != it['antes'] and atual != it['depois']]
    if divergentes:
        linhas.append('**Pacote recusado:** estes arquivos mudaram depois que o pacote foi feito. Envie uma exportação nova para refazer o pacote:')
        linhas += ['- `%s`' % c for c in divergentes]
        return 'recusado', m, conteudos, linhas
    novos = sum(1 for it, a in estado if it['antes'] is None and it['depois'] is not None and a is None)
    remov = sum(1 for it, a in estado if it['depois'] is None and a is not None)
    alt = sum(1 for it, a in estado if a != it['depois']) - novos - remov
    linhas.append('Conferido: %d alterado(s), %d novo(s), %d removido(s).' % (alt, novos, remov))
    return 'aplicar', m, conteudos, linhas


def gravar(raiz, m, conteudos):
    for it in m['arquivos']:
        cam = os.path.join(raiz, it['caminho'])
        if it['depois'] is None:
            if os.path.isfile(cam):
                os.remove(cam)
            continue
        b = conteudos[it['caminho']]
        if os.path.isfile(cam) and assinatura(open(cam, 'rb').read()) == it['depois']:
            continue
        os.makedirs(os.path.dirname(cam) or '.', exist_ok=True)
        with open(cam, 'wb') as f:
            f.write(b)


def main(argv=None):
    a = argparse.ArgumentParser(description='Confere e aplica um pacote do Conteudista.')
    a.add_argument('pacote', nargs='?')
    a.add_argument('--raiz', default='.')
    a.add_argument('--conferir', action='store_true', help='só confere, sem gravar')
    a.add_argument('--localizar', action='store_true')
    a.add_argument('--resumo', help='grava o resultado em Markdown neste arquivo')
    a.add_argument('--saida-github', help='arquivo $GITHUB_OUTPUT para versao, titulo e mensagem')
    x = a.parse_args(argv)
    raiz = os.path.abspath(x.raiz)
    if x.localizar:
        p = localizar(raiz)
        print(p)
        return 0 if p else 4
    if not x.pacote:
        a.error('informe o pacote')
    situacao, m, conteudos, linhas = conferir(raiz, x.pacote)
    if situacao == 'aplicar' and not x.conferir:
        gravar(raiz, m, conteudos)
        linhas.append('Arquivos gravados.')
    texto = '\n\n'.join(linhas) + '\n'
    print(texto)
    if x.resumo:
        with open(x.resumo, 'a', encoding='utf-8') as f:
            f.write(texto)
    if x.saida_github and m:
        with open(x.saida_github, 'a', encoding='utf-8') as f:
            f.write('versao=%s\nanterior=%s\ntitulo=%s\nmensagem=%s\n' % (m['versao'], m['anterior'], m['titulo'].replace('\n', ' '), m['mensagem'].replace('\n', ' ')))
            f.write('caminhos<<FIM_CAMINHOS\n%s\nFIM_CAMINHOS\n' % '\n'.join(it['caminho'] for it in m['arquivos']))
    return {'aplicar': 0, 'aplicado': 3, 'recusado': 2}[situacao]


if __name__ == '__main__':
    sys.exit(main())
