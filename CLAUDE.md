# interexy platform — assistant instructions

Единственный источник правды по проекту — **Obsidian vault** (через мост
`mcp-obsidian` → Local REST API плагин, инструменты `mcp__obsidian__*`).
Доков в репо нет и не создавать. Если ты проходишь мимо этого правила и
пишешь длинные комментарии, TODO/FIXME, `README.md` расширенный, `docs/`
или анализ-файлы — это регрессия дисциплины, откати.

## Обязательный цикл (порога малости нет)

Любая задача, даже мелкий фикс, проходит READ до первой строчки кода и
WRITE до объявления done. Пропуск — только по явной команде пользователя,
вслух.

**READ (до кода):**
1. `obsidian_get_file_contents` → `00-Index/MOC.md`.
2. `obsidian_simple_search` по 3–5 ключевым словам задачи
   (или `obsidian_complex_search` JsonLogic для точных фильтров).
3. Прочитать подходящие заметки в порядке `10-Architecture` →
   `30-Decisions` → `20-Features` → `60-Conventions`. Читай содержимое,
   не имена. При многих подходящих файлах используй
   `obsidian_batch_get_file_contents`.
4. Выйди на код через `code_refs` целевых заметок (там путь и роль файла).
5. **READ-OUT** в чат: что прочитал (2–5 заметок), какие правила/решения
   релевантны, план изменений.

**WRITE (после кода, до "done"):**
1. Строка в `90-Changelog/<YYYY-MM>/<YYYY-MM-DD>.md`
   (`obsidian_append_content` — создаст если нет).
2. Bump `updated:` (patch frontmatter) + актуализация `code_refs:` на
   затронутых заметках.
3. Если поведение фичи изменилось — обнови `20-Features/<feature>.md`.
4. Если архитектурный срез изменился — обнови `10-Architecture/<slice>.md`.
5. Новое решение с трейд-оффом — новый ADR в `30-Decisions/`.
6. **WRITE-OUT** в чат: список изменённых заметок и что записал.

## MCP недоступен

Если инструменты `mcp__obsidian__*` не отвечают — **СТОП**, не изобретай
контекст из головы. Проверь, что Claude Desktop видит MCP-сервер
`obsidian` в конфиге `~/Library/Application Support/Claude/claude_desktop_config.json`
и что Obsidian запущен с включённым плагином Local REST API.

## Тонкости моста `mcp-obsidian`

- Нет команды "перезаписать файл целиком". Полная замена =
  `obsidian_delete_file` + `obsidian_append_content` в тот же путь.
- `obsidian_patch_content` со сложным frontmatter (списки/объекты
  `code_refs`, `related`) может сохранить структуру строкой. Правило:
  для правки `code_refs` и `related` — использовать delete+append.
- Для скалярного bump `updated:` `patch_content(target_type: frontmatter,
  target: "updated", operation: replace)` работает.
- Папки создаются автоматически при первом файле в пути; пустые не хранятся.

## Экономия контекста

- Разведку по коду — Explore-субагентами, выжимки в основной контекст.
- Длинные заметки — сначала `obsidian_get_file_contents` шапки/секции,
  дочитывай только нужные секции.
- Одновременно ≤5 заметок в READ.
- Заметка в vault > 150 строк — кандидат на сплит; тыкай на это в WRITE.

## Правила по коду

- **Next.js 16.2**: это НЕ тот Next, что в тренировочных данных. Перед
  правкой роутов, серверных экшенов, кэша, `cookies()`, `fetch`-кэша,
  `proxy.ts` — читай соответствующий раздел `web/node_modules/next/dist/docs/`.
  `web/AGENTS.md` про это напоминает отдельно.
- **TypeScript strict**, `web/tsconfig.json` не смягчать.
- **Комментариев в коде — по возможности ноль**. Короткий JSDoc допустим
  там, где семантика неочевидна (пример: серверные клиенты Supabase в
  `web/lib/supabase/server.ts` — уже так и сделано). Никаких TODO/FIXME —
  открой задачу в `40-Tasks/`.
- **Zod на каждой границе**. Все схемы — `web/lib/schemas.ts`. Ввод
  пользователя, парсинг FormData, ответы внешних API — всё через
  `.safeParse` / `.parse`.
- **Мутации только через Server Actions** (`_actions.ts` рядом с роутом
  или helper). Прямые `insert`/`update` из клиентских компонентов —
  запрещены. Клиент читает через RSC или Realtime.
- **Три Supabase-клиента, не путать**:
  - `createServerSupabase()` — service_role, обходит RLS. Только сервер.
    Никогда в client-компонентах, никогда в bundle.
  - `createAuthServerSupabase()` — anon + cookie-jar, только для auth
    (getUser / signInWithOtp / verifyOtp / signOut).
  - `getBrowserSupabase()` — anon в браузере, только Auth-session и
    Realtime.
- **RLS дисциплина**. RLS включён на все таблицы `public`. Новая таблица
  = включаем RLS + добавляем осознанные policy. Если таблица нужна в
  браузерном Realtime — добавить `authenticated_read` policy
  (`FOR SELECT TO authenticated USING (true)`). Сейчас так на `projects`,
  `project_members`, `project_events`, `developer_status`.
- **Секреты не логировать и не коммитить**. Env vars идут в дашборд
  Render, никогда в `.env` в репо. `SUPABASE_SERVICE_ROLE_KEY` не должен
  попадать в клиентский bundle.
- **Новая работа — только в `web/`**. Легаси `index.html` в корне и
  `scripts/*.py` — не трогаем. Удаление легаси — отдельная задача.
- **UI — `@base-ui/react`** (не Radix). Стили Tailwind v4 + shadcn-обёртки
  в `web/components/ui/`.
- **Тема**: `next-themes`, дефолт dark.

## Get Shit Done — задачи

- Формат: `40-Tasks/PLT-XX_<slug>.md`, где `XX` — следующий свободный
  номер по файлам в `40-Tasks/` (сквозная нумерация, включая
  `40-Tasks/done/`).
- Шаблон и обязательные секции: `60-Conventions/gsd-task-template.md`.
- Процесс: `60-Conventions/gsd-workflow.md`.
- Jira **не используется**. `PLT-XX` — внутренний идентификатор.
- Задача считается закрытой, когда: (а) поведение проверено, (б) `npm
  run lint` и `npm run build` (typecheck внутри) зелёные, (в) выполнен
  WRITE-цикл в vault. Всё три — или задача не done.

## Что не делать без явной команды

- Массовые переименования / рефакторы, не запрошенные явно.
- Правки `index.html` в корне (legacy).
- Правки `scripts/*.py` (одноразовый ETL).
- Изменения RLS-политик, миграций схемы, env-vars в Render/Supabase.
- Force-push, `--no-verify`, изменение git config.
- Добавление зависимостей — только если это единственный разумный путь
  и зафиксировано в ADR.

## Быстрые ссылки на vault

- Что делает продукт → `10-Architecture/overview.md`
- Как устроен `/web` → `10-Architecture/stack-and-structure.md`
- Схема БД + RLS → `10-Architecture/supabase-schema.md`,
  `60-Conventions/supabase-and-rls.md`
- Как работает вход → `10-Architecture/auth-and-access.md`
- Realtime → `10-Architecture/realtime.md`
- Куда деплоится → `10-Architecture/deployment.md`
- Правила по данным → `60-Conventions/data-and-validation.md`
- Стиль кода → `60-Conventions/code-style.md`
- Активные задачи и known gaps → `40-Tasks/active.md`
- Что и когда менялось → `90-Changelog/`
