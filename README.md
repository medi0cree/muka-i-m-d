# Мука & Мёд — сайт кондитерской

Одностраничный сайт на чистом HTML/CSS/JS: **GSAP + ScrollTrigger** (scroll-scrub, пины, stagger-появления, параллакс) и **Lenis** (плавный скролл).

## Запуск локально

```bash
cd muka-i-myod
npx serve .            # или: python -m http.server 8080
```
Откройте http://localhost:3000 (или :8080). Нужен интернет: GSAP, Lenis и шрифты грузятся с CDN.

## Публикация на GitHub Pages

1. Загрузите файлы в корень репозитория (так, чтобы `index.html` лежал в корне).
2. Settings → Pages → Build and deployment → Source: **Deploy from a branch**, Branch: **main**, папка **/ (root)** → Save.
3. Через 1–2 минуты сайт будет доступен по адресу `https://<ваш-логин>.github.io/<имя-репозитория>/`.

## Структура

```
index.html        разметка и секции
css/styles.css    токены, mobile-first, брейкпоинты 768 / 1200
js/scenes.js      canvas-сцены (временные заглушки вместо видео)
js/main.js        анимации, слоты медиа, форма заказа
assets/video/     сюда положить клипы Higgsfield
assets/img/       сюда положить портрет
```

## Как подключить видео Higgsfield

1. Сгенерируйте клипы по промптам ниже.
2. Для клипов со scroll-scrub (hero и 4 торта) перекодируйте с ключевым кадром на каждом кадре, иначе перемотка будет рывками:
   ```bash
   ffmpeg -i hero_raw.mp4 -c:v libx264 -g 1 -crf 22 -an -movflags +faststart -vf scale=1920:-2 assets/video/hero.mp4
   ```
3. В `js/main.js` в объекте `MM_ASSETS` замените `null` на путь к файлу. Слот сам переключится с canvas на `<video>` (ленивая загрузка, пауза вне экрана).

## Промпты для Higgsfield (модель: Seedance 2.5, 1080p, без звука)

| Слот / файл | Длит. | Формат | Промпт |
|---|---|---|---|
| `hero.mp4` | 8 с | 16:9 | Cinematic macro shot of a two-tier handmade cake slowly rotating on a gold cake stand, dusty-pink buttercream bottom tier, cream top tier with caramel drip, fresh raspberries and gold leaf on top, gold pearl borders. Warm tungsten spotlight from above, dark chocolate-brown background, powdered sugar particles floating in the light beam, shallow depth of field, locked camera slowly pushing in, 24fps, premium pastry commercial |
| `cake-honey.mp4` | 5 с | 1:1 | Stop-motion style assembly of a Russian honey cake (medovik) on a white porcelain plate: eight thin honey sponge layers drop in one by one with sour-cream frosting between them, then caramel glaze drips, then honeycomb pieces land on top. Cream background #FFF8F0, soft window light, top-down 3/4 angle, static camera |
| `cake-raspberry.mp4` | 5 с | 1:1 | Layer-by-layer assembly of a pistachio sponge cake with raspberry confit and mascarpone cream, green sponge and red jam stripes visible on the naked sides, pale pink glaze drip, fresh raspberries falling onto the top. Cream background, soft daylight, static 3/4 camera |
| `cake-cherry.mp4` | 5 с | 1:1 | Assembly of a dark chocolate cherry cake: cocoa sponge layers, cherry jam, light cream, glossy 70% chocolate ganache drip, dark cherries with stems dropping on top. Cream background, warm light, static 3/4 camera |
| `cake-pear.mp4` | 5 с | 1:1 | Assembly of a vanilla sponge cake with caramelised pear and salted caramel: pale golden sponge layers, caramel stripes, cream cheese frosting, amber caramel drip, small golden pears placed on top. Cream background, soft light, static 3/4 camera |
| `step-mix.mp4` | 4 с | 4:3 | Close-up of a pink ceramic bowl, wire whisk beating honey batter in circles, flour puffs in warm morning light, cozy pastry workshop, looping motion |
| `step-bake.mp4` | 4 с | 4:3 | Through an oven window: a sponge cake rising in a round tin, warm orange glow, heat shimmer, dark kitchen, macro, slow push-in |
| `step-assemble.mp4` | 4 с | 4:3 | Pastry chef hands stacking sponge layers inside a metal cake ring and spreading cream with an offset spatula, cream background, soft light |
| `step-decor.mp4` | 4 с | 4:3 | Piping bag with 1M star tip piping dusty-pink rosettes around the edge of a white cake, turntable rotating slowly, warm light, macro |
| `portrait.jpg` | — | 4:5 | Cinematic portrait of a woman pastry chef in her 30s in a linen apron, dusting powdered sugar over a cake in a small artisanal bakery, warm golden window light, bokeh, chocolate and cream tones, 85mm, film grain |

## Что уже сделано

- Hero: экран закреплён, скролл вращает торт и приближает камеру (scroll-scrub).
- Глава I: горизонтальная галерея на ≥768px, каждый торт собирается из ингредиентов по скроллу; на мобильных — вертикальная лента.
- Глава II: карточки с покачиванием и свечением при наведении.
- Глава III: клипы играют только во вьюпорте, линия таймлайна рисуется скроллом.
- Параллакс ягод и сахарных шариков (скорость 0.2–0.3).
- Кнопка «Заказать торт» с желейной анимацией, маска телефона, валидация, дата не раньше чем через 3 дня.
- `prefers-reduced-motion`: без Lenis, без пинов, сцены показаны в финальном состоянии.

## TODO

- Форма заказа пока не отправляет данные: подключите обработчик в `js/main.js` (место отмечено `TODO`).
