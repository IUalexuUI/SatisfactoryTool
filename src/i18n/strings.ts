// All UI text in one place, indexed by language. The `Strings` shape is
// inferred from the Russian dictionary; the English one is checked against
// it via `Record<Lang, Strings>`.
//
// Templates use {placeholders} that are filled by the `format` helper at the
// call site.

const RU = {
    statsTemplate: "{items} предметов · {recipes} рецептов ({alts} альт.)",
    sidebar: {
      systems: "Системы",
      items: "Предметы",
      addSystemTitle: "Создать новую систему",
      addSystemAria: "Создать систему",
      noSystems: "Нажми «+» — создай первую цепочку.",
      notConfigured: "не настроена",
      sourcesShort: "источ.",
      nothingFound: "Ничего не найдено",
      searchPlaceholder: "Поиск (рус / англ / className)…",
    },
    placeholder: {
      pickFromSidebar: "Выбери систему или предмет в сайдбаре,",
      orCreate: "либо нажми «+», чтобы создать новую цепочку.",
    },
    system: {
      nameAria: "Название системы",
      delete: "Удалить",
      confirmDelete: 'Удалить систему «{name}»?',
      targets: "Конечные предметы",
      targetsHelper:
        "Что хочешь получать на выходе. Чекбокс «Заполнить» утилизирует остаток сырья — solver максимизирует скорость этой цели.",
      sources: "Источники (необязательно)",
      sourcesHelper:
        "Уже имеющийся на входе поток — сырьё или готовые полуфабрикаты (например, пластик, кейтеривая катушка). Solver не строит цепочку для этих предметов, а распределяет их между целями. Здания работают на 100%.",
      sourcesEmpty: "Источники не ограничены — добавь «+», если хочешь задать лимит",
      needTarget: "Добавь конечный предмет, чтобы рассчитать цепочку.",
      fillLabel: "Заполнить",
      fillTooltip: "Использовать остаток сырья для максимизации этой цели",
      add: "Добавить",
      remove: "Удалить",
      rateAria: "Скорость, {unit}",
      unitItems: "шт/мин",
      unitRaw: "ед/мин",
    },
    picker: {
      placeholder: "Выбери предмет…",
      empty: "Ничего не найдено",
    },
    item: {
      produces: "Производится",
      producedEmpty: "Сырьё либо предмет добывается экстрактором.",
      usedIn: "Используется",
      usedEmpty: "Не входит ни в один производственный рецепт.",
      radioactive: "радиоактивно",
    },
    solution: {
      achievable: "Достижимо",
      targets: "Цели",
      scaleSubText: "{percent}% от запрошенного",
      buildings: "Зданий",
      power: "Энергия",
      steps: "Шагов",
      sources: "Источники",
      production: "Производство",
      raw: "Сырьё",
      rawEmpty: "Цепочка не требует внешнего сырья.",
      byproducts: "Излишки (побочные продукты)",
      byproductsEmpty: "Нет неиспользованных побочных продуктов.",
      idealHint: "Идеально {ideal} зданий @ 100% — округлено вверх",
      clockLabel: "такт",
    },
    units: {
      perMin: "/мин",
      sec: "с",
      powerMW: "МВт",
      energyMJ: "МДж",
    },
    warnings: {
      "fixed-scaled":
        'Фиксированные цели масштабированы до {percent}% запрошенного из-за лимита по «{item}».',
      "chain-scaled":
        'Цепочка масштабирована до {percent}% запрошенного из-за лимита по «{item}».',
      "fill-requires-source":
        "Чекбокс «Заполнить» работает только при заданном сырье — цели использованы по введённой скорости.",
      "fill-no-source":
        "«{item}» не использует заданное сырьё — оставлено {rate}/мин.",
      "not-enough-source": "Не хватило сырья на «{item}».",
      "not-enough-source-exhausted":
        "Не хватило сырья на «{item}» (исчерпано «{exhausted}»).",
      "iteration-limit":
        "Превышен лимит итераций ({n}) — возможен цикл в рецептах.",
    },
};

export type Strings = typeof RU;
export type Lang = "ru" | "en";

const EN: Strings = {
    statsTemplate: "{items} items · {recipes} recipes ({alts} alt.)",
    sidebar: {
      systems: "Systems",
      items: "Items",
      addSystemTitle: "Create a new system",
      addSystemAria: "Create system",
      noSystems: 'Press "+" — create your first chain.',
      notConfigured: "not configured",
      sourcesShort: "src",
      nothingFound: "Nothing found",
      searchPlaceholder: "Search (RU / EN / className)…",
    },
    placeholder: {
      pickFromSidebar: "Select a system or item from the sidebar,",
      orCreate: 'or press "+" to create a new chain.',
    },
    system: {
      nameAria: "System name",
      delete: "Delete",
      confirmDelete: 'Delete system "{name}"?',
      targets: "Output items",
      targetsHelper:
        'What you want to produce. The "Fill" checkbox uses up remaining source — the solver maximises this target.',
      sources: "Sources (optional)",
      sourcesHelper:
        "Inputs you already have — raw resources or intermediates (e.g. plastic, caterium coil). The solver does not build a chain for these; it distributes them across targets. Buildings run at 100%.",
      sourcesEmpty: 'No source limit — press "+" to set one',
      needTarget: "Add an output item to calculate the chain.",
      fillLabel: "Fill",
      fillTooltip: "Use remaining source to maximise this target",
      add: "Add",
      remove: "Remove",
      rateAria: "Rate, {unit}",
      unitItems: "pcs/min",
      unitRaw: "units/min",
    },
    picker: {
      placeholder: "Pick an item…",
      empty: "Nothing found",
    },
    item: {
      produces: "Produced by",
      producedEmpty: "Raw resource — extracted with a miner/pump.",
      usedIn: "Used in",
      usedEmpty: "Not used in any production recipe.",
      radioactive: "radioactive",
    },
    solution: {
      achievable: "Achievable",
      targets: "Targets",
      scaleSubText: "{percent}% of requested",
      buildings: "Buildings",
      power: "Power",
      steps: "Steps",
      sources: "Sources",
      production: "Production",
      raw: "Raw inputs",
      rawEmpty: "Chain needs no external raw inputs.",
      byproducts: "Byproducts",
      byproductsEmpty: "No unused byproducts.",
      idealHint: "Ideal {ideal} buildings @ 100% — rounded up",
      clockLabel: "clock",
    },
    units: {
      perMin: "/min",
      sec: "s",
      powerMW: "MW",
      energyMJ: "MJ",
    },
    warnings: {
      "fixed-scaled":
        'Fixed targets scaled to {percent}% of requested due to "{item}" limit.',
      "chain-scaled":
        'Chain scaled to {percent}% of requested due to "{item}" limit.',
      "fill-requires-source":
        '"Fill" checkbox only works when sources are declared — targets used at entered rates.',
      "fill-no-source":
        '"{item}" does not use declared sources — left at {rate}/min.',
      "not-enough-source": 'Not enough source for "{item}".',
      "not-enough-source-exhausted":
        'Not enough source for "{item}" ("{exhausted}" exhausted).',
      "iteration-limit":
        "Exceeded iteration limit ({n}) — possible recipe cycle.",
    },
};

export const STRINGS: Record<Lang, Strings> = { ru: RU, en: EN };

// Replaces `{placeholders}` in a template with values from `params`.
// Missing keys render as empty strings.
export function format(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    return v === undefined || v === null ? "" : String(v);
  });
}
