# Выкладка SEOneiro на сервер 91.218.244.185 (рядом со stillup.ru)

Сервис SEOneiro (seoneiro.ru) — один контейнер `prizma` в общей сети `sleep_dairy_default`, наружу портов не открывает,
слушает `3000`. Caddy из `/opt/sleep_dairy` проксирует на него домен из `/opt/caddy-sites/prizma.caddy`
и сам выпускает сертификат. Базы нет: отчёты лежат JSON-файлами в томе `prizma_prizma-data`.

**Не трогать:** порты 80/443 и файлы в `/opt/sleep_dairy` (они обновляются через git).
Сервис живёт отдельно, в `/opt/prizma`.

| Параметр | Значение |
|---|---|
| Имя сервиса для Caddy | `prizma:3000` |
| Проверка здоровья | `GET /api/health` → `{"ok":true}` |
| Память | ~50 МБ в простое, лимит 768 МБ |
| Исходящие запросы | проверяемые сайты, `www.googleapis.com` (PageSpeed). Telegram и Anthropic не нужны |

## 1. Запустить сервис

```bash
sudo mkdir -p /opt/prizma && sudo chown "$USER" /opt/prizma && cd /opt/prizma
git clone git@github.com:tonypulseone-dot/prizma.git src
cd src
cp .env.example .env
nano .env        # NEXT_PUBLIC_SITE_URL=https://ДОМЕН  (PSI_API_KEY — по желанию)
docker compose up -d --build
docker compose ps   # prizma ... (healthy), в колонке портов только 3000/tcp — наружу не опубликован
```

Репозиторий закрытый: для `git clone` нужен deploy key. На сервере `ssh-keygen -t ed25519 -f ~/.ssh/prizma_deploy -N ''`,
публичную часть (`~/.ssh/prizma_deploy.pub`) добавить в GitHub → tonypulseone-dot/prizma → Settings → Deploy keys (только чтение),
и в `~/.ssh/config`:

```
Host github.com
  IdentityFile ~/.ssh/prizma_deploy
  IdentitiesOnly yes
```

`AUDIT_ALLOW_PRIVATE_HOSTS` в `.env` не включать: сервис ходит по адресам, которые вводят посетители,
и эта настройка не пускает его в базу, соседние контейнеры и localhost.

## 2. Проверить, что Caddy видит сервис (до настройки домена)

```bash
docker compose -f /opt/sleep_dairy/docker-compose.yml exec caddy wget -qO- http://prizma:3000/api/health
# {"ok":true}
```

И доступ к PageSpeed с сервера:

```bash
curl -sI https://www.googleapis.com | head -1
```

Если googleapis не открывается, в `.env` поставить `PSI_DISABLED=1`: отчёт работает, блок скорости пишет «нет данных».

## 3. Домен

1. A-запись домена → `91.218.244.185`.
2. Файл `/opt/caddy-sites/prizma.caddy`:

   ```caddy
   ДОМЕН {
   	encode zstd gzip
   	reverse_proxy prizma:3000
   }
   ```

3. Перечитать конфигурацию **только скриптом** (он проверяет конфиг и при ошибке ничего не применяет,
   иначе ошибка в файле уронит и stillup.ru):

   ```bash
   /opt/sleep_dairy/scripts/caddy-reload.sh
   ```

Сертификат Let's Encrypt выпустится сам, когда DNS начнёт указывать на сервер.

## 4. Обновление

```bash
cd /opt/prizma/src && git pull && docker compose up -d --build
```

Отчёты в томе сохраняются. Если поменялся домен — поправить `NEXT_PUBLIC_SITE_URL` в `.env`
(он вшивается в страницы при сборке, поэтому нужен `--build`) и файл в `/opt/caddy-sites`.

## Проверено перед выкладкой

Схема повторена локально: внешняя сеть `sleep_dairy_default`, Caddy с `reverse_proxy prizma:3000`,
соседний контейнер. Сайт открывается через Caddy со сжатием, порт 3000 наружу не опубликован,
попытка проверить соседний контейнер отклоняется, healthcheck зелёный.
