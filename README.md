# LaysFlix

PWA pessoal premium para acompanhar filmes, séries, temporadas e episódios usando dados do TMDB.

## Funcionalidades

- Histórico inicial do TV Time, progresso reversível e próximo episódio.
- Intro cinematográfica com filmes em alta, atualizada diariamente.
- Imagem, sinopse, duração, data e nota de cada episódio.
- Onde assistir no Brasil, com disponibilidade fornecida pelo JustWatch via TMDB.
- Calendário interno, Dashboard, diário, avaliações, listas e recomendações.
- Backup completo, migração versionada e lixeira local de 30 dias.
- PWA otimizado para iPhone, safe areas, gestos e funcionamento offline da interface.

## GitHub Pages e TMDB

O workflow `.github/workflows/deploy-pages.yml` publica automaticamente a branch `main` e atualiza diariamente o feed da intro. Crie um Actions Secret chamado `TOKEN_TMDB` com o Token de Leitura do TMDB e execute **Actions → Publicar LaysFlix no GitHub Pages → Run workflow**.

Como o LaysFlix é um aplicativo estático executado no navegador, a credencial usada nas consultas do cliente faz parte do artefato publicado. Use exclusivamente uma credencial de leitura do TMDB, sem permissões de conta, e faça a rotação caso o repositório deixe de ser de uso pessoal.

## Instalar no iPhone

1. Abra `https://rogerio-ops97.github.io/laysflix/` no Safari.
2. Toque em **Compartilhar → Adicionar à Tela de Início**.
3. Confirme o nome LaysFlix e abra pelo novo ícone.

Após uma atualização, feche completamente o PWA e abra novamente. O histórico e as preferências permanecem no aparelho; exporte backups regularmente em **Perfil e ajustes**.

## Créditos

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. Dados de disponibilidade de streaming são fornecidos pelo JustWatch via TMDB.
