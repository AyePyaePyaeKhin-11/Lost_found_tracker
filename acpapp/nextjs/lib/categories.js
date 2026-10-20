// lib/categories.js - the categories offered in the "Report New Item" form.
//
// `value` is what gets saved in the database and compared by the matching
// score (same category = more points), so keep values stable. The first five
// are the names already used by existing reports.
// `label` is what the student sees, with examples so they pick the right one.

export const CATEGORIES = [
  { value: 'Electronics', label: 'Electronics – phone, laptop, tablet, earphones, charger, power bank' },
  { value: 'Documents', label: 'ID & Documents – student ID card, ID card, passport, papers' },
  { value: 'Accessories', label: 'Accessories – watch, glasses, jewellery, ring, hair clip' },
  { value: 'Bags', label: 'Bags – backpack, tote bag, laptop bag, pouch' },
  { value: 'Apparel', label: 'Clothing – jacket, hoodie, uniform, shoes, cap' },
  { value: 'Wallets & Cards', label: 'Wallet & Cards – wallet, cash, bank card, Rabbit / transit card' },
  { value: 'Keys', label: 'Keys – house keys, room keys, motorbike or car keys, key card' },
  { value: 'Books & Stationery', label: 'Books & Stationery – textbook, notebook, pencil case, calculator' },
  { value: 'Bottles & Containers', label: 'Bottles & Lunch boxes – water bottle, tumbler, lunch box' },
  { value: 'Umbrellas', label: 'Umbrella' },
  { value: 'Sports', label: 'Sports – ball, racket, gym gear, sports bag' },
  { value: 'Lab & Tools', label: 'Lab & Tools – lab coat, goggles, multimeter, Arduino, tools' },
  { value: 'Other', label: 'Other' },
];
