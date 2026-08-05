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

## Login e sincronização

O LaysFlix usa Supabase Auth e a tabela `public.laysflix_user_states` para manter uma cópia privada da biblioteca de cada usuário. O aplicativo continua offline-first: alterações são salvas imediatamente no aparelho e enviadas à nuvem quando houver sessão e internet.

Ao criar uma conta, o usuário escolhe como o perfil deve nascer:

- **Novo perfil:** biblioteca completamente vazia.
- **Perfil da Lays:** recebe uma cópia do histórico consolidado do TV Time somente na primeira inicialização.

Depois disso, cada perfil evolui de forma independente. A escolha fica registrada no banco e nunca é inferida a partir dos dados locais de outro usuário.

- URL e chave publicável: `cloud-config.js`.
- Cliente fixado: `@supabase/supabase-js@2.111.0`.
- Schema e políticas RLS: `supabase/schema.sql`.
- URL de retorno que deve ser autorizada no Supabase: `https://rogerio-ops97.github.io/laysflix/`.

A chave publicável pode aparecer no frontend. Nunca use uma chave `service_role` ou secret key no GitHub Pages.

## Layout responsivo

Até 899 px, o app usa a interface móvel com navegação inferior, safe areas e gestos. A partir de 900 px, ativa automaticamente a experiência para computador com sidebar, área de conteúdo ampliada, mais colunas e páginas de detalhes maiores.

## Créditos

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. Dados de disponibilidade de streaming são fornecidos pelo JustWatch via TMDB.
