export const CATEGORY_LABELS = {
  shawarma: 'Шаурма',
  shawarma_addons: 'Добавки к шаурме',
  burgers: 'Бургеры',
  hotdogs: 'Хот-доги',
  shashlik: 'Шашлык',
  quesadilla: 'Кесадилья',
  fryer: 'Блюда во фритюре',
  fries: 'Блюда во фритюре',
  sauces: 'Соусы',
  drinks: 'Напитки',
}

export const BRANCHES = [
  { id: 'nv-fr-002', name: 'На Виражах — Аэропорт' },
  { id: 'nv-sh-001', name: 'На Виражах — Конечная' },
]

export const BRANCH_CONTACTS = {
  'nv-fr-002': {
    phone: '+79024524222',
    notePlace: 'Аэропорт, 7',
  },
  'nv-sh-001': {
    phone: '+79085932688',
    notePlace: 'Конечная',
  },
}

export const FALLBACK_MENU = [
  { id:'nv-sh-1', name:'Шаурма "На Виражах" — курица', category:'shawarma', variant:'chicken', description:'Курица, помидоры, огурцы, пекинская капуста, фирменный соус', price:260, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-sh-2', name:'Шаурма "На Виражах" — свинина', category:'shawarma', variant:'pork', description:'Свинина, помидоры, огурцы, пекинская капуста, фирменный соус', price:270, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-sh-3', name:'Шаурма "Цезарио"', category:'shawarma', variant:'chicken', description:'Курица, помидоры, пекинская капуста, твердый сыр, фирменный соус, сухарики', price:290, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-sh-4', name:'Шаурма "Ред.Джет" — курица', category:'shawarma', variant:'chicken', description:'Курица, фирменный соус, острый соус, халапеньо, овощи', price:290, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-sh-5', name:'Шаурма "Ред.Джет" — свинина', category:'shawarma', variant:'pork', description:'Свинина, фирменный соус, острый соус, халапеньо, овощи', price:320, branch_ids:['nv-fr-002','nv-sh-001'] },

  { id:'nv-add-1', name:'Курица 70 г', category:'shawarma_addons', description:'Добавка к шаурме: курица 70 г', price:60, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-add-2', name:'Свинина 70 г', category:'shawarma_addons', description:'Добавка к шаурме: свинина 70 г', price:60, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-add-3', name:'Картофель фри', category:'shawarma_addons', description:'Добавка к шаурме: картофель фри', price:40, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-add-4', name:'Перец халапеньо', category:'shawarma_addons', description:'Добавка к шаурме: перец халапеньо', price:40, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-add-5', name:'Огурцы маринованные', category:'shawarma_addons', description:'Добавка к шаурме: огурцы маринованные', price:40, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-add-6', name:'Сладкая горчица', category:'shawarma_addons', description:'Добавка к шаурме: сладкая горчица', price:40, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-add-7', name:'Сыр', category:'shawarma_addons', description:'Добавка к шаурме: сыр', price:50, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-add-8', name:'Чесночный соус', category:'shawarma_addons', description:'Добавка к шаурме: чесночный соус', price:40, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-add-9', name:'Лук фри', category:'shawarma_addons', description:'Добавка к шаурме: лук фри', price:40, branch_ids:['nv-fr-002','nv-sh-001'] },

  { id:'nv-b-1', name:'Чикен Карго', category:'burgers', description:'Бургер с куриной котлетой в хрустящей панировке, бекон, маринованные огурчики, салат айсберг в композиции с уникальной сырной котлетой', price:300, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-b-2', name:'Чизбургер', category:'burgers', description:'Булочка с кунжутом, говяжья котлета 100 г, сыр чеддер, маринованные огурцы, репчатый лук, кетчуп, сладкая горчица', price:299, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-b-3', name:'Двойной чизбургер', category:'burgers', description:'Булочка с кунжутом, две говяжьи котлеты по 100 г, два ломтика сыра чеддер, маринованные огурцы, репчатый лук, кетчуп, сладкая горчица', price:429, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-b-4', name:'Форсаж', category:'burgers', description:'Булочка с кунжутом, бургер-соус, салат айсберг, говяжья котлета 100 г, сыр чеддер, томат, маринованные огурцы, красный лук', price:319, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-b-5', name:'Крутой Форсаж', category:'burgers', description:'Булочка с кунжутом, кетчуп, сладкая горчица, говяжья котлета 150 г, сыр чеддер, соус релиш, репчатый лук', price:399, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-b-6', name:'Сырный', category:'burgers', description:'Булочка с кунжутом, говяжья котлета 100 г, сыр чеддер, сырный соус, бекон, лук фри', price:349, branch_ids:['nv-fr-002','nv-sh-001'] },

  { id:'nv-h-1', name:'Датский классический', category:'hotdogs', description:'Булочка, сосиска говяжий гриль, маринованные огурчики, лист салата, кетчуп, сладкий горчичный соус, хрустящий лук фри', price:230, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-h-2', name:'Австрийский', category:'hotdogs', description:'Булочка, сосиска свиная гриль, соус релиш, лист салата, кетчуп, хрустящий лук фри', price:230, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-h-3', name:'Чили', category:'hotdogs', description:'Булочка, соус релиш, лист салата, сосиска гриль с чили, лук фри, кетчуп', price:260, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-h-4', name:'Три перца и сыр', category:'hotdogs', description:'Булочка, соус релиш, лист салата, сосиска «три перца и сыр», лук фри, кетчуп', price:270, branch_ids:['nv-fr-002','nv-sh-001'] },

  { id:'nv-s-1', name:'Шашлык из свиной шеи', category:'shashlik', description:'Шашлык из шейной части свинины 250 г, лаваш, луковый салат', price:400, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-q-1', name:'Кесадилья сырная / острая', category:'quesadilla', description:'Пшеничная лепешка, куриные стрипсы в панировке, томаты, сыр моцарелла, сырный соус, красный лук, острая сальса и кукуруза в острой версии', price:260, branch_ids:['nv-fr-002','nv-sh-001'] },

  { id:'nv-f-1', name:'Куриные крылышки', category:'fryer', description:'Пикантные куриные крылышки в хрустящей панировке 260 г', price:399, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-f-2', name:'Креветки', category:'fryer', description:'Королевские креветки в хрустящей панировке 6 шт', price:300, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-f-3', name:'Стрипсы куриные — 3 шт', category:'fryer', description:'Хрустящие стрипсы из куриного филе 3 шт', price:190, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-f-4', name:'Стрипсы куриные — 6 шт', category:'fryer', description:'Вдвое больше стрипсов по выгодной цене — 6 шт', price:370, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-f-5', name:'Картофель фри 100 г', category:'fryer', description:'Хрустящий картофель фри 100 г', price:150, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-f-6', name:'Картофель по-деревенски 100 г', category:'fryer', description:'Картофель по-деревенски 100 г', price:150, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-f-7', name:'Сырные палочки', category:'fryer', description:'Хрустящие палочки с моцареллой внутри 6 шт', price:250, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-f-8', name:'Наггетсы', category:'fryer', description:'Кусочки куриного филе в хрустящей панировке 6 шт', price:170, branch_ids:['nv-fr-002','nv-sh-001'] },

  { id:'nv-sa-1', name:'Чесночный соус 100 мл', category:'sauces', description:'Порция чесночного соуса 100 мл', price:60, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-sa-2', name:'Кетчуп 30 мл', category:'sauces', description:'Классический кетчуп 30 мл', price:45, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-sa-3', name:'Сырный соус 30 мл', category:'sauces', description:'Сырный соус 30 мл', price:45, branch_ids:['nv-fr-002','nv-sh-001'] },
  { id:'nv-sa-4', name:'Сладкая горчица 30 мл', category:'sauces', description:'Сладкая горчица 30 мл', price:45, branch_ids:['nv-fr-002','nv-sh-001'] },

  { id:'nv-d-1', name:'Чай черный / зеленый 0.35', category:'drinks', description:'Чай черный или зеленый', price:50, branch_ids:['nv-fr-002'] },
  { id:'nv-d-2', name:'Чай черный со смородиной, чабрецом и мятой 0.35', category:'drinks', description:'Ароматный чай со смородиной, чабрецом и мятой', price:80, branch_ids:['nv-fr-002'] },
  { id:'nv-d-3', name:'Кофе растворимый 0.35', category:'drinks', description:'Растворимый кофе', price:70, branch_ids:['nv-fr-002'] },
]
