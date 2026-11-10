import re
from html import escape


LICENCAS = {
    'cc-by-4.0': {
        'nome': 'Creative Commons Atribuição 4.0 Internacional',
        'sigla': 'CC BY 4.0',
        'url': 'https://creativecommons.org/licenses/by/4.0/',
    },
    'cc-by-sa-4.0': {
        'nome': 'Creative Commons Atribuição-CompartilhaIgual 4.0 Internacional',
        'sigla': 'CC BY-SA 4.0',
        'url': 'https://creativecommons.org/licenses/by-sa/4.0/',
    },
    'cc-by-nd-4.0': {
        'nome': 'Creative Commons Atribuição-SemDerivações 4.0 Internacional',
        'sigla': 'CC BY-ND 4.0',
        'url': 'https://creativecommons.org/licenses/by-nd/4.0/',
    },
    'cc-by-nc-4.0': {
        'nome': 'Creative Commons Atribuição-NãoComercial 4.0 Internacional',
        'sigla': 'CC BY-NC 4.0',
        'url': 'https://creativecommons.org/licenses/by-nc/4.0/',
    },
    'cc-by-nc-sa-4.0': {
        'nome': 'Creative Commons Atribuição-NãoComercial-CompartilhaIgual 4.0 Internacional',
        'sigla': 'CC BY-NC-SA 4.0',
        'url': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    },
    'cc-by-nc-nd-4.0': {
        'nome': 'Creative Commons Atribuição-NãoComercial-SemDerivações 4.0 Internacional',
        'sigla': 'CC BY-NC-ND 4.0',
        'url': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    },
    'cc0-1.0': {
        'nome': 'CC0 1.0 Universal',
        'sigla': 'CC0 1.0',
        'url': 'https://creativecommons.org/publicdomain/zero/1.0/',
    },
}

RESSALVA = 'Marcas e materiais de terceiros não estão abrangidos por esta declaração, salvo indicação expressa.'
CSS = ('.licenciamento{margin-block:2rem 0;padding-top:1rem;border-top:1px solid currentColor;'
    'color:inherit;font-size:1rem;line-height:1.55;overflow-wrap:anywhere}'
    '.licenciamento h2{margin:0 0 .5rem;font-size:1.1em;color:inherit}'
    '.licenciamento p{margin:.35rem 0}.licenciamento a{text-decoration:underline}')


def validar(codigo=''):
    if codigo is None or codigo == '':
        return ''
    if not isinstance(codigo, str) or codigo not in LICENCAS:
        raise ValueError('Licenca desconhecida: %s' % codigo)
    return codigo


def texto(codigo=''):
    codigo = validar(codigo)
    if not codigo:
        return ''
    licenca = LICENCAS[codigo]
    if codigo == 'cc0-1.0':
        declaracao = 'Este conteúdo foi dedicado ao domínio público por meio da CC0 1.0 Universal.'
    else:
        declaracao = 'Este conteúdo está disponível sob a licença %s (%s).' % (licenca['nome'], licenca['sigla'])
    return '%s %s %s' % (declaracao, licenca['url'], RESSALVA)


def aviso_html(codigo=''):
    codigo = validar(codigo)
    if not codigo:
        return ''
    licenca = LICENCAS[codigo]
    frase = frase_declarativa(codigo)
    link = '<a rel="license" href="%s">%s</a>' % (escape(licenca['url'], quote=True), escape(licenca['url']))
    return ('<section class="licenciamento" aria-labelledby="licenciamento-titulo">'
            '<h2 id="licenciamento-titulo">Licenciamento</h2><p>%s Consulte a licença: %s.</p><p>%s</p></section>') % (
                escape(frase), link, escape(RESSALVA))


def frase_declarativa(codigo):
    licenca = LICENCAS[validar(codigo)]
    if codigo == 'cc0-1.0':
        return 'Este conteúdo foi dedicado ao domínio público por meio da CC0 1.0 Universal.'
    return 'Este conteúdo está disponível sob a licença %s (%s).' % (licenca['nome'], licenca['sigla'])


def aviso_slide_html(codigo):
    codigo = validar(codigo)
    if not codigo:
        return ''
    licenca = LICENCAS[codigo]
    link = '<a rel="license" href="%s">%s</a>' % (escape(licenca['url'], quote=True), escape(licenca['url']))
    return ('<h1>Licenciamento</h1><p>%s Consulte a licença: %s.</p><p>%s</p>' %
            (escape(frase_declarativa(codigo)), link, escape(RESSALVA)))


def blocos_slide(codigo):
    codigo = validar(codigo)
    if not codigo:
        return []
    licenca = LICENCAS[codigo]
    declaracao = frase_declarativa(codigo) + ' Consulte a licença: [%s](%s).' % (licenca['url'], licenca['url'])
    return [('h', 1, 'Licenciamento'), ('p', declaracao), ('p', RESSALVA)]


def anexar_markdown(markdown, codigo='', apresentacao=False):
    codigo = validar(codigo)
    if not codigo:
        return markdown or ''
    licenca = LICENCAS[codigo]
    separador = '\n\n---\n\n' if apresentacao else '\n\n'
    bloco = ('<!-- conteudista:licenciamento:inicio=%s -->\n\n' % codigo +
             '## Licenciamento\n\n%s\n\nConsulte a licença: [%s](%s).\n\n%s\n\n' %
             (frase_declarativa(codigo), licenca['url'], licenca['url'], RESSALVA) +
             '<!-- conteudista:licenciamento:fim -->')
    if apresentacao:
        bloco = bloco.replace('## Licenciamento', '# Licenciamento', 1)
    return (markdown or '').rstrip() + separador + bloco + '\n'


def separar_markdown(markdown):
    rx = re.compile(r'\n\n(?:---\n\n)?<!-- conteudista:licenciamento:inicio=([a-z0-9.-]+) -->\n[\s\S]*?\n<!-- conteudista:licenciamento:fim -->\s*$')
    codigos = []
    texto_md = markdown or ''
    while True:
        match = rx.search(texto_md)
        if not match:
            break
        codigos.append(validar(match.group(1)))
        texto_md = texto_md[:match.start()].rstrip()
    if len(set(codigos)) > 1:
        raise ValueError('O Markdown contém declarações de licenciamento diferentes.')
    return texto_md, codigos[0] if codigos else ''