-- Seed: evento + equipes

insert into events (id, name, start_date, end_date, region)
values (
  '236dbf41-421c-4104-9eee-44ad1fba7d1b',
  'Avanço Sertão 2026',
  '2026-06-01',
  '2026-06-10',
  'Sertão de Pernambuco'
);

insert into teams (event_id, name, code_4dig, color)
values
  ('236dbf41-421c-4104-9eee-44ad1fba7d1b', 'Alpha',  '1234', '#7c3aed'),
  ('236dbf41-421c-4104-9eee-44ad1fba7d1b', 'Bravo',  '5678', '#0ea5e9'),
  ('236dbf41-421c-4104-9eee-44ad1fba7d1b', 'Charlie','9012', '#10b981');
