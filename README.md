# SatisfactoryTool

Интерактивный инструмент для проектирования оптимизированных производственных цепочек в игре Satisfactory.

## Стек

- Vite + React + TypeScript
- React Flow — визуализация графа цепочек
- Линейное программирование для оптимизации (планируется)

## Данные игры

Сырые данные лежат в `data-raw/` (не в git, ~10 MB на язык — слишком крупно). Скопируй из установленной игры:

```
C:\Program Files\Epic Games\Satisfactory\CommunityResources\Docs\en-US.json -> data-raw/en-US.json
C:\Program Files\Epic Games\Satisfactory\CommunityResources\Docs\ru.json    -> data-raw/ru.json
```

Затем:

```
npm run data:build    # парсинг сырых данных в src/data/*.json
npm run data:verify   # проверка целостности
npm run data:inspect  # верхнеуровневая структура исходного Docs.json
```

Распарсенные `src/data/*.json` коммитятся — их хватает для работы приложения без Satisfactory.

## Статус

В разработке.
