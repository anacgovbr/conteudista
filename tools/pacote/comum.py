# -*- coding: utf-8 -*-
"""Funções comuns dos pacotes de atualização do Conteudista (formato 1).

Pacote = arquivo ZIP com:
  manifesto.json            versão, versão anterior, título, mensagem do commit e a lista de arquivos
  arquivos/<caminho>        conteúdo novo de cada arquivo alterado ou criado (texto UTF-8, quebras LF)

Cada item da lista: {"caminho": "web/x.js", "antes": <sha256 normalizado ou null>, "depois": <sha256 normalizado ou null>}
  antes = null  -> arquivo novo (não pode existir, ou já deve estar igual ao "depois")
  depois = null -> arquivo removido
O hash é do conteúdo NORMALIZADO: sem BOM, CRLF -> LF e sem quebras de linha no fim.
Assim, o mesmo pacote vale para cópias do repositório com CRLF (Windows) ou LF (Linux, GitHub)."""
import hashlib, json, os, posixpath, re, zipfile

FORMATO = 1
LIMITE_ZIP = 25 * 1024 * 1024          # bytes do ZIP
LIMITE_TOTAL = 80 * 1024 * 1024        # bytes descompactados
LIMITE_ITENS = 2000
PROIBIDOS = ('.git/', '.github/workflows/')   # o GITHUB_TOKEN não pode alterar workflows


def normalizado(b):
    if b.startswith(b'\xef\xbb\xbf'):
        b = b[3:]
    return b.replace(b'\r\n', b'\n').rstrip(b'\n')


def assinatura(b):
    return hashlib.sha256(normalizado(b)).hexdigest()


def caminho_seguro(c):
    """Recusa caminhos absolutos, com '..', barras invertidas, vazios ou em pastas proibidas."""
    if not isinstance(c, str) or not c or c != c.strip() or '\\' in c or c.startswith('/') or re.match(r'^[A-Za-z]:', c):
        return False
    n = posixpath.normpath(c)
    if n != c or n.startswith('../') or n == '..' or '/../' in '/' + n + '/':
        return False
    return not any(n == p.rstrip('/') or n.startswith(p) for p in ('.git/',))


def versao_de(raiz):
    p = os.path.join(raiz, 'web', 'changelog.js')
    if not os.path.isfile(p):
        return ''
    m = re.search(r"const VERSAO = '([\d.]+)'", open(p, encoding='utf-8', errors='replace').read())
    return m.group(1) if m else ''


def ler_pacote(caminho_zip):
    """Abre e valida a estrutura do pacote. Devolve (manifesto, conteudos{caminho: bytes}). Erros: ValueError com mensagem simples."""
    if not os.path.isfile(caminho_zip):
        raise ValueError('Pacote não encontrado: %s' % caminho_zip)
    if os.path.getsize(caminho_zip) > LIMITE_ZIP:
        raise ValueError('O pacote passa de %d MB.' % (LIMITE_ZIP // 1024 // 1024))
    try:
        z = zipfile.ZipFile(caminho_zip)
    except zipfile.BadZipFile:
        raise ValueError('O arquivo não é um ZIP válido (o download pode ter sido interrompido).')
    with z:
        nomes = z.namelist()
        if len(nomes) > LIMITE_ITENS:
            raise ValueError('O pacote tem itens demais.')
        if sum(i.file_size for i in z.infolist()) > LIMITE_TOTAL:
            raise ValueError('O pacote descompactado passa de %d MB.' % (LIMITE_TOTAL // 1024 // 1024))
        if 'manifesto.json' not in nomes:
            raise ValueError('O ZIP não tem manifesto.json: não é um pacote do Conteudista.')
        try:
            m = json.loads(z.read('manifesto.json').decode('utf-8'))
        except Exception as e:
            raise ValueError('manifesto.json inválido: %s' % e)
        if m.get('formato') != FORMATO:
            raise ValueError('Formato de pacote %r não reconhecido (esperado %d).' % (m.get('formato'), FORMATO))
        for k in ('versao', 'anterior', 'titulo', 'mensagem', 'arquivos'):
            if not m.get(k) and m.get(k) != []:
                raise ValueError('manifesto.json sem o campo "%s".' % k)
        if not re.fullmatch(r'\d+(\.\d+){1,3}', str(m['versao'])) or not re.fullmatch(r'\d+(\.\d+){1,3}', str(m['anterior'])):
            raise ValueError('Versões inválidas no manifesto.')
        vistos, conteudos = set(), {}
        for it in m['arquivos']:
            c = it.get('caminho')
            if not caminho_seguro(c):
                raise ValueError('Caminho não permitido no pacote: %r' % c)
            if c in vistos:
                raise ValueError('Arquivo repetido no manifesto: %s' % c)
            vistos.add(c)
            if it.get('antes') is None and it.get('depois') is None:
                raise ValueError('Item sem "antes" nem "depois": %s' % c)
            if it.get('depois') is not None:
                n = 'arquivos/' + c
                if n not in nomes:
                    raise ValueError('O pacote não traz o conteúdo de %s.' % c)
                b = z.read(n)
                if assinatura(b) != it['depois']:
                    raise ValueError('Conteúdo de %s não confere com o manifesto (pacote corrompido).' % c)
                conteudos[c] = b
        extras = [n for n in nomes if n.startswith('arquivos/') and not n.endswith('/') and n[9:] not in conteudos]
        if extras:
            raise ValueError('O pacote traz arquivos fora do manifesto: %s' % ', '.join(extras[:5]))
    return m, conteudos
